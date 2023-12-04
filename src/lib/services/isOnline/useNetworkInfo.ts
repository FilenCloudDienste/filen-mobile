import * as Network from "expo-network"
import { networkState } from "./isOnline"
import { useState, useEffect, useCallback } from "react"

export interface NetworkInfo {
	online: boolean
	wifi: boolean
}

export const useNetworkInfo = () => {
	const [state, setState] = useState<NetworkInfo>({ online: true, wifi: true })

	const update = useCallback(async () => {
		try {
			const state = await networkState()

			setState({
				online: state.isConnected && state.isInternetReachable,
				wifi:
					state.type === Network.NetworkStateType.WIFI ||
					state.type === Network.NetworkStateType.VPN ||
					state.type === Network.NetworkStateType.ETHERNET ||
					state.type === Network.NetworkStateType.BLUETOOTH ||
					state.type === Network.NetworkStateType.WIMAX
			})
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		update()

		const interval = setInterval(update, 5000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	return state
}

export default useNetworkInfo
