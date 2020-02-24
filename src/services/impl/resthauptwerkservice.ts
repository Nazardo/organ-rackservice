import { IHauptwerkService } from "../ihauptwerkservice"
import { IRestClient } from "../../rest/irestclient"

export class RestHaupwterkService implements IHauptwerkService {
    private restartHauptwerkUrl: string
    private restartComputerUrl: string
    private resetMidiAudioUrl: string
    private shutdownComputerUrl: string

    async resetMidiAndAudio(): Promise<void> {
        await this.postTo(this.resetMidiAudioUrl)
    }

    async restartHaupwerk(): Promise<void> {
        await this.postTo(this.restartHauptwerkUrl);
    }

    async restartComputer(): Promise<void> {
        await this.postTo(this.restartComputerUrl)
    }

    async shutdownComputer(): Promise<void> {
        await this.postTo(this.shutdownComputerUrl)
    }

    private async postTo(url: string): Promise<void> {
        await this.client.postNoData(url, this.timeout)
    }

    constructor(
        private client: IRestClient,
        hauptwerkApiUrl: string,
        private timeout: number = 2000) {
        this.restartHauptwerkUrl = hauptwerkApiUrl + '/restart'
        this.resetMidiAudioUrl = hauptwerkApiUrl + '/reset-midi-audio'
        this.restartComputerUrl = hauptwerkApiUrl + '/restart-pc'
        this.shutdownComputerUrl = hauptwerkApiUrl + '/shutdown-pc'
    }
}