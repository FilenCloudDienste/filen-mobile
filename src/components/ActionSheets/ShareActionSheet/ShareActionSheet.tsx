import React, { useEffect, useState, memo, useRef, useCallback } from "react"
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, DeviceEventEmitter } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { getPublicKeyFromEmail, shareItemToUser } from "../../../lib/api"
import { getColor } from "../../../style/colors"
import { ActionSheetIndicator, ItemActionSheetItemHeader } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { Item } from "../../../types"

const ShareActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const [email, setEmail] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [progress, setProgress] = useState<{ itemsDone: number; totalItems: number }>({ itemsDone: 0, totalItems: 1 })
	const inputRef = useRef<any>()
	const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)

	const share = useCallback(() => {
		if (buttonsDisabled || isLoading) {
			return
		}

		if (email == storage.getString("email")) {
			return
		}

		setButtonsDisabled(true)
		setIsLoading(true)

		getPublicKeyFromEmail({ email })
			.then(publicKey => {
				if (typeof publicKey !== "string") {
					setButtonsDisabled(false)
					setIsLoading(false)
					setEmail("")

					showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })

					return
				}

				if (publicKey.length < 16) {
					setButtonsDisabled(false)
					setIsLoading(false)
					setEmail("")

					showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })

					return
				}

				shareItemToUser({
					item: currentItem,
					publicKey,
					email,
					progressCallback: (itemsDone: number, totalItems: number) => {
						setProgress({ itemsDone, totalItems })
					}
				})
					.then(() => {
						setButtonsDisabled(false)
						setIsLoading(false)
						setEmail("")

						showToast({
							message: i18n(lang, "sharedWithSuccess", true, ["__EMAIL__"], [email]),
							placement: "top"
						})
					})
					.catch(err => {
						console.error(err)

						showToast({ message: err.toString(), placement: "top" })

						setButtonsDisabled(false)
						setIsLoading(false)
					})
			})
			.catch(err => {
				console.error(err)

				if (err.toString().toLowerCase().indexOf("not found") !== -1) {
					showToast({ message: i18n(lang, "shareUserNotFound"), placement: "top" })

					setEmail("")
				} else {
					showToast({ message: err.toString(), placement: "top" })
				}

				setButtonsDisabled(false)
				setIsLoading(false)
			})
	}, [buttonsDisabled, currentItem, email, isLoading, lang])

	useEffect(() => {
		const openShareActionSheetListener = DeviceEventEmitter.addListener("openShareActionSheet", (item: Item) => {
			setButtonsDisabled(false)
			setEmail("")
			setIsLoading(false)
			setProgress({ itemsDone: 0, totalItems: 1 })
			setCurrentItem(item)

			SheetManager.show("ShareActionSheet")

			setTimeout(() => {
				if (typeof inputRef.current !== "undefined" && inputRef.current !== null) {
					if (typeof inputRef.current.focus == "function") {
						inputRef.current.focus()
					}
				}
			}, 500)
		})

		return () => {
			openShareActionSheetListener.remove()
		}
	}, [])

	return (
		// @ts-ignore
		<ActionSheet
			id="ShareActionSheet"
			gestureEnabled={buttonsDisabled ? false : true}
			closeOnPressBack={buttonsDisabled ? false : true}
			closeOnTouchBackdrop={buttonsDisabled ? false : true}
			closable={buttonsDisabled ? false : true}
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
					paddingBottom: insets.bottom + 25
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{isLoading ? (
					<View
						style={{
							width: "100%",
							height: 100,
							justifyContent: "center",
							alignItems: "center"
						}}
					>
						<ActivityIndicator
							size="small"
							color={getColor(darkMode, "textPrimary")}
						/>
						{typeof currentItem !== "undefined" && currentItem.type == "folder" && (
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									marginTop: 15,
									fontSize: 15,
									fontWeight: "400"
								}}
							>
								{i18n(
									lang,
									"folderPublicLinkProgress",
									true,
									["__DONE__", "__TOTAL__"],
									[progress.itemsDone, progress.totalItems]
								)}
							</Text>
						)}
					</View>
				) : (
					<View
						style={{
							width: "100%",
							height: 45,
							flexDirection: "row",
							justifyContent: "space-between",
							borderBottomColor: getColor(darkMode, "actionSheetBorder"),
							borderBottomWidth: 1,
							paddingLeft: 15,
							paddingRight: 15
						}}
					>
						<TextInput
							placeholder={i18n(lang, "sharePlaceholder")}
							value={email}
							onChangeText={setEmail}
							ref={inputRef}
							autoCapitalize="none"
							textContentType="emailAddress"
							keyboardType="email-address"
							returnKeyType="done"
							placeholderTextColor={getColor(darkMode, "textSecondary")}
							style={{
								width: "75%",
								paddingLeft: 0,
								paddingRight: 0,
								color: getColor(darkMode, "textPrimary")
							}}
						/>
						<View
							style={{
								flexDirection: "row"
							}}
						>
							{email.length > 0 && (
								<TouchableOpacity onPress={share}>
									{!buttonsDisabled && (
										<Text
											style={{
												paddingTop: 12,
												color: "#0A84FF",
												fontSize: 15,
												fontWeight: "400"
											}}
										>
											{i18n(lang, "share")}
										</Text>
									)}
								</TouchableOpacity>
							)}
						</View>
					</View>
				)}
			</View>
		</ActionSheet>
	)
})

export default ShareActionSheet
