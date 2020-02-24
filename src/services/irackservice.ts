import { Observable } from "rxjs"
import { LedStatus } from "../model/ledstatus"

export enum RackCommand {
    PowerOff = 0,
    ManualPowerOn = 1,
    ReleaseLocalControl = 2
}

export interface IRackService {
    Commands: Observable<RackCommand>
    setMainPower(isOn: boolean): void
    setAmpPower(isOn: boolean): void
    setLedStatus(status: LedStatus[]): void
    dispose(): void
}