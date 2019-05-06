import * as http from 'http'
import { IRestClient, RestResponse, restError, restData, restTimeout } from "../../rest/irestclient"

export class HttpRestClient implements IRestClient {

    private static handleResponse<TResponse>(resolve: (value: RestResponse<TResponse>) => void, response: http.IncomingMessage): void {
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
                resolve(restData(data))
            } catch (e) {
                resolve(restError(e))
            }
        });
    }

    get<TResponse>(url: string, timeout: number): Promise<RestResponse<TResponse>> {
        return new Promise<RestResponse<TResponse>>((resolve, _) => {
            const clientRequest = http.get(url, {
                timeout: timeout
            }, (response) => {
                HttpRestClient.handleResponse(resolve, response)
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

    postNoData<TResponse>(url: string, timeout: number): Promise<RestResponse<TResponse>> {
        return new Promise<RestResponse<TResponse>>((resolve, _) => {
            let clientRequest = http.request(url, {
                timeout: timeout,
                method: 'POST'
            }, (response) => {
                HttpRestClient.handleResponse(resolve, response)
            }).once('timeout', () => {
                clientRequest.abort()
            }).once('error', (error: Error) => {
                if (clientRequest.aborted) {
                    resolve(restTimeout())
                } else {
                    resolve(restError(error.message))
                }
            })
            clientRequest.end() // close and send request
        })
    }
}