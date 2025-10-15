import { memo, useCallback } from "react"
import type { GestureResponderEvent } from "react-native"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"

export const Fallback = memo(({ link }: { link: string }) => {
	const onPress = useCallback(
		async (e: GestureResponderEvent) => {
			try {
				e.preventDefault()
				e.stopPropagation()

				if (!(await Linking.canOpenURL(link))) {
					alerts.error("Cannot open this link.")

					return
				}

				await Linking.openURL(link)
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[link]
	)

	return (
		<Button
			variant="plain"
			size="none"
			unstable_pressDelay={100}
			android_ripple={null}
			className="active:opacity-70"
			onPress={onPress}
		>
			<Text className="font-normal text-sm text-blue-500 flex-wrap text-wrap items-center break-all">{link}</Text>
		</Button>
	)
})

Fallback.displayName = "Fallback"

export default Fallback
