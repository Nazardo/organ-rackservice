import { IRackService, RackCommand } from "../irackservice";
import { Observable, Subject } from "rxjs";
import { Status } from "src/model/status";
import { Debugger } from "debug"

export class RpiRackService implements IRackService {
    Commands: Observable<RackCommand>

    setMainPower(isOn: boolean): Promise<void> {
        // TODO Use Raspberry API to activate relay
        throw 'Not implemented exception'
    }

    setAmpPower(isOn: boolean): Promise<void> {
        // TODO Use Raspberry API to activate relay
        throw 'Not implemented exception'
    }

    applyStatus(status: Status): Promise<void> {
        // TODO Use Raspberry API to activate leds
        throw 'Not implemented exception'
    }

    constructor(
        private logger: Debugger) {
        // TODO Use Raspberry API to detect commands
        this.Commands = new Subject<RackCommand>()
    }
}