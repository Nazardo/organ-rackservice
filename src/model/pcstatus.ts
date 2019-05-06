export class PcStatus {
    apiReachable: boolean = false
    hauptwerkRunning: boolean = false
    midiActive: boolean = false
    audioActive: boolean = false
    apiError: string = ''

    static apiNotReachable(): PcStatus {
        return new PcStatus()
    }
    static createApiError(message: string): PcStatus {
        const status = new PcStatus()
        status.apiError = message
        return status
    }
}