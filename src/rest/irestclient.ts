export interface IRestClient {
    get: <TResponse>(url: string, timeout: number) => Promise<RestResponse<TResponse>>
    postNoData: <TResponse>(url: string, timeout: number) => Promise<RestResponse<TResponse>>
}
export interface RestResponse<TResponse> {
    result: 'success' | 'timeout' | 'error',
    errorMessage?: string
    data?: TResponse
}

export function restTimeout<TResponse>(): RestResponse<TResponse> {
    return { result: 'timeout' }
}

export function restError<TResponse>(message: string): RestResponse<TResponse> {
    return {
        result: 'error',
        errorMessage: message
    }
}

export function restData<TResponse>(data: TResponse): RestResponse<TResponse> {
    return {
        result: 'success',
        data: data
    }
}