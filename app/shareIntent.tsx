import { View, Platform } from "react-native"
import { Stack } from "expo-router"
import { useShareIntentContext } from "expo-share-intent"
import { Fragment, useMemo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { Image } from "expo-image"
import { getPreviewType } from "@/lib/utils"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import { selectDriveItems } from "./selectDriveItems/[parent]"
import nodeWorker from "@/lib/nodeWorker"
import { randomUUID } from "expo-crypto"
import * as FileSystem from "expo-file-system/next"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { FlashList } from "@shopify/flash-list"

export default function ShareIntent() {
	const { shareIntent, resetShareIntent } = useShareIntentContext()

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: "Save to Filen",
						headerBackVisible: false
					}}
				/>
			),
			default: (
				<Fragment>
					<Stack.Screen
						options={{
							headerShown: false
						}}
					/>
					<LargeTitleHeader
						title="Save to Filen"
						materialPreset="inline"
						backVisible={false}
					/>
				</Fragment>
			)
		})
	}, [])

	return (
		<Fragment>
			{header}
			<View className="flex-1">
				<View className="flex-1 flex-col pt-2">
					<Text className="px-4">{shareIntent.files?.length} files</Text>
					<View className="flex-row flex-1 h-16 mt-4">
						<FlashList
							data={shareIntent.files ?? []}
							horizontal={true}
							showsHorizontalScrollIndicator={false}
							showsVerticalScrollIndicator={false}
							contentContainerClassName="px-4 gap-2"
							renderItem={item => {
								return (
									<View className="w-16 h-16 bg-card rounded-md flex-row items-center justify-center">
										{getPreviewType(item.item.fileName) === "image" ? (
											<Image
												source={{
													uri: item.item.path
												}}
												className="w-full h-full rounded-md"
												contentFit="cover"
												style={{
													width: "100%",
													height: "100%",
													borderRadius: 6
												}}
											/>
										) : (
											<Text>{item.item.fileName}</Text>
										)}
									</View>
								)
							}}
						/>
					</View>
				</View>
				<Toolbar
					iosBlurIntensity={100}
					leftView={
						<ToolbarIcon
							icon={{
								name: "close"
							}}
							onPress={() => {
								resetShareIntent()
							}}
						/>
					}
					rightView={
						<ToolbarCTA
							icon={{
								name: "check-circle-outline"
							}}
							onPress={async () => {
								if (!shareIntent.files) {
									return
								}

								const selectDriveItemsResponse = await selectDriveItems({
									type: "directory",
									max: 1,
									dismissHref: "/shareIntent"
								})

								console.log({ selectDriveItemsResponse })

								if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
									return
								}

								const parent = selectDriveItemsResponse.items.at(0)?.uuid

								if (!parent) {
									return
								}

								Promise.all(
									shareIntent.files.map(async file => {
										const fsFile = new FileSystem.File(file.path)

										if (!fsFile.exists) {
											return
										}

										const size = file.size ?? fsFile.size

										if (!size) {
											return
										}

										await nodeWorker.proxy("uploadFile", {
											parent,
											localPath: file.path,
											name: file.fileName,
											id: randomUUID(),
											size,
											isShared: false,
											deleteAfterUpload: Platform.OS === "ios"
										})
									})
								).catch(console.error)

								resetShareIntent()
							}}
						/>
					}
				/>
			</View>
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
