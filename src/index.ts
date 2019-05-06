import * as config from 'config'
import debug from 'debug'
import { IConsoleService } from './services/iconsoleservice';
import { UdpConsoleService } from './services/impl/udpconsoleservice';
import { IPcStatusService } from './services/ipcstatusservice';
import { RestPcStatusService } from './services/impl/restpcstatusservice';
import { IRestClient } from './rest/irestclient';
import { HttpRestClient } from './rest/impl/httprestclient';

const logger = debug('rackservice')
const statusEndpoint = config.get<string>('pcApi') + 'api/status'
const udpPort = config.get<number>('udpPort')

const runningStatus = {
    statusNumber: 0
}

async function main() {
    
    const consoleService: IConsoleService = await new UdpConsoleService(udpPort, logger).bind()
    const restClient: IRestClient = new HttpRestClient()
    const pcStatusService: IPcStatusService = new RestPcStatusService(restClient, statusEndpoint, 5000, 2500)

    consoleService.Commands.subscribe(
        (command) => logger(command)
    )
    pcStatusService.Statuses.subscribe(
        (status) => logger(status),
        (error) => console.log(error),
        () => {}
    )
}

(async function() {
    await main()
})();