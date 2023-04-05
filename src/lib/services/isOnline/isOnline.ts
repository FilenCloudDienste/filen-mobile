import * as Network from "expo-network"
import { DeviceEventEmitter } from "react-native"
import { AppState } from "react-native"

let STATE_INTERVAL: any
const info = {
	online: true,
	wifi: true
}

export const runWifiCheck = () => {
	Network.getNetworkStateAsync()
		.then(state => {
			DeviceEventEmitter.emit("networkInfoChange", {
				online: state.isInternetReachable && state.isConnected,
				wifi: state.type == Network.NetworkStateType.WIFI
			})

			info.online = state.isInternetReachable && state.isConnected
			info.wifi = state.type == Network.NetworkStateType.WIFI
		})
		.catch(console.error)
}

export const run = () => {
	clearInterval(STATE_INTERVAL)

	runWifiCheck()

	STATE_INTERVAL = setInterval(runWifiCheck, 15000)
}

run()

AppState.addEventListener("change", nextAppState => {
	if (nextAppState == "active") {
		runWifiCheck()
	}
})

export const isOnline = (): boolean => {
	return info.online
}

export const networkState = async () => {
	return Network.getNetworkStateAsync()
}

export const isWifi = (): boolean => {
	return info.wifi
}
