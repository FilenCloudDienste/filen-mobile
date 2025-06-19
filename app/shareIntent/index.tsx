import { View, Platform } from "react-native"
import { Stack } from "expo-router"
import { useShareIntentContext, type ShareIntentFile } from "expo-share-intent"
import { Fragment, useMemo, useCallback, memo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { Image } from "expo-image"
import { getPreviewType, formatBytes } from "@/lib/utils"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import nodeWorker from "@/lib/nodeWorker"
import { randomUUID } from "expo-crypto"
import * as FileSystem from "expo-file-system/next"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { Button } from "@/components/nativewindui/Button"
import { FileNameToSVGIcon } from "@/assets/fileIcons"
import { List, type ListRenderItemInfo, ListItem } from "@/components/nativewindui/List"
import { useColorScheme } from "@/lib/useColorScheme"
import Container from "@/components/Container"
import paths from "@/lib/paths"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: ShareIntentFile
}

export const ICON_HEIGHT: number = 42

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()

	return (
		<ListItem
			{...info}
			item={info.item}
			leftView={
				<View className="flex-row items-center px-4">
					{getPreviewType(info.item.item.fileName) === "image" ? (
						<Image
							source={{
								uri: info.item.item.path
							}}
							className="w-full h-full rounded-md"
							contentFit="contain"
							style={{
								width: ICON_HEIGHT,
								height: ICON_HEIGHT,
								borderRadius: 6,
								backgroundColor: colors.background
							}}
						/>
					) : (
						<FileNameToSVGIcon
							name={info.item.item.fileName}
							width={ICON_HEIGHT}
							height={ICON_HEIGHT}
						/>
					)}
				</View>
			}
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
		/>
	)
})

Item.displayName = "Item"

export default function ShareIntent() {
	const { shareIntent, resetShareIntent } = useShareIntentContext()

	const upload = useCallback(async () => {
		if (!shareIntent.files) {
			return
		}

		const selectDriveItemsResponse = await selectDriveItems({
			type: "directory",
			max: 1,
			dismissHref: "/shareIntent"
		})

		if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
			return
		}

		const parent = selectDriveItemsResponse.items.at(0)?.uuid

		if (!parent) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await Promise.all(
				shareIntent.files.map(async file => {
					const fsFile = new FileSystem.File(file.path)

					if (!fsFile.exists) {
						return
					}

					let source: FileSystem.File = fsFile

					// Android requires a temporary copy of the file to be uploaded, on iOS the Share Intent provides a temporary file
					if (Platform.OS === "android") {
						const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

						fsFile.copy(tmpFile)

						if (!tmpFile.exists) {
							throw new Error("Failed to copy file to temporary location.")
						}

						source = tmpFile
					}

					await nodeWorker.proxy("uploadFile", {
						parent,
						localPath: source.uri,
						name: file.fileName,
						id: randomUUID(),
						size: source.size ?? 0,
						isShared: false,
						deleteAfterUpload: true
					})
				})
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()

			resetShareIntent()
		}
	}, [shareIntent.files, resetShareIntent])

	const cancel = useCallback(() => {
		resetShareIntent()
	}, [resetShareIntent])

	const headerRight = useCallback(() => {
		return (
			<Button
				size="none"
				variant="plain"
				onPress={upload}
			>
				<Text className="text-primary font-normal">Upload</Text>
			</Button>
		)
	}, [upload])

	const headerLeft = useCallback(() => {
		return (
			<Button
				size="none"
				variant="plain"
				onPress={cancel}
			>
				<Text className="text-primary font-normal">Cancel</Text>
			</Button>
		)
	}, [cancel])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: "Save to Filen",
						headerBackVisible: false,
						headerRight,
						headerLeft
					}}
				/>
			),
			default: (
				<LargeTitleHeader
					title="Save to Filen"
					materialPreset="inline"
					backVisible={false}
					rightView={headerRight}
					leftView={headerLeft}
				/>
			)
		})
	}, [headerRight, headerLeft])

	return (
		<Fragment>
			{header}
			<Container>
				<List
					data={
						shareIntent.files?.map(file => ({
							title: file.fileName,
							subTitle: formatBytes(file.size ?? 0),
							id: file.path,
							item: file
						})) ?? []
					}
					variant="full-width"
					renderItem={renderItem}
					keyExtractor={item => item.item.path}
					contentInsetAdjustmentBehavior="automatic"
				/>
			</Container>
		</Fragment>
	)
}
