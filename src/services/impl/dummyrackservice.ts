import { Observable, from } from "rxjs"
import { LedStatus } from "../../model/ledstatus"
import { IRackService, RackCommand } from "../irackservice"

export class DummyRackService implements IRackService {
    Commands: Observable<RackCommand>

    setMainPower(isOn: boolean): Promise<void> {
        console.log('MAIN POWER: ' + isOn ? 'ON' : 'OFF')
        return Promise.resolve()
    }
    setAmpPower(isOn: boolean): Promise<void> {
        console.log('AMP POWER: ' + isOn ? 'ON' : 'OFF')
        return Promise.resolve()
    }
    setLedStatus(ledStatus: LedStatus[]): Promise<void> {
        console.log('Current status: R(%s), G(%s), B(%s)',
            ledStatus[0], ledStatus[1], ledStatus[2])
        return Promise.resolve()
    }
    dispose(): void {}

    constructor() {
        this.Commands = from([])
    }
}