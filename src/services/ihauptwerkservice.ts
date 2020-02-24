export interface IHauptwerkService {
    resetMidiAndAudio(): Promise<void>
    restartHaupwerk(): Promise<void>
    restartComputer(): Promise<void>
    shutdownComputer(): Promise<void>
}