import { memo, useMemo } from "react"
import { useSafeAreaInsets, type SafeAreaViewProps, type Edge } from "react-native-safe-area-context"
import { View, type StyleProp, type ViewStyle } from "react-native"

export const Container = memo(
	({
		children,
		viewProps,
		className,
		edges = ["left", "right"]
	}: {
		children: React.ReactNode
		viewProps?: SafeAreaViewProps
		className?: string
		edges?: Edge[]
	}) => {
		const insets = useSafeAreaInsets()

		const style = useMemo(() => {
			const style: StyleProp<ViewStyle> = {
				flex: 1
			}

			if (edges.includes("top")) {
				style.paddingTop = insets.top
			}

			if (edges.includes("bottom")) {
				style.paddingBottom = insets.bottom
			}

			if (edges.includes("left")) {
				style.paddingLeft = insets.left
			}

			if (edges.includes("right")) {
				style.paddingRight = insets.right
			}

			return style
		}, [edges, insets])

		return (
			<View
				style={style}
				className={className}
				{...viewProps}
			>
				{children}
			</View>
		)
	}
)

Container.displayName = "Container"

export default Container
