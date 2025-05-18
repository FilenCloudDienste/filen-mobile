import { Icon } from "@roninoss/icons"
import { Pressable, View } from "react-native"
import Animated, { LayoutAnimationConfig, ZoomInRotate } from "react-native-reanimated"
import { cn } from "@/lib/cn"
import { useColorScheme } from "@/lib/useColorScheme"
import { COLORS } from "@/theme/colors"
import { memo, useCallback } from "react"

export const ThemeToggle = memo(() => {
	const { colorScheme, setColorScheme } = useColorScheme()

	const onPress = useCallback(() => {
		setColorScheme(colorScheme === "dark" ? "light" : "dark")
	}, [setColorScheme, colorScheme])

	return (
		<LayoutAnimationConfig skipEntering>
			<Animated.View
				className="items-center justify-center"
				key={"toggle-" + colorScheme}
				entering={ZoomInRotate}
			>
				<Pressable
					onPress={onPress}
					className="opacity-80"
				>
					{colorScheme === "dark"
						? ({ pressed }) => (
								<View className={cn("px-0.5", pressed && "opacity-50")}>
									<Icon
										namingScheme="sfSymbol"
										name="moon.stars"
										color={COLORS.white}
									/>
								</View>
						  )
						: ({ pressed }) => (
								<View className={cn("px-0.5", pressed && "opacity-50")}>
									<Icon
										namingScheme="sfSymbol"
										name="sun.min"
										color={COLORS.black}
									/>
								</View>
						  )}
				</Pressable>
			</Animated.View>
		</LayoutAnimationConfig>
	)
})

ThemeToggle.displayName = "ThemeToggle"
