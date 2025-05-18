import { memo, Fragment, useCallback } from "react"
import { ListItem } from "@/components/nativewindui/List"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { View, ActivityIndicator } from "react-native"
import { ColoredFolderSVGIcon, FileNameToSVGIcon } from "@/assets/fileIcons"
import { Text } from "@/components/nativewindui/Text"
import { normalizeTransferProgress } from "@/lib/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { useActionSheet } from "@expo/react-native-action-sheet"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	transfer: Transfer
}

export const ICON_HEIGHT: number = 42

export const Transfer = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()
	const { showActionSheetWithOptions } = useActionSheet()

	const onPress = useCallback(() => {
		if (
			info.item.transfer.state === "finished" ||
			info.item.transfer.state === "error" ||
			info.item.transfer.state === "stopped" ||
			info.item.transfer.state === "queued"
		) {
			return
		}

		showActionSheetWithOptions(
			{
				options: [info.item.transfer.state === "paused" ? "Resume" : "Pause", "Stop", "Cancel"],
				cancelButtonIndex: 2,
				destructiveButtonIndex: 2
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
	}, [showActionSheetWithOptions, info.item.transfer.id, info.item.transfer.size, info.item.transfer.bytes, info.item.transfer.state])

	return (
		<ListItem
			className="overflow-hidden"
			{...info}
			onPress={onPress}
			subTitleClassName="text-sm"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			leftView={
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
			}
			rightView={
				<View className="flex-1 flex-row items-center px-4 gap-2">
					{info.item.transfer.state === "started" ? (
						<Fragment>
							<ActivityIndicator
								color={colors.foreground}
								size="small"
							/>
							<Text>{normalizeTransferProgress(info.item.transfer.size, info.item.transfer.bytes)}%</Text>
						</Fragment>
					) : info.item.transfer.state === "finished" ? (
						<Icon
							name="check-circle-outline"
							color={colors.primary}
						/>
					) : info.item.transfer.state === "error" ? (
						<Icon
							name="stop-circle-outline"
							color={colors.primary}
						/>
					) : info.item.transfer.state === "paused" ? (
						<Icon
							name="stop-circle-outline"
							color={colors.primary}
						/>
					) : info.item.transfer.state === "queued" ? (
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					) : info.item.transfer.state === "stopped" ? (
						<Text>Stopped</Text>
					) : null}
				</View>
			}
		/>
	)
})

Transfer.displayName = "Transfer"

export default Transfer
