import { memo, useEffect, useRef } from "react"
import { formatMessageDate } from "@/lib/utils"
import { AppState } from "react-native"
import { useRecyclingState } from "@shopify/flash-list"

export const Date = memo(({ timestamp, uuid }: { timestamp: number; uuid: string }) => {
	const [date, setDate] = useRecyclingState<string>(formatMessageDate(timestamp), [uuid])
	const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

	useEffect(() => {
		intervalRef.current = setInterval(() => {
			setDate(formatMessageDate(timestamp))
		}, 60000)

		const appStateListener = AppState.addEventListener("change", nextAppState => {
			clearInterval(intervalRef.current)

			if (nextAppState === "active") {
				setDate(formatMessageDate(timestamp))

				intervalRef.current = setInterval(() => {
					setDate(formatMessageDate(timestamp))
				}, 60000)
			}
		})

		return () => {
			appStateListener.remove()

			clearInterval(intervalRef.current)
		}
	}, [timestamp, setDate])

	return date
})

Date.displayName = "Date"

export default Date
