import { IMainComputerService } from "../imaincomputerservice"
import { IRestClient } from "../../rest/irestclient"

export class RestMainComputerService implements IMainComputerService {
    private restartHauptwerkUrl: string
    private resetMidiAudioUrl: string
    private shutdownComputerUrl: string

    async resetMidiAndAudio(): Promise<void> {
        await this.postTo(this.resetMidiAudioUrl)
    }

    async restartHauptwerk(): Promise<void> {
        await this.postTo(this.restartHauptwerkUrl);
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
        this.restartHauptwerkUrl = hauptwerkApiUrl + '/restart-hauptwerk'
        this.resetMidiAudioUrl = hauptwerkApiUrl + '/reset-midi-audio'
        this.shutdownComputerUrl = hauptwerkApiUrl + '/shutdown'
    }
}
