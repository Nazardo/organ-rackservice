import { IRackService, RackCommand } from "../irackservice";
import { Observable, Subject, Subscription, interval } from "rxjs";
import { Status } from "../../model/status";
import { Debugger } from "debug"
import { Gpio } from "pigpio";

interface LedStatus {
    isBlinking: boolean,
    isOn: boolean
}

interface LedSemaphore {
    green: LedStatus,
    yellow: LedStatus,
    red: LedStatus
}

export class RpiRackService implements IRackService {
    mainPowerOut: Gpio
    ampPowerOut: Gpio
    ledGreen: Gpio
    ledYellow: Gpio
    ledRed: Gpio
    ledSemaphore: LedSemaphore = {
        green: { isBlinking: false, isOn: false },
        yellow: { isBlinking: false, isOn: false },
        red: { isBlinking: false, isOn: false },
    }
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

    applyStatus(status: Status): void {
        this.ledSemaphore = {
            red: {
                isOn: status === Status.SystemOff
                    || status === Status.WaitPcToHalt,
                isBlinking: status === Status.RequestComputerShutdown
            },
            yellow: {
                isOn: status === Status.PoweringOnComputer
                    || status === Status.StartingHauptwerk
                    || status === Status.WaitConsoleTimeout
                    || status === Status.RequestComputerShutdown
                    || status === Status.WaitPcToHalt,
                isBlinking: false
            },
            green: {
                isOn: status === Status.StartingHauptwerk
                    || status === Status.SystemOn,
                isBlinking: status === Status.PoweringOnComputer
            }
        }
        this.ledRed.digitalWrite(this.ledSemaphore.red.isOn ? 1 : 0)
        this.ledYellow.digitalWrite(this.ledSemaphore.yellow.isOn ? 1 : 0)
        this.ledGreen.digitalWrite(this.ledSemaphore.green.isOn ? 1 : 0)
    }

    dispose(): void {
        this.blinkingTimer.unsubscribe()
    }

    constructor(
        private logger: Debugger) {
        const commandsSubject: Subject<RackCommand> = new Subject<RackCommand>()
        this.Commands = commandsSubject
        this.mainPowerOut = new Gpio(17, { mode: Gpio.OUTPUT })
        this.ampPowerOut = new Gpio(18, { mode: Gpio.OUTPUT })
        this.ledGreen = new Gpio(22, { mode: Gpio.OUTPUT })
        this.ledYellow = new Gpio(23, { mode: Gpio.OUTPUT })
        this.ledRed = new Gpio(24, { mode: Gpio.OUTPUT })

        const startButton: Gpio = new Gpio(5, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})
        const stopButton: Gpio = new Gpio(6, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})
        const resetButton: Gpio = new Gpio(12, { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_UP, alert: true})

        startButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next('start') }
        })
        stopButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next('stop') }
        })
        resetButton.glitchFilter(10000).on('alert', (level) => {
            if (level === 0) { commandsSubject.next('reset') }
        })

        function applyBlinking(led: LedStatus, out: Gpio): void {
            if (led.isBlinking) {
                led.isOn = !led.isOn
                out.digitalWrite(led.isOn ? 1 : 0)
            }
        }

        this.blinkingTimer = interval(1000).subscribe((_) => {
            applyBlinking(this.ledSemaphore.green, this.ledGreen)
            applyBlinking(this.ledSemaphore.yellow, this.ledYellow)
            applyBlinking(this.ledSemaphore.red, this.ledRed)
        })
    }
}