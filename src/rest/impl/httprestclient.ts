import { IRestClient, RestResponse, restError, restData, restTimeout } from "../../rest/irestclient";
import * as http from 'http'

export class HttpRestClient implements IRestClient {
    get<TResponse>(url: string, timeout: number): Promise<RestResponse<TResponse>> {
        return new Promise<RestResponse<TResponse>>((resolve, _) => {
            let clientRequest = http.get(url, { timeout: timeout }, (response) => {
                const { statusCode } = response
                const contentType = response.headers['content-type'] || 'no-content-type'
                let errorMessage: string = ''
                if (statusCode !== 200) {
                    errorMessage = `Request Failed. Status Code: ${statusCode}`
                } else if (!/^application\/json/.test(contentType)) {
                    errorMessage = `Invalid content-type ${contentType}`
                }
                if (errorMessage !== '') {
                    response.resume()
                    resolve(restError(errorMessage))
                }
                let rawData = '';
                response.on('data', (chunk) => { rawData += chunk });
                response.once('end', () => {
                    try {
                        const data = <TResponse>JSON.parse(rawData);
                        // TODO: Parse response
                        resolve(restData(data))
                    } catch (e) {
                        resolve(restError(e))
                    }
                });
            }).once('timeout', () => {
                clientRequest.abort()
            }).once('error', (error: Error) => {
                if (clientRequest.aborted) {
                    resolve(restTimeout())
                } else {
                    resolve(restError(error.message))
                }
            })
        })
    }
}