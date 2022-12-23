import React, { useEffect, useState, memo } from "react"
import { View, DeviceEventEmitter, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../../../lib/state"
import { getAvailableFolderColors } from "../../../lib/helpers"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, ActionSheetIndicator, ItemActionSheetItemHeader } from "../ActionSheets"
import { changeFolderColor } from "../../../lib/api"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import type { Item } from "../../../types"

const FolderColorActionSheet = memo(() => {
    const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const availableFolderColors = getAvailableFolderColors()

	useEffect(() => {
		const openFolderColorActionSheetListener = (item: Item) => {
			setCurrentItem(item)

			SheetManager.show("FolderColorActionSheet")
		}

		DeviceEventEmitter.addListener("openFolderColorActionSheet", openFolderColorActionSheetListener)

		return () => {
			DeviceEventEmitter.removeListener("openFolderColorActionSheet", openFolderColorActionSheetListener)
		}
	}, [])

    return (
		// @ts-ignore
        <ActionSheet
			id="FolderColorActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					Object.keys(availableFolderColors).map((prop) => {
						if(prop == "default_ios"){
							return null
						}

						if(Platform.OS == "ios" && prop == "blue"){
							return null
						}

						if(typeof currentItem == "undefined"){
							return null
						}

						return (
							<ActionButton
								key={prop}
								onPress={async () => {
									if(buttonsDisabled){
										return false
									}

									setButtonsDisabled(true)

									await SheetManager.hide("FolderColorActionSheet")

									useStore.setState({ fullscreenLoadingModalVisible: true })
				
									changeFolderColor({
										folder: currentItem,
										color: prop
									}).then(async () => {
										DeviceEventEmitter.emit("event", {
											type: "change-folder-color",
											data: {
												uuid: currentItem.uuid,
												color: prop
											}
										})

										setButtonsDisabled(false)

										useStore.setState({ fullscreenLoadingModalVisible: false })

										showToast({ message: i18n(lang, "folderColorChanged", true, ["__NAME__", "__COLOR__"], [currentItem.name, i18n(lang, "color_" + prop)]) })
									}).catch((err) => {
										console.log(err)

										setButtonsDisabled(false)

										useStore.setState({ fullscreenLoadingModalVisible: false })

										showToast({ message: err.toString() })
									})
								}}
								color={Platform.OS == "ios" && prop == "default" ? availableFolderColors['default_ios'] as string : availableFolderColors[prop] as string}
								text={i18n(lang, "color_" + prop)}
							/>
						)
					})
				}
          	</View>
        </ActionSheet>
    )
})

export default FolderColorActionSheet