import { ConsoleCommand } from "./iconsoleservice";
import { IHauptwerkService } from "./ihauptwerkservice";

export class ConsoleCommandsForwarder {
    async forward(consoleCommand: ConsoleCommand) : Promise<void> {
        switch (consoleCommand) {
            case ConsoleCommand.RestartAudioMidi:
                await this.computerService.resetMidiAndAudio()
                break
            case ConsoleCommand.RestartComputer:
                await this.computerService.restartComputer()
                break
            case ConsoleCommand.RestartHauptwerk:
                await this.computerService.restartHaupwerk()
                break
        }
    }

    constructor(
        private computerService: IHauptwerkService
    ) {}
}