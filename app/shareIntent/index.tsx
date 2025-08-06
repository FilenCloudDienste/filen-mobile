import { View, Platform } from "react-native"
import { Stack } from "expo-router"
import { useShareIntentContext, type ShareIntentFile } from "expo-share-intent"
import { useMemo, useCallback, memo } from "react"
import { Text } from "@/components/nativewindui/Text"
import TurboImage from "react-native-turbo-image"
import { getPreviewType, formatBytes } from "@/lib/utils"
import driveService from "@/services/drive.service"
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
import useDimensions from "@/hooks/useDimensions"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import upload from "@/lib/upload"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	item: ShareIntentFile
}

export const ICON_HEIGHT: number = 42

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()

	const leftView = useMemo(() => {
		return (
			<View className="flex-row items-center px-4">
				{getPreviewType(info.item.item.fileName) === "image" ? (
					<TurboImage
						source={{
							uri: info.item.item.path
						}}
						className="w-full h-full rounded-md"
						resizeMode="contain"
						cachePolicy="dataCache"
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
		)
	}, [info.item.item.fileName, info.item.item.path, colors.background])

	return (
		<ListItem
			{...info}
			item={info.item}
			leftView={leftView}
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-3 py-3 android:py-3"
		/>
	)
})

Item.displayName = "Item"

export default function ShareIntent() {
	const { shareIntent, resetShareIntent } = useShareIntentContext()
	const { screen } = useDimensions()
	const { t } = useTranslation()

	const items = useMemo(() => {
		return (
			shareIntent.files?.map(file => ({
				title: file.fileName,
				subTitle: formatBytes(file.size ?? 0),
				id: file.path,
				item: file
			})) ?? []
		)
	}, [shareIntent.files])

	const onPress = useCallback(async () => {
		if (!shareIntent.files || items.length === 0) {
			return
		}

		const selectDriveItemsResponse = await driveService.selectDriveItems({
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

					const tmpFile = new FileSystem.File(
						FileSystem.Paths.join(paths.temporaryUploads(), `${randomUUID()}${FileSystem.Paths.extname(file.fileName)}`)
					)

					try {
						fsFile.copy(tmpFile)

						if (!tmpFile.exists) {
							throw new Error("Failed to copy file to temporary location.")
						}

						await upload.file.foreground({
							parent,
							localPath: tmpFile.uri,
							name: file.fileName,
							id: randomUUID(),
							size: tmpFile.size ?? 0,
							isShared: false,
							deleteAfterUpload: true
						})
					} finally {
						if (tmpFile.exists) {
							tmpFile.delete()
						}

						if (Platform.OS === "ios" && fsFile.exists) {
							fsFile.delete()
						}
					}
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
	}, [shareIntent.files, resetShareIntent, items.length])

	const cancel = useCallback(() => {
		resetShareIntent()
	}, [resetShareIntent])

	const headerRight = useCallback(() => {
		if (items.length === 0) {
			return undefined
		}

		return (
			<Button
				size="none"
				variant="plain"
				onPress={onPress}
			>
				<Text className="text-primary font-normal">{t("shareIntent.header.upload")}</Text>
			</Button>
		)
	}, [onPress, t, items.length])

	const headerLeft = useCallback(() => {
		return (
			<Button
				size="none"
				variant="plain"
				onPress={cancel}
			>
				<Text className="text-primary font-normal">{t("shareIntent.header.cancel")}</Text>
			</Button>
		)
	}, [cancel, t])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: t("shareIntent.header.title"),
						headerBackVisible: false,
						headerRight,
						headerLeft
					}}
				/>
			),
			default: (
				<LargeTitleHeader
					title={t("shareIntent.header.title")}
					materialPreset="inline"
					backVisible={false}
					rightView={headerRight}
					leftView={headerLeft}
				/>
			)
		})
	}, [headerRight, headerLeft, t])

	const keyExtractor = useCallback((item: ListItemInfo) => {
		return item.id
	}, [])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

	const getItemLayout = useCallback((_: ArrayLike<ListItemInfo> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					data={items}
					variant="full-width"
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					contentInsetAdjustmentBehavior="automatic"
					removeClippedSubviews={true}
					initialNumToRender={initialNumToRender}
					maxToRenderPerBatch={maxToRenderPerBatch}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={getItemLayout}
				/>
			</Container>
		</RequireInternet>
	)
}
