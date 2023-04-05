import { useEffect, useState } from "react"
import { DeviceEventEmitter } from "react-native"
import { isOnline } from "../../services/isOnline"

const useIsOnline = (): boolean => {
	const [data, setData] = useState<boolean>(isOnline())

	useEffect(() => {
		const listener = DeviceEventEmitter.addListener(
			"networkInfoChange",
			({ online, wifi }: { online: boolean; wifi: boolean }) => {
				setData(online)
			}
		)

		return () => {
			listener.remove()
		}
	}, [])

	return data
}

export default useIsOnline
