import { memo, useRef, useCallback, useMemo } from "react"
import { View, TouchableOpacity, Platform, ScrollView } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import Item from "./item"
import { chunkArray } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { translateMemoized } from "@/lib/i18n"
import { useColorScheme } from "@/lib/useColorScheme"
import { useRouter } from "expo-router"
import useViewLayout from "@/hooks/useViewLayout"

export const Container = memo(
	({
		items,
		type
	}: {
		items: DriveCloudItem[]
		type: "recents" | "favorites" | "links" | "sharedIn" | "sharedOut" | "offline" | "trash"
	}) => {
		const { colors } = useColorScheme()
		const viewRef = useRef<View>(null)
		const { push } = useRouter()
		const { layout, onLayout } = useViewLayout(viewRef)

		const onPress = useCallback(() => {
			if (type === "recents") {
				push({
					pathname: "/(app)/home/recents"
				})

				return
			}

			if (type === "offline") {
				push({
					pathname: "/(app)/home/offline/[uuid]",
					params: {
						uuid: "offline"
					}
				})

				return
			}

			if (type === "links") {
				push({
					pathname: "/(app)/home/links/[uuid]",
					params: {
						uuid: "links"
					}
				})

				return
			}

			if (type === "favorites") {
				push({
					pathname: "/(app)/home/favorites/[uuid]",
					params: {
						uuid: "favorites"
					}
				})

				return
			}

			if (type === "sharedIn") {
				push({
					pathname: "/(app)/home/sharedIn/[uuid]",
					params: {
						uuid: "shared-in"
					}
				})

				return
			}

			if (type === "sharedOut") {
				push({
					pathname: "/(app)/home/sharedOut/[uuid]",
					params: {
						uuid: "shared-out",
						receiverId: 0
					}
				})

				return
			}

			if (type === "trash") {
				push({
					pathname: "/(app)/home/trash"
				})

				return
			}
		}, [push, type])

		const title = useMemo(() => {
			switch (type) {
				case "recents": {
					return translateMemoized("home.container.recents.title")
				}

				case "favorites": {
					return translateMemoized("home.container.favorites.title")
				}

				case "links": {
					return translateMemoized("home.container.links.title")
				}

				case "sharedIn": {
					return translateMemoized("home.container.sharedIn.title")
				}

				case "sharedOut": {
					return translateMemoized("home.container.sharedOut.title")
				}

				case "offline": {
					return translateMemoized("home.container.offline.title")
				}

				case "trash": {
					return translateMemoized("home.container.trash.title")
				}
			}
		}, [type])

		const snapToOffsets = useMemo(() => {
			return [0, layout.width - 32, (layout.width - 32) * 2, (layout.width - 32) * 3]
		}, [layout.width])

		const iconSize = useMemo(() => {
			return Platform.select({
				ios: 20,
				default: 26
			})
		}, [])

		const scrollItems = useMemo(() => {
			return chunkArray(items, 3).map((chunk, index) => {
				return (
					<View
						key={index.toString()}
						className="flex-1 flex-col pr-4"
						style={{
							width: Math.floor(layout.width - 32)
						}}
					>
						{chunk.map((item, index) => (
							<Item
								key={index}
								item={item}
								type={type}
								items={items}
								index={index}
							/>
						))}
					</View>
				)
			})
		}, [items, layout.width, type])

		const emptyText = useMemo(() => {
			return type === "recents"
				? translateMemoized("home.listEmpty.recents")
				: type === "favorites"
				? translateMemoized("home.listEmpty.favorites")
				: type === "links"
				? translateMemoized("home.listEmpty.links")
				: type === "sharedIn"
				? translateMemoized("home.listEmpty.sharedIn")
				: type === "sharedOut"
				? translateMemoized("home.listEmpty.sharedOut")
				: type === "offline"
				? translateMemoized("home.listEmpty.offline")
				: type === "trash"
				? translateMemoized("home.listEmpty.trash")
				: ""
		}, [type])

		return (
			<View
				className="flex-1 mb-10"
				onLayout={onLayout}
				ref={viewRef}
			>
				<TouchableOpacity
					className="flex-1 flex-row items-center px-4"
					onPress={onPress}
				>
					<Text
						className="text-xl font-bold"
						numberOfLines={1}
					>
						{title}
					</Text>
					<View className="flex-row items-center pt-0.5">
						<Icon
							name="chevron-right"
							size={iconSize}
							color={colors.grey2}
						/>
					</View>
				</TouchableOpacity>
				<ScrollView
					className="flex-1"
					horizontal={true}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
					pagingEnabled={true}
					decelerationRate="fast"
					overScrollMode="never"
					contentContainerClassName="pt-1"
					snapToOffsets={snapToOffsets}
					snapToAlignment="start"
					contentInsetAdjustmentBehavior="automatic"
				>
					{scrollItems.length > 0 ? (
						scrollItems
					) : (
						<View className="px-4 py-4 pt-1">
							<Text className="font-normal text-muted-foreground text-sm">{emptyText}</Text>
						</View>
					)}
				</ScrollView>
			</View>
		)
	}
)

Container.displayName = "Container"

export default Container
