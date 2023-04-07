import * as Network from "expo-network"
import { networkState } from "./isOnline"
import { useState, useEffect } from "react"

export interface NetworkInfo {
	online: boolean
	wifi: boolean
}

export const useNetworkInfo = () => {
	const [state, setState] = useState<NetworkInfo>({ online: true, wifi: true })

	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const info = await networkState()

				setState({
					online: info.isConnected && info.isInternetReachable,
					wifi: info.type === Network.NetworkStateType.WIFI
				})
			} catch (e) {
				console.error(e)
			}
		}, 5000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	return state
}

export default useNetworkInfo
