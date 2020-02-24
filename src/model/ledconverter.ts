import { LedStatus } from "./ledstatus";
import { Status } from "./status";

export namespace LedConverter {
    export function getLedStatusForRack(status: Status): LedStatus[] {
        const off = LedStatus.Off
        const blink = LedStatus.Blinking
        const on = LedStatus.On
        switch (status) {
            case Status.SystemOff:
                return [ off, off, off ]
            case Status.PowerCycleTimeout:
                return [ blink, off, off ]
            case Status.PoweringOnComputer:
                return [ off, blink, blink ]
            case Status.WaitForHauptwerkToLoad:
                return [ off, off, blink ]
            case Status.SystemOn:
                return [ off, off, on ]
            case Status.SystemOnPermanent:
                return [ on, on, on ]
            case Status.ConsoleOffTimeout:
                return [ off, blink, on ]
            case Status.RequestComputerShutdown:
                return [ on, blink, off ]
            case Status.PowerOffComputerTimeout:
                return [ on, off, off ]
        }
    }
    export function getLedStatusForConsole(status: Status): LedStatus[] {
        return getLedStatusForRack(status)
    }
}