export class PcStatus {
    apiReachable: boolean = false
    apiError: string = ''

    static pingOk(): PcStatus {
        const status = new PcStatus()
        status.apiReachable = true
        return status
    }
    static pingKo(): PcStatus {
        return new PcStatus()
    }
    static createApiError(message: string): PcStatus {
        const status = new PcStatus()
        status.apiError = message
        return status
    }
}