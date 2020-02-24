import { Observable } from "rxjs"
import { LedStatus } from "../model/ledstatus"

export enum ConsoleCommand {
    ConsolePowerOff = 0,
    ConsolePowerOn = 1,
    RestartComputer = 2,
    PowerCycle = 3,
    RestartHauptwerk = 4,
    RestartAudioMidi = 5,
}

export interface IConsoleService {
    Commands: Observable<ConsoleCommand>
    setLedStatus(ledStatus: LedStatus[]): Promise<void>
}