import { IConsoleService, ConsoleCommand } from '../iconsoleservice';
import { Observable, fromEvent } from 'rxjs'
import { createSocket, RemoteInfo, Socket } from 'dgram';
import { map } from 'rxjs/operators';
import { Debugger } from 'debug';

export class UdpConsoleService implements IConsoleService {
    Commands: Observable<ConsoleCommand>
    udpSocket: Socket;
    
    sendStatus(): void {
        throw new Error("Method not implemented.");
    }

    async bind(): Promise<IConsoleService> {
        await new Promise<void>((resolve, reject) => {
            this.udpSocket.once('error', (err) => reject(err))
            this.udpSocket.bind(this.udpPort, () => resolve())
        })
        this.udpSocket.setBroadcast(true)
        this.logger('UDP Socket bound to', this.udpSocket.address())
        return this
    }

    constructor(
        private udpPort: number,
        private logger: Debugger) {
        this.udpSocket = createSocket('udp4')
        // TODO Add decoder for input messages
        this.Commands = fromEvent(
            this.udpSocket,
            'message',
            (message: Buffer, rinfo: RemoteInfo) => ({ message, rinfo }))
            .pipe(map((event) => <ConsoleCommand>'stop'))
    }

}