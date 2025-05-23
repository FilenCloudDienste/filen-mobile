import { memo, useEffect, useState, useRef } from "react"
import { formatMessageDate } from "@/lib/utils"
import { AppState } from "react-native"

export const Date = memo(({ timestamp }: { timestamp: number }) => {
	const [date, setDate] = useState<string>(formatMessageDate(timestamp))
	const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

	useEffect(() => {
		intervalRef.current = setInterval(() => {
			setDate(formatMessageDate(timestamp))
		}, 15000)

		const appStateListener = AppState.addEventListener("change", nextAppState => {
			clearInterval(intervalRef.current)

			if (nextAppState === "active") {
				setDate(formatMessageDate(timestamp))

				intervalRef.current = setInterval(() => {
					setDate(formatMessageDate(timestamp))
				}, 15000)
			}
		})

		return () => {
			appStateListener.remove()

			clearInterval(intervalRef.current)
		}
	}, [timestamp])

	return date
})

Date.displayName = "Date"

export default Date
