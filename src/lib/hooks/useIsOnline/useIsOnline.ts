import { useEffect, useState } from "react"
import { DeviceEventEmitter } from "react-native"
import { isOnline } from "../../services/isOnline"

const useIsOnline = (): boolean => {
    const [data, setData] = useState<boolean>(isOnline())

	useEffect(() => {
		const listener = ({ online, wifi }: { online: boolean, wifi: boolean }) => {
			setData(online)
		}

		DeviceEventEmitter.addListener("networkInfoChange", listener)

		return () => {
			DeviceEventEmitter.removeListener("networkInfoChange", listener)
		}
	}, [])

	return data
}

export default useIsOnline