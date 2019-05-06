import { Observable } from "rxjs";

export interface IWolService {
    wakeUpOnLan(macAddress: Uint8Array): Observable<void>
}