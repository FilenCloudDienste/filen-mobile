import axios from "axios"

export async function httpHealthCheck({
	url,
	method = "GET",
	expectedStatusCode = 200,
	timeout = 5000,
	headers
}: {
	url: string
	expectedStatusCode?: number
	method?: "GET" | "POST" | "HEAD"
	timeout?: number
	headers?: Record<string, string>
}): Promise<boolean> {
	const abortController = new AbortController()

	const timeouter = setTimeout(() => {
		abortController.abort()
	}, timeout)

	try {
		const response = await axios({
			url,
			timeout,
			method,
			headers,
			signal: abortController.signal,
			validateStatus: () => true
		})

		clearTimeout(timeouter)

		return response.status === expectedStatusCode
	} catch {
		clearTimeout(timeouter)

		return false
	}
}
