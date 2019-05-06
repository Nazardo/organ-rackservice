export interface IHauptwerkService {
    startHaupwerk(): Promise<void>
    resetMidiAndAudio(): Promise<void>
    shutdownPc(): Promise<void>
}