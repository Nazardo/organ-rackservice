import { IWolService } from "../iwolservice";
import { Observable, Subject } from "rxjs";
import { createSocket, Socket } from "dgram";

export class UdpWolService implements IWolService {
    static readonly UdpPort: number = 2

    constructor(
        private broadcastIp: string,
        private socket = createSocket({ reuseAddr: true, type: 'udp4' })) { }

    async bind(): Promise<IWolService> {
        await new Promise<void>((resolve, reject) => {
            this.socket.once('error', (err) => reject(err))
            this.socket.bind(() => resolve())
        })
        this.socket.setBroadcast(true)
        return this
    }

    wakeUpOnLan(macAddress: Uint8Array): Observable<void> {
        const magicPacket = UdpWolService.createMagicPacket(macAddress)
        const subject = new Subject<void>()
        this.socket.send(magicPacket, UdpWolService.UdpPort, this.broadcastIp, (error: Error | null, bytes: number) => {
            if (error) {
                subject.error(error)
            } else {
                subject.complete()
            }
        })
        return subject
    }

    private static createMagicPacket(macAddress: Uint8Array): Buffer {
        const packet: Buffer = Buffer.allocUnsafe(102)
        for (var i = 0; i < 6; ++i) {
            packet[i] = 0xFF
        }
        for (var i = 6; i < 102; ++i) {
            packet[i] = macAddress[i % 6]
        }
        return packet
    }
}