import { ConsoleCommand } from "../iconsoleservice"
import { Status } from "../../model/status"

export class UdpConsoleDecoder {

    encodeStatus(status: Status): Buffer {
        const data = Buffer.allocUnsafe(3)
        data[0] = 0 // Status message
        data[1] = 1 // version 1
        data[2] = status
        return data
    }

    decode(data: Buffer): ConsoleCommand {
        const messageType = data[0]
        const messageVersion = data[1]
        switch (messageType) {
            case 0x01:
                return this.decodeStartStop(messageVersion, data.subarray(2))
            case 0x02:
                return this.decodeReset(messageVersion, data.subarray(2))
        }
        throw 'Unknown message type'
    }

    private decodeStartStop(messageVersion: number, data: Buffer): ConsoleCommand {
        if (messageVersion == 1) {
            if (data[0] == 1) {
                return 'start'
            } else {
                return 'stop'
            }
        }
        throw 'Unknown message version'
    }

    private decodeReset(messageVersion: number, data: Buffer): ConsoleCommand {
        if (messageVersion == 1)
            return 'reset'
        throw 'Unknown message version'
    }
}