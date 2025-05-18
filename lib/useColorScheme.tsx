import { useColorScheme as useNativewindColorScheme } from "nativewind"
import { useCallback } from "react"
import { COLORS } from "@/theme/colors"

export function useColorScheme() {
	const { colorScheme, setColorScheme: setNativeWindColorScheme } = useNativewindColorScheme()

	const setColorScheme = useCallback(
		async (colorScheme: "light" | "dark") => {
			try {
				setNativeWindColorScheme(colorScheme)
			} catch (e) {
				console.error("useColorScheme.tsx", "setColorScheme", e)
			}
		},
		[setNativeWindColorScheme]
	)

	const toggleColorScheme = useCallback(() => {
		return setColorScheme(colorScheme === "light" ? "dark" : "light")
	}, [colorScheme, setColorScheme])

	return {
		colorScheme: colorScheme ?? "light",
		isDarkColorScheme: colorScheme === "dark",
		setColorScheme,
		toggleColorScheme,
		colors: COLORS[(colorScheme ?? "light") as "dark" | "light"]
	}
}
