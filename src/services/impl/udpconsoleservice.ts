import { createSocket, RemoteInfo, Socket } from 'dgram'
import { Observable, fromEvent } from 'rxjs'
import { map, filter } from 'rxjs/operators'
import { Debugger } from 'debug'
import { LedStatus } from '../../model/ledstatus'
import { IConsoleService, ConsoleCommand } from '../iconsoleservice'

export class UdpConsoleService implements IConsoleService {
    Commands: Observable<ConsoleCommand>
    udpSocket: Socket;
    statusPayload: Buffer;

    setLedStatus(ledStatus: LedStatus[]): Promise<void> {
        let ledByte = 0
        for (let i = 0; i < 3; ++i) {
            if (ledStatus[i] == LedStatus.On) {
                ledByte |= 1 << (i * 2)
            } else if (ledStatus[i] == LedStatus.Blinking) {
                ledByte |= 2 << (i * 2)
            }
        }
        this.statusPayload[1] = ledByte
        return Promise.resolve()
    }

    async bind(): Promise<IConsoleService> {
        await new Promise<void>((resolve, reject) => {
            this.udpSocket.once('error', (err) => reject(err))
            this.udpSocket.bind(this.udpPort, () => resolve())
        })
        this.logger('UDP Socket bound to', this.udpSocket.address())
        return this
    }

    private async send(data: Buffer, address: string) {
        await new Promise<void>((resolve, reject) => {
            this.udpSocket.send(data, this.udpPort, address, (err, bytes) => {
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
        private logger: Debugger) {
        this.udpSocket = createSocket('udp4')
        this.statusPayload = Buffer.alloc(2)

        const buttonsMapping = [
            // 0: Green button
            [null, null],
            // 1: Red button
            [ConsoleCommand.ShutdownComputer, ConsoleCommand.PowerCycle],
            // 2: Black button
            [ConsoleCommand.RestartAudioMidi, ConsoleCommand.RestartHauptwerk]
        ]

        const messageReceivedObservable = fromEvent(
            this.udpSocket,
            'message',
            (message: Buffer, rinfo: RemoteInfo) => ({ message, rinfo })
        )

        messageReceivedObservable.subscribe(async next => {
            await this.send(this.statusPayload, next.rinfo.address)
        })

        this.Commands = messageReceivedObservable
            .pipe(
                map((event) => {
                    if (event.message.length == 3 &&
                        event.message[0] == 1) {
                        let command = ConsoleCommand.ConsolePowerOn
                        const buttonsByte = event.message[2]
                        const isPressed = !!(buttonsByte & 0x80)
                        const isLongPress = !!(buttonsByte & 0x40)
                        const buttonId = buttonsByte & 0x0F
                        if (isPressed && buttonId < buttonsMapping.length) {
                            command = buttonsMapping[buttonId][isLongPress ? 1 : 0] || command
                        }
                        return command
                    }
                }),
                filter((value) => value !== undefined),
                map(value => <ConsoleCommand>value)
            )
    }

}
