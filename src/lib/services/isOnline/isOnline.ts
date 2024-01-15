import * as Network from "expo-network"
import { Semaphore } from "../../../lib/helpers"

const mutex = new Semaphore(1)
const results = new Map()
let isOnlineTimeout = 0
let networkStateTimeout = 0
let isWifiTimeout = 0

export const isOnline = async (): Promise<boolean> => {
	if (results.has("isOnline") && isOnlineTimeout < Date.now()) {
		return results.get("isOnline")
	}

	await mutex.acquire()

	try {
		const state = await Network.getNetworkStateAsync()
		const res = state.isInternetReachable && state.isConnected

		results.set("isOnline", res)
		isOnlineTimeout = Date.now() + 3000

		return res
	} catch (e) {
		console.error(e)

		return true
	} finally {
		mutex.release()
	}
}

export const networkState = async (): Promise<Network.NetworkState> => {
	if (results.has("networkState") && networkStateTimeout < Date.now()) {
		return results.get("networkState")
	}

	await mutex.acquire()

	try {
		const res = await Network.getNetworkStateAsync()

		results.set("networkState", res)
		networkStateTimeout = Date.now() + 3000

		return res
	} catch (e) {
		if (results.has("networkState")) {
			return results.get("networkState")
		}

		throw e
	} finally {
		mutex.release()
	}
}

export const isWifi = async (): Promise<boolean> => {
	if (results.has("isWifi") && isWifiTimeout < Date.now()) {
		return results.get("isWifi")
	}

	await mutex.acquire()

	try {
		const state = await Network.getNetworkStateAsync()
		const res =
			state.type === Network.NetworkStateType.WIFI ||
			state.type === Network.NetworkStateType.VPN ||
			state.type === Network.NetworkStateType.ETHERNET ||
			state.type === Network.NetworkStateType.BLUETOOTH ||
			state.type === Network.NetworkStateType.WIMAX

		results.set("isWifi", res)
		isWifiTimeout = Date.now() + 3000

		return res
	} catch (e) {
		console.error(e)

		return true
	} finally {
		mutex.release()
	}
}
