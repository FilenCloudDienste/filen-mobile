import { memo, Fragment, useCallback, useMemo } from "react"
import { ListItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { View, ActivityIndicator, Platform } from "react-native"
import { ColoredFolderSVGIcon, FileNameToSVGIcon } from "@/assets/fileIcons"
import { Text } from "@/components/nativewindui/Text"
import { normalizeTransferProgress } from "@/lib/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { useActionSheet } from "@expo/react-native-action-sheet"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import useDimensions from "@/hooks/useDimensions"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	transfer: Transfer
}

export const ICON_HEIGHT: number = 42

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export const Transfer = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()
	const { showActionSheetWithOptions } = useActionSheet()
	const {
		insets: { bottom: bottomInsets }
	} = useDimensions()

	const onPress = useCallback(() => {
		if (info.item.transfer.state === "finished" || info.item.transfer.state === "error") {
			return
		}

		const options = [info.item.transfer.state === "paused" ? "Resume" : "Pause", "Stop", "Cancel"]

		showActionSheetWithOptions(
			{
				options,
				cancelButtonIndex: options.length - 1,
				destructiveButtonIndex: options.length - 1,
				...(Platform.OS === "android"
					? {
							containerStyle: {
								paddingBottom: bottomInsets,
								backgroundColor: colors.card
							},
							textStyle: {
								color: colors.foreground
							}
					  }
					: {})
			},
			async buttonIndex => {
				const progressNormalized = normalizeTransferProgress(info.item.transfer.size, info.item.transfer.bytes)

				try {
					if (buttonIndex === 0 && progressNormalized <= 95) {
						await nodeWorker.proxy("transferAction", {
							action: info.item.transfer.state === "paused" ? "resume" : "pause",
							id: info.item.transfer.id
						})
					} else if (buttonIndex === 1 && progressNormalized <= 95) {
						await nodeWorker.proxy("transferAction", {
							action: "stop",
							id: info.item.transfer.id
						})
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			}
		)
	}, [
		showActionSheetWithOptions,
		info.item.transfer.id,
		info.item.transfer.size,
		info.item.transfer.bytes,
		info.item.transfer.state,
		bottomInsets,
		colors.foreground,
		colors.card
	])

	const leftView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center px-4">
				{info.item.transfer.itemType === "directory" ? (
					<ColoredFolderSVGIcon
						width={ICON_HEIGHT}
						height={ICON_HEIGHT}
					/>
				) : (
					<FileNameToSVGIcon
						name={info.item.transfer.name}
						width={ICON_HEIGHT}
						height={ICON_HEIGHT}
					/>
				)}
			</View>
		)
	}, [info.item.transfer.itemType, info.item.transfer.name])

	const rightView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center px-4 gap-4">
				{info.item.transfer.state === "started" ? (
					<Fragment>
						<Text>{normalizeTransferProgress(info.item.transfer.size, info.item.transfer.bytes)}%</Text>
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					</Fragment>
				) : info.item.transfer.state === "finished" ? (
					<Icon
						name="check-circle-outline"
						color={colors.primary}
						size={24}
					/>
				) : info.item.transfer.state === "error" ? (
					<Icon
						name="exclamation"
						color={colors.destructive}
						size={24}
					/>
				) : info.item.transfer.state === "paused" ? (
					<Icon
						name="pause"
						color={colors.primary}
						size={24}
					/>
				) : info.item.transfer.state === "queued" ? (
					<ActivityIndicator
						color={colors.foreground}
						size="small"
					/>
				) : info.item.transfer.state === "stopped" ? (
					<Icon
						name="stop"
						color={colors.destructive}
						size={24}
					/>
				) : null}
			</View>
		)
	}, [info.item.transfer.state, info.item.transfer.size, info.item.transfer.bytes, colors.foreground, colors.primary, colors.destructive])

	return (
		<ListItem
			className="overflow-hidden"
			{...info}
			onPress={onPress}
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
			leftView={leftView}
			rightView={rightView}
		/>
	)
})

Transfer.displayName = "Transfer"

export default Transfer
