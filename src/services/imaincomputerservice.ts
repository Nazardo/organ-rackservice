export interface IMainComputerService {
    resetMidiAndAudio(): Promise<void>
    restartHauptwerk(): Promise<void>
    shutdownComputer(): Promise<void>
}
