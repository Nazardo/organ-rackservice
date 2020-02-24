import { IRackService, RackCommand } from "../irackservice";
import { Observable, Subject, Subscription, interval } from "rxjs";
import { LedStatus } from "../../model/ledstatus";
import { Debugger } from "debug"
import { Gpio } from "pigpio";

interface LampStatus {
    mustBlink: boolean,
    isCurrentlyOn: boolean
}

export class RpiRackService implements IRackService {
    mainPowerOut: Gpio
    ampPowerOut: Gpio
    ledGreen: Gpio
    ledYellow: Gpio
    ledRed: Gpio
    ledSemaphore: LampStatus[]
    blinkingTimer: Subscription
    Commands: Observable<RackCommand>

    setMainPower(isOn: boolean): void {
        // Relays are activated with a logical zero
        this.logger('Set MAIN POWER : %s', isOn);
        this.mainPowerOut.digitalWrite(isOn ? 0 : 1)
    }

    setAmpPower(isOn: boolean): void {
        // Relays are activated with a logical zero
        this.logger('Set AMP POWER : %s', isOn);
        this.ampPowerOut.digitalWrite(isOn ? 0 : 1)
    }

    setLedStatus(ledStatus: LedStatus[]): void {
        this.ledSemaphore = [
            {
                isCurrentlyOn: ledStatus[0] === LedStatus.On,
                mustBlink: ledStatus[0] === LedStatus.Blinking
            },
            {
                isCurrentlyOn: ledStatus[1] === LedStatus.On,
                mustBlink: ledStatus[1] === LedStatus.Blinking
            },
            {
                isCurrentlyOn: ledStatus[2] === LedStatus.On,
                mustBlink: ledStatus[2] === LedStatus.Blinking
            },
        ]
        this.ledRed.digitalWrite(this.ledSemaphore[0].isCurrentlyOn ? 1 : 0)
        this.ledYellow.digitalWrite(this.ledSemaphore[1].isCurrentlyOn ? 1 : 0)
        this.ledGreen.digitalWrite(this.ledSemaphore[2].isCurrentlyOn ? 1 : 0)
    }

    dispose(): void {
        this.blinkingTimer.unsubscribe()
    }

    constructor(
        private logger: Debugger) {
        this.ledSemaphore = [
            { isCurrentlyOn: false, mustBlink: false },
            { isCurrentlyOn: false, mustBlink: false },
            { isCurrentlyOn: false, mustBlink: false }
        ]
        const commandsSubject: Subject<RackCommand> = new Subject<RackCommand>()
        this.Commands = commandsSubject
        this.mainPowerOut = new Gpio(17, { mode: Gpio.OUTPUT })
        this.ampPowerOut = new Gpio(18, { mode: Gpio.OUTPUT })
        this.ledGreen = new Gpio(22, { mode: Gpio.OUTPUT })
        this.ledYellow = new Gpio(23, { mode: Gpio.OUTPUT })
        this.ledRed = new Gpio(24, { mode: Gpio.OUTPUT })

        const greenButton: Gpio = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})
        const redButton: Gpio = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})
        const blackButton: Gpio = new Gpio(12, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})

        greenButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next(RackCommand.ManualPowerOn) }
        })
        redButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next(RackCommand.PowerOff) }
        })
        blackButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next(RackCommand.ReleaseLocalControl) }
        })

        function applyBlinking(led: LampStatus, out: Gpio): void {
            if (led.mustBlink) {
                led.isCurrentlyOn = !led.isCurrentlyOn
                out.digitalWrite(led.isCurrentlyOn ? 1 : 0)
            }
        }

        this.blinkingTimer = interval(1000).subscribe((_) => {
            applyBlinking(this.ledSemaphore[0], this.ledRed)
            applyBlinking(this.ledSemaphore[1], this.ledYellow)
            applyBlinking(this.ledSemaphore[2], this.ledGreen)
        })
    }
}