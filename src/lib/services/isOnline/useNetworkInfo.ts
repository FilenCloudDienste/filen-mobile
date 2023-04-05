import { DeviceEventEmitter } from "react-native"
import { isOnline, isWifi } from "./isOnline"
import { useState, useEffect } from "react"

export interface NetworkInfo {
	online: boolean
	wifi: boolean
}

export const useNetworkInfo = () => {
	const [state, setState] = useState<NetworkInfo>({ online: isOnline(), wifi: isWifi() })

	useEffect(() => {
		const sub = DeviceEventEmitter.addListener("networkInfoChange", (state: NetworkInfo) => setState(state))

		return () => {
			sub.remove()
		}
	}, [])

	return state
}

export default useNetworkInfo
