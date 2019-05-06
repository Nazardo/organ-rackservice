import { Observable } from "rxjs"
import { PcStatus } from "../model/pcstatus"

export interface IPcStatusService {
    Statuses: Observable<PcStatus>
}