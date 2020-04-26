import { ConsoleCommand } from "./iconsoleservice";
import { IMainComputerService } from "./imaincomputerservice";

export class ConsoleCommandsForwarder {
    async forward(consoleCommand: ConsoleCommand) : Promise<void> {
        switch (consoleCommand) {
            case ConsoleCommand.RestartAudioMidi:
                await this.computerService.resetMidiAndAudio()
                break
            case ConsoleCommand.RestartHauptwerk:
                await this.computerService.restartHauptwerk()
                break
        }
    }

    constructor(
        private computerService: IMainComputerService
    ) {}
}
