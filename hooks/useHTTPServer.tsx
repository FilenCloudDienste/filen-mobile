import nodeWorker from "@/lib/nodeWorker"
import { useEffect, useState, useCallback, useRef } from "react"
import { AppState } from "react-native"

export default function useHTTPServer() {
	const [info, setInfo] = useState<{
		httpServerPort: number | null
		httpAuthToken: string | null
		ready: boolean
	}>({
		httpServerPort: nodeWorker.httpServerPort,
		httpAuthToken: nodeWorker.httpAuthToken,
		ready: nodeWorker.ready
	})
	const prev = useRef<string>(`${nodeWorker.httpServerPort}:${nodeWorker.httpAuthToken}:${nodeWorker.ready}`)

	const buildStreamURL = useCallback(
		(file: {
			mime: string
			size: number
			uuid: string
			bucket: string
			key: string
			version: number
			chunks: number
			region: string
		}) => {
			if (!info.httpServerPort || !info.httpAuthToken || !info.ready || info.httpAuthToken.length === 0 || info.httpServerPort <= 0) {
				return null
			}

			return `http://127.0.0.1:${info.httpServerPort}/stream?auth=${info.httpAuthToken}&file=${encodeURIComponent(
				btoa(
					JSON.stringify({
						mime: file.mime,
						size: file.size,
						uuid: file.uuid,
						bucket: file.bucket,
						key: file.key,
						version: file.version,
						chunks: file.chunks,
						region: file.region
					})
				)
			)}`
		},
		[info]
	)

	useEffect(() => {
		const appStateListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState !== "active") {
				return
			}

			setTimeout(() => {
				if (prev.current === `${nodeWorker.httpServerPort}:${nodeWorker.httpAuthToken}:${nodeWorker.ready}`) {
					return
				}

				prev.current = `${nodeWorker.httpServerPort}:${nodeWorker.httpAuthToken}:${nodeWorker.ready}`

				setInfo({
					httpServerPort: nodeWorker.httpServerPort,
					httpAuthToken: nodeWorker.httpAuthToken,
					ready: nodeWorker.ready
				})
			}, 3000)
		})

		return () => {
			appStateListener.remove()
		}
	}, [])

	return {
		buildStreamURL,
		port: info.httpServerPort,
		authToken: info.httpAuthToken
	}
}
