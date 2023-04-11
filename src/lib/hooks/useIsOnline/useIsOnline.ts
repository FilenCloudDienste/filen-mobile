import { useEffect, useState, useCallback } from "react"
import { isOnline } from "../../services/isOnline"

const useIsOnline = (): boolean => {
	const [data, setData] = useState<boolean>(true)

	const update = useCallback(() => {
		;(async () => {
			setData(await isOnline())
		})()
	}, [])

	useEffect(() => {
		update()

		const interval = setInterval(update, 5000)

		return () => {
			clearInterval(interval)
		}
	}, [])

	return data
}

export default useIsOnline
