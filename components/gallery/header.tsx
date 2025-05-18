import { memo, useMemo } from "react"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type GalleryItem, useGalleryStore } from "@/stores/gallery.store"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"
import { useShallow } from "zustand/shallow"

export const Header = memo(({ items, show }: { items: GalleryItem[]; show: boolean }) => {
	const insets = useSafeAreaInsets()
	const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
	const { colors } = useColorScheme()

	const currentItem = useMemo(() => {
		return typeof currentVisibleIndex === "number" ? items.at(currentVisibleIndex) : null
	}, [currentVisibleIndex, items])

	if (!currentItem || !show || currentItem.itemType !== "cloudItem") {
		return null
	}

	return (
		<Animated.View
			entering={FadeInUp}
			exiting={FadeOutUp}
			className="flex-row items-center h-auto w-full absolute z-50 bg-background"
			style={{
				paddingTop: insets.top
			}}
		>
			<View className="flex-1 flex-row items-center w-full h-14 px-4 justify-between gap-4">
				<Text
					numberOfLines={1}
					className="flex-1 text-foreground"
				>
					{currentItem.data.name}
				</Text>
				<Button
					variant="plain"
					size="icon"
				>
					<Icon
						name="dots-horizontal-circle-outline"
						size={24}
						color={colors.foreground}
					/>
				</Button>
			</View>
		</Animated.View>
	)
})

Header.displayName = "Header"

export default Header
