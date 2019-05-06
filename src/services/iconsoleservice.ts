import { Observable } from "rxjs";

export type ConsoleCommand = 'start' | 'stop' | 'reset'

export interface IConsoleService {
    Commands: Observable<ConsoleCommand>
    sendStatus(): void
}