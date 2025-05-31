import { memo, useRef, useLayoutEffect, useMemo } from "react"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { type GalleryItem } from "@/stores/gallery.store"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"
import { BlurView } from "expo-blur"
import { cn } from "@/lib/cn"
import useViewLayout from "@/hooks/useViewLayout"
import Menu from "../drive/list/listItem/menu"
import useFileOfflineStatusQuery from "@/queries/useFileOfflineStatusQuery"
import Container from "../Container"

export const Header = memo(
	({
		item,
		show,
		setHeaderHeight
	}: {
		item: GalleryItem
		show: boolean
		setHeaderHeight: React.Dispatch<React.SetStateAction<number>>
	}) => {
		const insets = useSafeAreaInsets()
		const { colors } = useColorScheme()
		const viewRef = useRef<Animated.View>(null)
		const { onLayout, layout } = useViewLayout(viewRef)

		const fileOfflineStatus = useFileOfflineStatusQuery({
			uuid: item.itemType === "cloudItem" ? item.data.item.uuid : "",
			enabled: item.itemType === "cloudItem"
		})

		const isAvailableOffline = useMemo(() => {
			return item.itemType === "cloudItem" && fileOfflineStatus.status === "success" ? fileOfflineStatus.data.exists : false
		}, [item.itemType, fileOfflineStatus.status, fileOfflineStatus.data?.exists])

		useLayoutEffect(() => {
			setHeaderHeight(layout.height)
		}, [layout.height, setHeaderHeight])

		if ((!show && item.previewType !== "audio" && item.previewType !== "video") || item.itemType !== "cloudItem") {
			return null
		}

		return (
			<Animated.View
				entering={FadeInUp}
				exiting={FadeOutUp}
				ref={viewRef}
				onLayout={onLayout}
				className="flex-1 absolute top-0 left-0 right-0 z-[1000]"
			>
				<BlurView
					intensity={Platform.OS === "ios" ? 100 : 0}
					tint={Platform.OS === "ios" ? "systemChromeMaterial" : undefined}
					className={cn("flex-1 flex-row items-center w-full px-4 py-2", Platform.OS === "android" && "bg-card")}
					style={{
						paddingTop: insets.top
					}}
				>
					<Container className="flex-1 flex-row items-center w-full justify-between gap-4">
						<Text
							numberOfLines={1}
							className="flex-1 text-foreground"
						>
							{item.data.item.name}
						</Text>
						<Menu
							type="dropdown"
							item={item.data.item}
							queryParams={item.data.queryParams}
							isAvailableOffline={isAvailableOffline}
							insidePreview={true}
						>
							<Button
								variant="plain"
								size="icon"
							>
								<Icon
									name="dots-horizontal-circle-outline"
									size={24}
									color={colors.primary}
								/>
							</Button>
						</Menu>
					</Container>
				</BlurView>
			</Animated.View>
		)
	}
)

Header.displayName = "Header"

export default Header
