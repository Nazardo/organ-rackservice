import 'jasmine'
import { IMainComputerService } from './imaincomputerservice';
import { ConsoleCommandsForwarder } from './consolecommandsforwarder';
import { ConsoleCommand } from './iconsoleservice';

describe('ConsoleCommandsForwarder', function() {
    let computerService : IMainComputerService;
    let forwarder : ConsoleCommandsForwarder;

    beforeEach(function () {
        computerService = jasmine.createSpyObj<IMainComputerService>(
            'hauptwerkService',
            ['resetMidiAndAudio', 'restartHauptwerk' ]
        )
        forwarder = new ConsoleCommandsForwarder(computerService)
    })

    it('forwards RestartAudioMidi', async function() {
        await forwarder.forward(ConsoleCommand.RestartAudioMidi)
        expect(computerService.resetMidiAndAudio).toHaveBeenCalled()
    })

    it('forwards RestartHauptwerk', async function() {
        await forwarder.forward(ConsoleCommand.RestartHauptwerk)
        expect(computerService.restartHauptwerk).toHaveBeenCalled()
    })
})
