import NetInfo, { useNetInfo as useNetInfoNative } from "@react-native-community/netinfo"
import { useMemo } from "react"

export async function getNetInfoState() {
	const { isConnected, isInternetReachable, isWifiEnabled } = await NetInfo.fetch()

	return {
		hasInternet: (isConnected ?? true) && (isInternetReachable ?? true),
		isConnected: isConnected ?? true,
		isInternetReachable: isInternetReachable ?? true,
		isWifiEnabled: isWifiEnabled ?? true
	}
}

export default function useNetInfo() {
	const { isConnected, isInternetReachable, isWifiEnabled } = useNetInfoNative()

	const state = useMemo(() => {
		return {
			hasInternet: (isConnected ?? true) && (isInternetReachable ?? true),
			isConnected: isConnected ?? true,
			isInternetReachable: isInternetReachable ?? true,
			isWifiEnabled: isWifiEnabled ?? true
		}
	}, [isConnected, isInternetReachable, isWifiEnabled])

	return state
}
