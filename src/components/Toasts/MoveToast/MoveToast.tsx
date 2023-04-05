import React, { useState, useEffect, memo, useRef, useCallback } from "react"
import { View, Text, TouchableOpacity, DeviceEventEmitter } from "react-native"
import useLang from "../../../lib/hooks/useLang"
import { useStore } from "../../../lib/state"
import { getParent, getRouteURL } from "../../../lib/helpers"
import { moveFile, moveFolder, folderExists, fileExists } from "../../../lib/api"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style"
import { hideAllToasts, showToast } from "../Toasts"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const MoveToast = memo(({ message }: { message?: string | undefined }) => {
	const darkMode = useDarkMode()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem) as any
	const [buttonsDisabled, setButtonsDisabled] = useState(false)
	const lang = useLang()
	const initParent = useRef<any>()
	const currentRoutes = useStore(state => state.currentRoutes) as any
	const [currentParent, setCurrentParent] = useState("")
	const [currentRouteURL, setCurrentRouteURL] = useState("")

	const move = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		if (
			currentRouteURL.indexOf("shared-in") !== -1 ||
			currentRouteURL.indexOf("recents") !== -1 ||
			currentRouteURL.indexOf("trash") !== -1 ||
			currentRouteURL.indexOf("photos") !== -1 ||
			currentRouteURL.indexOf("offline") !== -1
		) {
			showToast({ message: i18n(lang, "cannotMoveFileHere") })

			return
		}

		const parent = getParent()

		if (
			[
				"recents",
				"shared-in",
				"shared-out",
				"links",
				"favorites",
				"offline",
				"cloud",
				"photos",
				"settings"
			].includes(parent)
		) {
			showToast({ message: i18n(lang, "cannotMoveFileHere") })

			return
		}

		if (parent.length <= 32) {
			//&& currentActionSheetItem.type == "file"
			showToast({ message: i18n(lang, "cannotMoveFileHere") })

			return
		}

		if (typeof currentActionSheetItem !== "object") {
			return
		}

		if (currentActionSheetItem.parent == parent) {
			showToast({ message: i18n(lang, "moveSameParentFolder") })

			return
		}

		if (getRouteURL().indexOf("shared-in") !== -1) {
			showToast({ message: i18n(lang, "cannotMoveFileHere") })

			return
		}

		setButtonsDisabled(true)

		useStore.setState({ fullscreenLoadingModalVisible: true })

		if (currentActionSheetItem.type == "file") {
			fileExists({
				name: currentActionSheetItem.name,
				parent
			})
				.then(res => {
					if (res.exists) {
						setButtonsDisabled(false)

						useStore.setState({ fullscreenLoadingModalVisible: false })

						showToast({
							message: i18n(
								lang,
								"alreadyExistsInThisFolder",
								true,
								["__NAME__"],
								[currentActionSheetItem.name]
							)
						})

						return
					}

					moveFile({
						file: currentActionSheetItem,
						parent
					})
						.then(() => {
							DeviceEventEmitter.emit("event", {
								type: "reload-list",
								data: {
									parent: initParent.current
								}
							})

							DeviceEventEmitter.emit("event", {
								type: "reload-list",
								data: {
									parent
								}
							})

							setTimeout(() => {
								setButtonsDisabled(false)

								useStore.setState({ fullscreenLoadingModalVisible: false })

								hideAllToasts()

								//showToast({ message: i18n(lang, "itemMoved", true, ["__NAME__"], [currentActionSheetItem.name]) })
							}, 500)
						})
						.catch(err => {
							setButtonsDisabled(false)

							useStore.setState({ fullscreenLoadingModalVisible: false })

							showToast({ message: err.toString() })
						})
				})
				.catch(err => {
					setButtonsDisabled(false)

					useStore.setState({ fullscreenLoadingModalVisible: false })

					showToast({ message: err.toString() })
				})
		} else {
			folderExists({
				name: currentActionSheetItem.name,
				parent
			})
				.then(res => {
					if (res.exists) {
						setButtonsDisabled(false)

						useStore.setState({ fullscreenLoadingModalVisible: false })

						showToast({
							message: i18n(
								lang,
								"alreadyExistsInThisFolder",
								true,
								["__NAME__"],
								[currentActionSheetItem.name]
							)
						})

						return
					}

					moveFolder({
						folder: currentActionSheetItem,
						parent
					})
						.then(() => {
							DeviceEventEmitter.emit("event", {
								type: "reload-list",
								data: {
									parent: initParent
								}
							})

							DeviceEventEmitter.emit("event", {
								type: "reload-list",
								data: {
									parent
								}
							})

							setTimeout(() => {
								setButtonsDisabled(false)

								useStore.setState({ fullscreenLoadingModalVisible: false })

								hideAllToasts()

								//showToast({ message: i18n(lang, "itemMoved", true, ["__NAME__"], [currentActionSheetItem.name]) })
							}, 500)
						})
						.catch(err => {
							console.error(err)

							setButtonsDisabled(false)

							useStore.setState({ fullscreenLoadingModalVisible: false })

							showToast({ message: err.toString() })
						})
				})
				.catch(err => {
					console.error(err)

					setButtonsDisabled(false)

					useStore.setState({ fullscreenLoadingModalVisible: false })

					showToast({ message: err.toString() })
				})
		}
	}, [currentActionSheetItem, currentRouteURL, buttonsDisabled, lang])

	useEffect(() => {
		if (Array.isArray(currentRoutes)) {
			const parent = getParent(currentRoutes[currentRoutes.length - 1])

			if (typeof parent == "string" && parent.length > 0) {
				setCurrentParent(parent)
				setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
			}
		}
	}, [currentRoutes])

	useEffect(() => {
		DeviceEventEmitter.emit("event", {
			type: "unselect-all-items"
		})

		initParent.current = getParent()
	}, [])

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
			<View
				style={{
					width: "50%"
				}}
			>
				<Text
					style={{
						color: getColor(darkMode, "textPrimary"),
						fontSize: 15,
						fontWeight: "400"
					}}
					numberOfLines={1}
				>
					{message}
				</Text>
			</View>
			<View
				style={{
					flexDirection: "row",
					height: "100%"
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
						borderStartColor: "red",
						height: "100%"
					}}
					onPress={() => {
						if (buttonsDisabled) {
							return false
						}

						hideAllToasts()
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
					onPress={move}
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
								currentParent.length > 32
									? getColor(darkMode, "linkPrimary")
									: getColor(darkMode, "textSecondary")
						}}
					>
						{i18n(lang, "move")}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
})

export default MoveToast
