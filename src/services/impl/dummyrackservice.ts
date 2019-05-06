import { Observable, from } from "rxjs"
import { Status } from "src/model/status"
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
    applyStatus(status: Status): Promise<void> {
        console.log('Current status: ' + status)
        return Promise.resolve()
    }

    constructor() {
        this.Commands = from([])
    }
}