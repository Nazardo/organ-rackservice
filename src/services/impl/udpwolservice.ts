import { createSocket } from "dgram"
import { IWolService } from "../iwolservice"

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

    wakeUpOnLan(macAddress: Uint8Array): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const magicPacket = UdpWolService.createMagicPacket(macAddress)
            this.socket.send(
                magicPacket,
                UdpWolService.UdpPort,
                this.broadcastIp,
                (error: Error | null, bytes: number) => {
                    if (error) {
                        reject(error)
                    } else {
                        resolve()
                    }
                }
            )
        })
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