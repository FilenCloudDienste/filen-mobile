import { useEffect, useState } from "react"
import { isOnline } from "../../services/isOnline"

const useIsOnline = (): boolean => {
	const [data, setData] = useState<boolean>(true)

	useEffect(() => {
		const interval = setInterval(async () => {
			setData(await isOnline())
		}, 5000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	return data
}

export default useIsOnline
