import { DeviceEventEmitter } from "react-native"

const eventListener = {
	on: (name: string, listener: (data?: unknown) => void) => {
		const subscription = DeviceEventEmitter.addListener(name, listener)

		return {
			remove: () => {
				subscription.remove()
			}
		}
	},
	emit: (name: string, data?: unknown) => {
		DeviceEventEmitter.emit(name, data)
	}
}

export default eventListener
