import { IHauptwerkService } from "../ihauptwerkservice"
import { IRestClient } from "../../rest/irestclient"

export class RestHaupwterkService implements IHauptwerkService {
    private startUrl: string
    private resetUrl: string
    private shutdownUrl: string

    async startHaupwerk(): Promise<void> {
        await this.postTo(this.startUrl)
    }

    async resetMidiAndAudio(): Promise<void> {
        await this.postTo(this.resetUrl)
    }

    async shutdownPc(): Promise<void> {
        await this.postTo(this.shutdownUrl)
    }

    private async postTo(url: string): Promise<void> {
        await this.client.postNoData(url, this.timeout)
    }

    constructor(
        private client: IRestClient,
        hauptwerkApiUrl: string,
        private timeout: number = 3000) {
        this.startUrl = hauptwerkApiUrl + '/start'
        this.resetUrl = hauptwerkApiUrl + '/reset'
        this.shutdownUrl = hauptwerkApiUrl + '/shutdown'
    }
}