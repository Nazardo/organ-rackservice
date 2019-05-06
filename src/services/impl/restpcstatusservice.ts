import { Observable, interval } from "rxjs"
import { concatMap, map } from "rxjs/operators"
import { IPcStatusService } from "../ipcstatusservice"
import { PcStatus } from "../../model/pcstatus"
import { IRestClient, RestResponse } from "../../rest/irestclient"
import { PcStatusApiResponse } from "../../rest/pcstatusapiresponse"

export class RestPcStatusService implements IPcStatusService {
    Statuses: Observable<PcStatus>

    constructor(
        client: IRestClient,
        statusApiUrl: string,
        pollingInterval: number,
        httpTimeout: number) {
        this.Statuses = interval(pollingInterval).pipe(
            concatMap(() => client.get<PcStatusApiResponse>(statusApiUrl, httpTimeout)),
            map((restResponse: RestResponse<PcStatusApiResponse>) => {
                if (restResponse.result === 'timeout') {
                    return PcStatus.apiNotReachable()
                } else if (restResponse.data !== undefined) {
                    const pcStatus = new PcStatus()
                    pcStatus.apiReachable = true
                    pcStatus.hauptwerkRunning = restResponse.data.running
                    pcStatus.midiActive = restResponse.data.midiActive
                    pcStatus.audioActive = restResponse.data.audioActive
                    return pcStatus
                } else {
                    return PcStatus.createApiError(restResponse.errorMessage || 'undefined')
                }
            })
        )
    }
}