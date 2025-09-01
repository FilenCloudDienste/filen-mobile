import { Icon } from "@roninoss/icons"
import { View, Platform } from "react-native"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { memo, useCallback, Fragment, useMemo } from "react"
import { useActionSheet } from "@expo/react-native-action-sheet"
import { useDriveStore } from "@/stores/drive.store"
import Dropdown from "./dropdown"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import Transfers from "./transfers"
import useAllowed from "@/hooks/useAllowed"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"
import driveService from "@/services/drive.service"

export const RightView = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { colors } = useColorScheme()
	const { showActionSheetWithOptions } = useActionSheet()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const { bottom: bottomInsets } = useSafeAreaInsets()
	const { t } = useTranslation()
	const allowed = useAllowed()
	const { hasInternet } = useNetInfo()

	const options = useMemo(() => {
		return [
			t("drive.header.rightView.actionSheet.upload.files"),
			// Disable directory upload on Android for now as it's not well supported. Need to figure out a better way to handle it.
			// ...(Platform.OS === "android" ? [t("drive.header.rightView.actionSheet.upload.directory")] : []),
			t("drive.header.rightView.actionSheet.upload.media"),
			t("drive.header.rightView.actionSheet.create.textFile"),
			t("drive.header.rightView.actionSheet.create.directory"),
			t("drive.header.rightView.actionSheet.create.photo"),
			t("drive.header.rightView.actionSheet.cancel")
		]
	}, [t])

	const createOptions = useMemo(() => {
		return {
			options,
			cancelIndex: options.length - 1,
			indexToType: Platform.select({
				// Disable directory upload on Android for now as it's not well supported. Need to figure out a better way to handle it.
				/*android: {
					0: "uploadFiles",
					1: "uploadDirectory",
					2: "uploadMedia",
					3: "createTextFile",
					4: "createDirectory",
					5: "createPhoto"
				},*/
				default: {
					0: "uploadFiles",
					1: "uploadMedia",
					2: "createTextFile",
					3: "createDirectory",
					4: "createPhoto"
				}
			}) as Record<number, "uploadFiles" | "uploadDirectory" | "createTextFile" | "createDirectory" | "uploadMedia" | "createPhoto">
		}
	}, [options])

	const onPlusPress = useCallback(() => {
		showActionSheetWithOptions(
			{
				options: createOptions.options,
				cancelButtonIndex: createOptions.cancelIndex,
				destructiveButtonIndex: createOptions.cancelIndex,
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
			async (selectedIndex?: number) => {
				const type = createOptions.indexToType[selectedIndex ?? -1]

				try {
					if (type === "uploadFiles") {
						await driveService.uploadFiles({
							parent: queryParams.parent,
							queryParams,
							disableLoader: true
						})
					} else if (type === "createDirectory") {
						await driveService.createDirectory({
							parent: queryParams.parent,
							queryParams
						})
					} else if (type === "uploadMedia") {
						await driveService.uploadMedia({
							parent: queryParams.parent,
							queryParams,
							disableLoader: true
						})
					} else if (type === "createPhoto") {
						await driveService.createPhotos({
							parent: queryParams.parent,
							queryParams,
							disableLoader: true
						})
					} else if (type === "uploadDirectory") {
						await driveService.uploadDirectory({
							parent: queryParams.parent,
							queryParams,
							disableLoader: true
						})
					} else if (type === "createTextFile") {
						await driveService.createTextFile({
							parent: queryParams.parent,
							queryParams
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
	}, [bottomInsets, colors.card, colors.foreground, showActionSheetWithOptions, createOptions, queryParams])

	if (!hasInternet) {
		return null
	}

	return (
		<View className="flex-row items-center">
			{selectedItemsCount === 0 && (
				<Fragment>
					<Transfers />
					{allowed.upload && (
						<Button
							variant="plain"
							size="icon"
							onPress={onPlusPress}
							testID="drive.plus_button"
						>
							<Icon
								size={24}
								name="plus"
								color={colors.primary}
							/>
						</Button>
					)}
				</Fragment>
			)}
			<Dropdown queryParams={queryParams} />
		</View>
	)
})

RightView.displayName = "RightView"

export default RightView
