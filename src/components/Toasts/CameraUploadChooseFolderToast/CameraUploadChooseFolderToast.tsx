import React, { useState, useEffect, memo, useCallback } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { useStore, navigationAnimation } from "../../../lib/state"
import { getParent, getRouteURL } from "../../../lib/helpers"
import { i18n } from "../../../i18n"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../../../style"
import { hideAllToasts } from "../Toasts"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import * as db from "../../../lib/db"
import memoryCache from "../../../lib/memoryCache"

const CameraUploadChooseFolderToast = memo(
	({ message, navigation }: { message?: string | undefined; navigation?: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const currentRoutes = useStore(state => state.currentRoutes) as any
		const [currentParent, setCurrentParent] = useState("")
		const [currentRouteURL, setCurrentRouteURL] = useState("")

		const choose = useCallback(() => {
			if (
				currentRouteURL.indexOf("shared-in") !== -1 ||
				currentRouteURL.indexOf("shared-out") !== -1 ||
				currentRouteURL.indexOf("recents") !== -1 ||
				currentRouteURL.indexOf("trash") !== -1 ||
				currentRouteURL.indexOf("photos") !== -1 ||
				currentRouteURL.indexOf("offline") !== -1 ||
				currentRouteURL.split("/").length < 2
			) {
				return
			}

			const parent = getParent()
			const folderName = memoryCache.has("itemCache:folder:" + parent) ? memoryCache.get("itemCache:folder:" + parent).name : ""

			if (parent.length < 32 || folderName.length <= 0) {
				return
			}

			const userId = storage.getNumber("userId")

			db.dbFs.remove("cameraUploadLastLoadRemoteCache:" + storage.getString("cameraUploadFolderUUID:" + userId)).catch(console.error)

			storage.set("cameraUploadFolderUUID:" + userId, parent)
			storage.set("cameraUploadFolderName:" + userId, folderName)
			storage.set("cameraUploadUploaded", 0)
			storage.set("cameraUploadTotal", 0)

			db.dbFs.remove("loadItems:photos").catch(console.error)

			hideAllToasts()

			navigationAnimation({ enable: false }).then(() => {
				navigation?.dispatch(
					CommonActions.reset({
						index: 1,
						routes: [
							{
								name: "SettingsScreen"
							},
							{
								name: "CameraUploadScreen"
							}
						]
					})
				)
			})
		}, [currentRouteURL])

		useEffect(() => {
			if (Array.isArray(currentRoutes)) {
				const parent = getParent(currentRoutes[currentRoutes.length - 1])

				if (typeof parent == "string" && parent.length > 0) {
					setCurrentParent(parent)
					setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
				}
			}
		}, [currentRoutes])

		return (
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					width: "100%",
					height: "100%",
					zIndex: 99999
				}}
			>
				<View>
					<Text
						style={{
							color: getColor(darkMode, "textPrimary"),
							fontSize: 15,
							fontWeight: "400"
						}}
					>
						{message}
					</Text>
				</View>
				<View
					style={{
						flexDirection: "row"
					}}
				>
					<TouchableOpacity
						hitSlop={{
							right: 20,
							left: 20,
							top: 10,
							bottom: 10
						}}
						style={{
							width: "auto",
							height: "auto",
							paddingLeft: 10,
							paddingRight: 10
						}}
						onPress={async () => {
							hideAllToasts()

							await navigationAnimation({ enable: false })

							navigation?.dispatch(
								CommonActions.reset({
									index: 1,
									routes: [
										{
											name: "SettingsScreen"
										},
										{
											name: "CameraUploadScreen"
										}
									]
								})
							)
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 15,
								fontWeight: "400"
							}}
						>
							{i18n(lang, "cancel")}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						hitSlop={{
							right: 20,
							left: 20,
							top: 10,
							bottom: 10
						}}
						style={{
							marginLeft: 20
						}}
						onPress={choose}
					>
						<Text
							style={{
								fontSize: 15,
								fontWeight: "400",
								color:
									currentRouteURL.indexOf("shared-in") == -1 &&
									currentRouteURL.indexOf("recents") == -1 &&
									currentRouteURL.indexOf("trash") == -1 &&
									currentRouteURL.indexOf("photos") == -1 &&
									currentRouteURL.indexOf("offline") == -1 &&
									currentParent.length > 32 &&
									currentRouteURL.split("/").length >= 2
										? getColor(darkMode, "linkPrimary")
										: getColor(darkMode, "textSecondary")
							}}
						>
							{i18n(lang, "choose")}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}
)

export default CameraUploadChooseFolderToast
