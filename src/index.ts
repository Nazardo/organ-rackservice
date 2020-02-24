import * as config from 'config'
import debug from 'debug'
import { Subject, interval, Subscription } from 'rxjs'
import { take, timeout } from 'rxjs/operators'
import { Status } from './model/status'
import { IRestClient } from './rest/irestclient'
import { HttpRestClient } from './rest/impl/httprestclient'
import { IConsoleService, ConsoleCommand } from './services/iconsoleservice'
import { IHauptwerkService } from './services/ihauptwerkservice'
import { IPcStatusService } from './services/ipcstatusservice'
import { IRackService, RackCommand } from './services/irackservice'
import { IWolService } from './services/iwolservice'
import { RestHaupwterkService } from './services/impl/resthauptwerkservice'
import { RestPcStatusService } from './services/impl/restpcstatusservice'
import { RpiRackService } from './services/impl/rpirackservice'
import { UdpConsoleService } from './services/impl/udpconsoleservice'
import { UdpWolService } from './services/impl/udpwolservice'
import { ConsoleCommandsForwarder } from './services/consolecommandsforwarder'
import { LedConverter } from './model/ledconverter'

const logger = debug('rackservice')
const pcMacAddress = Uint8Array.from(config.get<string>('pcMacAddress').split(':').map((s) => parseInt(s, 16)))
const statusEndpoint = config.get<string>('pcApi') + 'api/status'
const hauptwerkEndpoint = config.get<string>('pcApi') + 'api/hauptwerk'
const ipBroadcast = config.get<string>('ipBroadcast')
const udpPort = config.get<number>('udpPort')
const poweringOnComputerTimeoutMillis = config.get<number>('poweringOnComputerTimeout')
const powerCycleTimeoutMillis = config.get<number>('powerCycleTimeout')
const consoleKeepAliveTimeoutMillis = config.get<number>('consoleKeepAliveTimeout')
const consolePowerOffTimeoutMillis = config.get<number>('consoleTimeout')
const haltTimeoutMillis = config.get<number>('haltTimeout')

async function main() {

    const consoleService: IConsoleService = await new UdpConsoleService(udpPort, logger).bind()
    const rackService: IRackService =  new RpiRackService(logger)
    const restClient: IRestClient = new HttpRestClient()
    const hauptwerkService: IHauptwerkService = new RestHaupwterkService(restClient, hauptwerkEndpoint)
    const pcStatusService: IPcStatusService = new RestPcStatusService(restClient, statusEndpoint, 5000, 2500)
    const wolService: IWolService = await new UdpWolService(ipBroadcast).bind()
    const consoleCommandsForwarder: ConsoleCommandsForwarder = new ConsoleCommandsForwarder(hauptwerkService)

    let systemStatus: Status = Status.SystemOff

    type StateFunction = () => Promise<void>
    const statesObservable: Subject<StateFunction> = new Subject<StateFunction>()

    // Subscriptions used in state functions and unsubscribed by unsubscribeAll()
    let consoleCommands: Subscription = new Subscription()
    let rackCommands: Subscription = new Subscription()
    let hauptwerkSendCommand: Subscription = new Subscription()
    let pcStatuses: Subscription = new Subscription()
    let wakeUpInterval: Subscription = new Subscription()
    let waitTimeout: Subscription = new Subscription()

    function unsubscribeAll(): void {
        consoleCommands.unsubscribe()
        rackCommands.unsubscribe()
        hauptwerkSendCommand.unsubscribe()
        pcStatuses.unsubscribe()
        wakeUpInterval.unsubscribe()
        waitTimeout.unsubscribe()
    }

    statesObservable.subscribe(async (f) => await f())
    statesObservable.next(systemOff)

    function nextStatus(f: StateFunction): void {
        unsubscribeAll()
        statesObservable.next(f)
    }

    async function setStatus(status: Status): Promise<void> {
        systemStatus = status
        await consoleService.setLedStatus(LedConverter.getLedStatusForConsole(status))
        await rackService.setLedStatus(LedConverter.getLedStatusForRack(status))
    }

    async function systemOff(): Promise<void> {
        await rackService.setMainPower(false)
        await setStatus(Status.SystemOff)

        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === RackCommand.ManualPowerOn) {
                nextStatus(systemOnPermanent)
            }
        })
        consoleCommands = consoleService.Commands.subscribe((command) => {
            if (command === ConsoleCommand.ConsolePowerOn) {
                nextStatus(poweringOnComputer)
            }
        })
    }

    async function systemOnPermanent(): Promise<void> {
        await rackService.setMainPower(true)
        await rackService.setAmpPower(true)
        await setStatus(Status.SystemOnPermanent)
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === RackCommand.ReleaseLocalControl) {
                nextStatus(systemOn)
            }
        })
    }

    async function poweringOnComputer(): Promise<void> {
        await rackService.setMainPower(true)
        await setStatus(Status.PoweringOnComputer)
        wakeUpInterval = interval(3000).subscribe(async (n) => {
            try {
                await wolService.wakeUpOnLan(pcMacAddress)
            } catch (e) {
                logger('Error sending WOL', e)
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.apiReachable === true) {
                nextStatus(waitForHauptwerkToLoad)
            }
        })
        waitTimeout = interval(poweringOnComputerTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(powerCycleTimeout))
    }

    async function powerCycleTimeout(): Promise<void> {
        await rackService.setAmpPower(false)
        await rackService.setMainPower(false)
        await setStatus(Status.PowerCycleTimeout)
        waitTimeout = interval(powerCycleTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(poweringOnComputer))
    }

    async function waitForHauptwerkToLoad(): Promise<void> {
        await setStatus(Status.WaitForHauptwerkToLoad)
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === RackCommand.ManualPowerOn) {
                nextStatus(systemOnPermanent)
            }
        })
        consoleCommands = consoleService.Commands.subscribe(async (command) => {
            if (command === ConsoleCommand.PowerCycle) {
                nextStatus(powerCycleTimeout)
            } else {
                try {
                    await consoleCommandsForwarder.forward(command)
                } catch (e) {
                    logger('Error sending shutdown', e)
                }
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.apiReachable === false) {
                nextStatus(poweringOnComputer)
            } else if (status.audioActive === true) {
                nextStatus(systemOn)
            }
        })
    }

    async function systemOn(): Promise<void> {
        await rackService.setAmpPower(true)
        await setStatus(Status.SystemOn)
        rackCommands = rackService.Commands.subscribe(async (command) => {
            if (command === RackCommand.ManualPowerOn) {
                nextStatus(systemOnPermanent)
            }
        })
        // TODO handle console power off detection
        consoleCommands = consoleService.Commands.pipe(
            timeout(consoleKeepAliveTimeoutMillis)
        ).subscribe(async (command) => {
            if (command === ConsoleCommand.PowerCycle) {
                nextStatus(powerCycleTimeout)
            } else {
                try {
                    await consoleCommandsForwarder.forward(command)
                } catch (e) {
                    logger('Error sending shutdown', e)
                }
            }
        },
        error => {
            // Console has been powered off, transition to other state
            nextStatus(waitConsoleTimeout)
        })
    }

    async function waitConsoleTimeout(): Promise<void> {
        await setStatus(Status.ConsoleOffTimeout)
        rackCommands = rackService.Commands.subscribe(async (command) => {
            if (command === RackCommand.ManualPowerOn) {
                nextStatus(systemOnPermanent)
            }
        })
        consoleCommands = consoleService.Commands.subscribe(async (command) => {
            if (command === ConsoleCommand.ConsolePowerOn) {
               nextStatus(systemOn)
            }
        })
        waitTimeout = interval(consolePowerOffTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(requestComputerShutdown))
        return Promise.resolve()
    }

    async function requestComputerShutdown(): Promise<void> {
        await setStatus(Status.RequestComputerShutdown)
        hauptwerkSendCommand = interval(1000).subscribe(async (_) => {
            try {
                await hauptwerkService.shutdownComputer()
            } catch (e) {
                logger('Error sending shutdown', e)
            }
        })
        rackCommands = rackService.Commands.subscribe(async (command) => {
            if (command === RackCommand.ManualPowerOn) {
                nextStatus(systemOnPermanent)
            }
        })
        consoleCommands = consoleService.Commands.subscribe(async (command) => {
            if (command === ConsoleCommand.PowerCycle) {
               nextStatus(systemOff)
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.apiReachable === false) {
                nextStatus(powerOffComputerTimeout)
            }
        })
    }

    async function powerOffComputerTimeout(): Promise<void> {
        await rackService.setAmpPower(false)
        await setStatus(Status.PowerOffComputerTimeout)
        waitTimeout = interval(haltTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(systemOff))
    }
}

(async function() {
    await main()
})();