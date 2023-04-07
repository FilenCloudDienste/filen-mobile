import * as Network from "expo-network"

export const isOnline = async (): Promise<boolean> => {
	try {
		const state = await Network.getNetworkStateAsync()

		return state.isInternetReachable && state.isConnected
	} catch (e) {
		console.error(e)

		return true
	}
}

export const networkState = async () => {
	return await Network.getNetworkStateAsync()
}

export const isWifi = async (): Promise<boolean> => {
	try {
		const state = await Network.getNetworkStateAsync()

		return state.type === Network.NetworkStateType.WIFI
	} catch (e) {
		console.error(e)

		return true
	}
}
