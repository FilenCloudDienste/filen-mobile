import { memo, useRef, useLayoutEffect, useMemo, useCallback } from "react"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useGalleryStore } from "@/stores/gallery.store"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Button } from "@/components/nativewindui/Button"
import { BlurView } from "expo-blur"
import { cn } from "@/lib/cn"
import useViewLayout from "@/hooks/useViewLayout"
import Menu from "../drive/list/listItem/menu"
import Container from "../Container"
import { useShallow } from "zustand/shallow"

export const Header = memo(() => {
	const insets = useSafeAreaInsets()
	const { colors } = useColorScheme()
	const viewRef = useRef<Animated.View>(null)
	const { onLayout, layout } = useViewLayout(viewRef)
	const currentVisibleIndex = useGalleryStore(useShallow(state => state.currentVisibleIndex))
	const visible = useGalleryStore(useShallow(state => state.visible))
	const showHeader = useGalleryStore(useShallow(state => state.showHeader))
	const items = useGalleryStore(useShallow(state => state.items))

	const item = useMemo(() => {
		if (!visible || currentVisibleIndex === null || currentVisibleIndex < 0) {
			return null
		}

		const foundItem = items.at(currentVisibleIndex)

		if (!foundItem) {
			return null
		}

		return foundItem
	}, [currentVisibleIndex, items, visible])

	const show = useMemo(() => {
		return !item || !visible ? false : item.previewType === "image" ? showHeader : true
	}, [item, showHeader, visible])

	const title = useMemo(() => {
		if (!item || item.itemType === "remoteItem") {
			return null
		}

		if (item.itemType === "cloudItem") {
			return item.data.item.name
		}

		return null
	}, [item])

	const back = useCallback(() => {
		useGalleryStore.getState().reset()
	}, [])

	useLayoutEffect(() => {
		useGalleryStore.getState().setHeaderHeight(layout.height)
	}, [layout.height])

	if (!item || (!show && item.previewType !== "audio" && item.previewType !== "video")) {
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
					<Button
						variant="plain"
						size="icon"
						className={cn("shrink-0", Platform.OS === "ios" && "-ml-4")}
						onPress={back}
					>
						<Icon
							namingScheme="sfSymbol"
							name="arrow.left"
							ios={{
								name: "chevron.backward"
							}}
							size={24}
							color={Platform.select({
								ios: colors.primary,
								default: colors.foreground
							})}
						/>
					</Button>
					<Text
						numberOfLines={1}
						className="text-foreground shrink"
					>
						{title}
					</Text>
					{item.itemType === "cloudItem" && (
						<Menu
							type="dropdown"
							item={item.data.item}
							queryParams={item.data.queryParams}
							fromPreview={true}
						>
							<Button
								variant="plain"
								size="icon"
								className="shrink-0"
							>
								<Icon
									namingScheme="sfSymbol"
									name="ellipsis"
									ios={{
										name: "ellipsis.circle"
									}}
									size={24}
									color={colors.primary}
								/>
							</Button>
						</Menu>
					)}
				</Container>
			</BlurView>
		</Animated.View>
	)
})

Header.displayName = "Header"

export default Header
