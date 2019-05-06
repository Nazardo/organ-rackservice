import { Observable } from "rxjs"
import { Status } from "../model/status"

export type RackCommand = 'start' | 'stop' | 'reset'

export interface IRackService {
    Commands: Observable<RackCommand>
    setMainPower(isOn: boolean): void
    setAmpPower(isOn: boolean): void
    applyStatus(status: Status): void
    dispose(): void
}