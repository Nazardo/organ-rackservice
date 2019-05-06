import { Observable } from "rxjs"
import { Status } from "src/model/status"

export type RackCommand = 'start' | 'stop'

export interface IRackService {
    Commands: Observable<RackCommand>
    setMainPower(isOn: boolean): Promise<void>
    setAmpPower(isOn: boolean): Promise<void>
    applyStatus(status: Status): Promise<void>
}