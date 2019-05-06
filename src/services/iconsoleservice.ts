import { Observable } from "rxjs"
import { Status } from "../model/status"

export type ConsoleCommand = 'start' | 'stop' | 'reset'

export interface IConsoleService {
    Commands: Observable<ConsoleCommand>
    sendStatus(status: Status): Promise<void>
}