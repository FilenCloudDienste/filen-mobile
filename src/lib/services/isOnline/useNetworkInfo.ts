import * as Network from "expo-network"
import { networkState } from "./isOnline"
import { useState, useEffect, useCallback } from "react"
import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo"
import useAppState from "../../../lib/hooks/useAppState"

export type NetworkInfo = {
	online: boolean
	wifi: boolean
}

export const useNetworkInfo = () => {
	const [state, setState] = useState<NetworkInfo>({ online: true, wifi: true })
	const appState = useAppState()

	const update = useCallback(async () => {
		try {
			const s = await networkState()

			setState({
				online: s.isConnected && s.isInternetReachable,
				wifi:
					s.type === Network.NetworkStateType.WIFI ||
					s.type === Network.NetworkStateType.VPN ||
					s.type === Network.NetworkStateType.ETHERNET ||
					s.type === Network.NetworkStateType.BLUETOOTH ||
					s.type === Network.NetworkStateType.WIMAX
			})
		} catch (e) {
			console.error(e)

			setState({
				online: false,
				wifi: false
			})
		}
	}, [])

	useEffect(() => {
		if (appState.state === "active" && appState.didChangeSinceInit) {
			update()
		}
	}, [appState])

	useEffect(() => {
		update()

		const removeNetInfoListener = NetInfo.addEventListener(s => {
			setState({
				online: s.isConnected && s.isInternetReachable,
				wifi:
					s.type === NetInfoStateType.wifi ||
					s.type === NetInfoStateType.vpn ||
					s.type === NetInfoStateType.ethernet ||
					s.type === NetInfoStateType.bluetooth ||
					s.type === NetInfoStateType.wimax
			})
		})

		return () => {
			removeNetInfoListener()
		}
	}, [])

	return state
}

export default useNetworkInfo
