import * as config from 'config'
import debug from 'debug'
import { Subject, interval, Subscription } from 'rxjs'
import { take } from 'rxjs/operators'
import { Status } from './model/status'
import { IRestClient } from './rest/irestclient'
import { HttpRestClient } from './rest/impl/httprestclient'
import { IConsoleService } from './services/iconsoleservice'
import { IHauptwerkService } from './services/ihauptwerkservice'
import { IPcStatusService } from './services/ipcstatusservice'
import { IRackService } from './services/irackservice'
import { IWolService } from './services/iwolservice'
import { RestHaupwterkService } from './services/impl/resthauptwerkservice'
import { RestPcStatusService } from './services/impl/restpcstatusservice'
import { RpiRackService } from './services/impl/rpirackservice'
import { UdpConsoleService } from './services/impl/udpconsoleservice'
import { UdpWolService } from './services/impl/udpwolservice'

const logger = debug('rackservice')
const pcMacAddress = Uint8Array.from(config.get<string>('pcMacAddress').split(':').map((s) => parseInt(s, 16)))
const statusEndpoint = config.get<string>('pcApi') + 'api/status'
const hauptwerkEndpoint = config.get<string>('pcApi') + 'api/hauptwerk'
const ipBroadcast = config.get<string>('ipBroadcast')
const udpPort = config.get<number>('udpPort')
const consoleTimeoutMillis = config.get<number>('consoleTimeout')
const haltTimeoutMillis = config.get<number>('haltTimeout')

async function main() {

    const consoleService: IConsoleService = await new UdpConsoleService(udpPort, ipBroadcast, logger).bind()
    const rackService: IRackService =  new RpiRackService(logger)
    const restClient: IRestClient = new HttpRestClient()
    const hauptwerkService: IHauptwerkService = new RestHaupwterkService(restClient, hauptwerkEndpoint)
    const pcStatusService: IPcStatusService = new RestPcStatusService(restClient, statusEndpoint, 5000, 2500)
    const wolService: IWolService = new UdpWolService(ipBroadcast)

    let rackStatus: Status = Status.SystemOff

    type StateFunction = () => Promise<void>
    const statesObservable: Subject<StateFunction> = new Subject<StateFunction>()

    interval(2000).subscribe(async (_) => {
        await consoleService.sendStatus(rackStatus)
        await rackService.applyStatus(rackStatus)
    })

    statesObservable.subscribe(async (f) => await f())
    statesObservable.next(systemOff)

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

    function nextStatus(f: StateFunction): void {
        unsubscribeAll()
        statesObservable.next(f)
    }

    async function systemOff(): Promise<void> {
        if (rackStatus === Status.WaitPcToHalt) {
            await rackService.setMainPower(false)
        }
        rackStatus = Status.SystemOff
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === 'start') {
                nextStatus(poweringOnPC)
            }
        })
        consoleCommands = consoleService.Commands.subscribe((command) => {
            if (command === 'start') {
                nextStatus(poweringOnPC)
            }
        })
    }

    async function poweringOnPC(): Promise<void> {
        if (rackStatus === Status.SystemOff) {
            await rackService.setMainPower(true)
        }
        rackStatus = Status.PoweringOnComputer
        wakeUpInterval = interval(5000).subscribe(async (n) => {
            try {
                await wolService.wakeUpOnLan(pcMacAddress)
            } catch (e) {
                logger('Error sending WOL', e)
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.apiReachable === true) {
                nextStatus(startingHaupwerk)
            }
        })
    }

    function startingHaupwerk(): Promise<void> {
        rackStatus = Status.StartingHauptwerk
        hauptwerkSendCommand = interval(1000).subscribe(async (_) => {
            try {
                await hauptwerkService.startHaupwerk()
            } catch (e) {
                logger('Error sending start to Hauptwerk', e)
            }
        })
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === 'stop') {
                nextStatus(requestPcShutdown)
            }
        })
        consoleCommands = consoleService.Commands.subscribe((command) => {
            if (command === 'stop') {
                nextStatus(requestPcShutdown)
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.audioActive === true) {
                nextStatus(systemOn)
            }
        })
        return Promise.resolve()
    }

    async function systemOn(): Promise<void> {
        if (rackStatus === Status.StartingHauptwerk) {
            await rackService.setAmpPower(true)
        }
        rackStatus = Status.SystemOn
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === 'stop') {
                nextStatus(requestPcShutdown)
            }
        })
        consoleCommands = consoleService.Commands.subscribe(async (command) => {
            if (command === 'reset') {
                try {
                    await hauptwerkService.resetMidiAndAudio()
                } catch (e) {
                    logger('Error sending reset to Hauptwerk', e)
                }
            } else if (command === 'stop') {
                nextStatus(waitConsoleTimeout)
            }
        })
    }

    function waitConsoleTimeout(): Promise<void> {
        rackStatus = Status.WaitConsoleTimeout
        rackCommands = rackService.Commands.subscribe((command) => {
            if (command === 'start') {
                nextStatus(systemOn)
            } else if (command === 'stop') {
                nextStatus(requestPcShutdown)
            }
        })
        consoleCommands = consoleService.Commands.subscribe(async (command) => {
            if (command === 'reset') {
                await hauptwerkService.resetMidiAndAudio()
            } else if (command === 'start') {
                nextStatus(systemOn)
            }
        })
        waitTimeout = interval(consoleTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(requestPcShutdown))
        return Promise.resolve()
    }

    async function requestPcShutdown(): Promise<void> {
        if (rackStatus === Status.SystemOn || rackStatus === Status.WaitConsoleTimeout) {
            await rackService.setAmpPower(false)
        }
        rackStatus = Status.RequestComputerShutdown
        hauptwerkSendCommand = interval(1000).subscribe(async (_) => {
            try {
                await hauptwerkService.shutdownPc()
            } catch (e) {
                logger('Error sending shutdown to Hauptwerk', e)
            }
        })
        pcStatuses = pcStatusService.Statuses.subscribe((status) => {
            if (status.apiReachable === false) {
                nextStatus(waitForPcToHalt)
            }
        })
    }

    function waitForPcToHalt(): Promise<void> {
        waitTimeout = interval(haltTimeoutMillis)
            .pipe(take(1))
            .subscribe((_) => nextStatus(systemOff))
        return Promise.resolve()
    }
}

(async function() {
    await main()
})();