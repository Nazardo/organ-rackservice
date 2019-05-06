import 'jasmine'
import { RestPcStatusService } from './restpcstatusservice'
import { IRestClient, RestResponse } from '../../rest/irestclient';
import { PcStatus } from '../../model/pcstatus';
import { take } from 'rxjs/operators';

describe('RestPcStatusService', () => {
    const testUrl: string = 'http://localhost:2000/testapi/status'
    const pollingInterval: number = 10
    const httpTimeout: number = 5
    let restClient: jasmine.SpyObj<IRestClient>

    beforeEach(() => {
        restClient = jasmine.createSpyObj<IRestClient>('restClient', ['get'])
    })

    it('should call the rest service with right URL', () => {
        restClient.get.and.returnValue(new Promise<RestResponse<{}>>((resolve, _) => resolve({
            result: 'success',
        })))
        const restService = new RestPcStatusService(<IRestClient>restClient, testUrl, pollingInterval, httpTimeout)
        const value = restService.Statuses.pipe(take(1))
        expect(value).toEqual(jasmine.any(PcStatus))
    })
})