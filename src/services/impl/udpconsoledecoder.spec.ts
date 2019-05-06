import 'jasmine'
import { UdpConsoleDecoder } from './udpconsoledecoder'
import { ConsoleCommand } from '../iconsoleservice';

// Start/Stop messages have message Type = 1
// Version 1 format:
//      [1 : Type(1B)][1 : Version(1B)][0/1 : Command(1B)][0..3 : HWConfig(1B)]
//
// Reset messages have message Type = 2
// Version 1 format (no parameters):
//      [2 : Type(1B)][1 : Version(1B)]

describe('UdpConsoleDecoder', () => {
    let decoder: UdpConsoleDecoder

    beforeEach(() => {
        decoder = new UdpConsoleDecoder()
    })

    it('decodes start command ver. 1', () => {
        const startCommandRaw = Buffer.from([
            0x01, 0x01, 0x01, 0x02
        ])
        const command = decoder.decode(startCommandRaw)
        expect(command).toEqual(<ConsoleCommand>'start')
    })

    it('decodes stop command ver. 1', () => {
        const stopCommandRaw = Buffer.from([
            0x01, 0x01, 0x00, 0x02
        ])
        const command = decoder.decode(stopCommandRaw)
        expect(command).toEqual(<ConsoleCommand>'stop')
    })

    it('decodes reset command ver. 1', () => {
        const resetCommandRaw = Buffer.from([
            0x02, 0x01
        ])
        const command = decoder.decode(resetCommandRaw)
        expect(command).toEqual(<ConsoleCommand>'reset')
    })

    it('throws on unknown message type', () => {
        const stopCommandRaw = Buffer.from([
            0x03, 0x00, 0x00, 0x00, 0x00
        ])
        expect(decoder.decode.bind(decoder, stopCommandRaw)).toThrow()
    })

    it('throws on unknown message version', () => {
        const startCommandVersion2Raw = Buffer.from([
            0x01, 0x02, 0x00, 0x00, 0x00
        ])
        expect(decoder.decode.bind(decoder, startCommandVersion2Raw)).toThrow()
    })
})