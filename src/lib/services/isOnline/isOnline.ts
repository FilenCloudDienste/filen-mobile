import * as Network from "expo-network"
import { Semaphore } from "../../../lib/helpers"

const mutex = new Semaphore(1)

export const isOnline = async (): Promise<boolean> => {
	await mutex.acquire()

	try {
		const state = await Network.getNetworkStateAsync()

		return state.isInternetReachable && state.isConnected
	} catch (e) {
		console.error(e)

		return true
	} finally {
		mutex.release()
	}
}

export const networkState = async (): Promise<Network.NetworkState> => {
	await mutex.acquire()

	try {
		return await Network.getNetworkStateAsync()
	} finally {
		mutex.release()
	}
}

export const isWifi = async (): Promise<boolean> => {
	await mutex.acquire()

	try {
		const state = await Network.getNetworkStateAsync()

		return (
			state.type === Network.NetworkStateType.WIFI ||
			state.type === Network.NetworkStateType.VPN ||
			state.type === Network.NetworkStateType.ETHERNET ||
			state.type === Network.NetworkStateType.BLUETOOTH ||
			state.type === Network.NetworkStateType.WIMAX
		)
	} catch (e) {
		console.error(e)

		return true
	} finally {
		mutex.release()
	}
}
