import { IPcStatusService } from "../ipcstatusservice";
import { Observable, interval } from "rxjs";
import { PcStatus } from "../../model/pcstatus";
import { concatMap, map } from "rxjs/operators";
import { IRestClient, RestResponse } from "../../rest/irestclient";

export class RestPcStatusService implements IPcStatusService {
    Statuses: Observable<PcStatus>

    constructor(
        client: IRestClient,
        statusApiUrl: string,
        pollingInterval: number,
        httpTimeout: number) {
        this.Statuses = interval(pollingInterval).pipe(
            concatMap(() => client.get<{}>(statusApiUrl, httpTimeout)),
            map((restResponse: RestResponse<{}>) => {
                if (restResponse.result === 'timeout') {
                    return PcStatus.pingKo()
                } else if (restResponse.result === 'error') {
                    return PcStatus.createApiError(restResponse.errorMessage || 'undefined')
                } else {
                    return PcStatus.pingOk()
                }
            })
        )
    }
}