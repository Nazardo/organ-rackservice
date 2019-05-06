export interface IWolService {
    wakeUpOnLan(macAddress: Uint8Array): Promise<void>
}