import { createSocket, RemoteInfo, Socket } from 'dgram'
import { Observable, fromEvent } from 'rxjs'
import { map, filter } from 'rxjs/operators'
import { Debugger } from 'debug'
import { Status } from 'src/model/status'
import { IConsoleService, ConsoleCommand } from '../iconsoleservice'
import { UdpConsoleDecoder } from './udpconsoledecoder'

export class UdpConsoleService implements IConsoleService {
    Commands: Observable<ConsoleCommand>
    udpSocket: Socket;

    async sendStatus(status: Status): Promise<void> {
        const data = this.udpConsoleDecoder.encodeStatus(status)
        await this.send(data)
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

    private async send(data: Buffer) {
        await new Promise<void>((resolve, reject) => {
            this.udpSocket.send(data, this.udpPort, this.ipBroadcast, (err, bytes) => {
                if (err) {
                    reject()
                } else {
                    resolve()
                }
            })
        })
    }

    constructor(
        private udpPort: number,
        private ipBroadcast: string,
        private logger: Debugger,
        private udpConsoleDecoder: UdpConsoleDecoder = new UdpConsoleDecoder()) {
        this.udpSocket = createSocket('udp4')
        this.Commands = fromEvent(
            this.udpSocket,
            'message',
            (message: Buffer, rinfo: RemoteInfo) => ({ message, rinfo }))
            .pipe(
                map((event) => {
                    try {
                        return this.udpConsoleDecoder.decode(event.message)
                    } catch (error) {
                        logger('UDP console received: %s from %s', error, event.rinfo.address)
                    }
                }),
                filter((value, index) => value !== undefined),
                map(value => <ConsoleCommand>value)
            )
    }

}