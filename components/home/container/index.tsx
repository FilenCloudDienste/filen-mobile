import { memo, useRef, useCallback, useMemo } from "react"
import { View, TouchableOpacity, Platform, FlatList } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import Item from "./item"
import { chunkArray } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { useTranslation } from "react-i18next"
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
		const { t } = useTranslation()
		const { colors } = useColorScheme()
		const viewRef = useRef<View>(null)
		const { push } = useRouter()
		const { layout, onLayout } = useViewLayout(viewRef)

		const onPress = useCallback(() => {
			if (type === "favorites") {
				push({
					pathname: "/home/favorites"
				})

				return
			}

			if (type === "recents") {
				push({
					pathname: "/home/recents"
				})

				return
			}

			if (type === "offline") {
				push({
					pathname: "/home/offline/[uuid]",
					params: {
						uuid: "offline"
					}
				})

				return
			}

			if (type === "links") {
				push({
					pathname: "/home/links/[uuid]",
					params: {
						uuid: "links"
					}
				})

				return
			}

			if (type === "sharedIn") {
				push({
					pathname: "/home/sharedIn/[uuid]",
					params: {
						uuid: "shared-in"
					}
				})

				return
			}

			if (type === "sharedOut") {
				push({
					pathname: "/home/sharedOut/[uuid]",
					params: {
						uuid: "shared-out",
						receiverId: 0
					}
				})

				return
			}

			if (type === "trash") {
				push({
					pathname: "/home/trash"
				})

				return
			}
		}, [push, type])

		const title = useMemo(() => {
			switch (type) {
				case "recents":
					return t("home.container.recents.title")
				case "favorites":
					return t("home.container.favorites.title")
				case "links":
					return t("home.container.links.title")
				case "sharedIn":
					return t("home.container.sharedIn.title")
				case "sharedOut":
					return t("home.container.sharedOut.title")
				case "offline":
					return t("home.container.offline.title")
				case "trash":
					return t("home.container.trash.title")
			}
		}, [t, type])

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
							size={Platform.select({
								ios: 20,
								default: 26
							})}
							color={colors.grey2}
						/>
					</View>
				</TouchableOpacity>
				<FlatList
					data={chunkArray(items, 3)}
					className="flex-1"
					horizontal={true}
					showsHorizontalScrollIndicator={false}
					showsVerticalScrollIndicator={false}
					pagingEnabled={true}
					decelerationRate="fast"
					overScrollMode="never"
					keyExtractor={(_, index) => index.toString()}
					contentContainerClassName="px-4 pt-1"
					snapToOffsets={[0, layout.width - 32, layout.width * 2 - 64, layout.width * 3 - 64]}
					snapToAlignment="start"
					contentInsetAdjustmentBehavior="automatic"
					ListEmptyComponent={
						<View className="flex-1 items-center justify-center">
							<Text className="text-muted-foreground text-sm">No items found</Text>
						</View>
					}
					renderItem={chunk => {
						return (
							<View
								className="flex-1 flex-col pr-4"
								style={{
									width: Math.floor(layout.width - 32)
								}}
							>
								{chunk.item.map((item, index) => (
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
					}}
				/>
			</View>
		)
	}
)

Container.displayName = "Container"

export default Container
