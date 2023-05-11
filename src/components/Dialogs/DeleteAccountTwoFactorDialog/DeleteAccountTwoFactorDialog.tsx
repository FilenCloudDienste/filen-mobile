import React, { useState, useEffect, useRef, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { deleteAccount } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { Keyboard } from "react-native"
import { logout } from "../../../lib/services/auth/logout"
import { DeviceEventEmitter, Text, Platform } from "react-native"
import { NavigationContainerRef } from "@react-navigation/native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"

export interface DeleteAccountTwoFactorDialogProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

const DeleteAccountTwoFactorDialog = memo(({ navigation }: DeleteAccountTwoFactorDialogProps) => {
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<any>()
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()

	const deleteAcc = useCallback(() => {
		if (buttonsDisabled) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)

		Keyboard.dismiss()

		useStore.setState({ fullscreenLoadingModalVisible: true })

		const twoFactorKey = value.trim()

		if (twoFactorKey.length == 0) {
			return
		}

		deleteAccount(twoFactorKey)
			.then(() => {
				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				logout({ navigation })
			})
			.catch(err => {
				console.error(err)

				setButtonsDisabled(false)

				useStore.setState({ fullscreenLoadingModalVisible: false })

				showToast({ message: err.toString() })
			})
	}, [buttonsDisabled, value, lang])

	useEffect(() => {
		const openDeleteAccountTwoFactorDialogListener = DeviceEventEmitter.addListener("openDeleteAccountTwoFactorDialog", () => {
			setButtonsDisabled(false)
			setOpen(true)
		})

		return () => {
			openDeleteAccountTwoFactorDialogListener.remove()
		}
	}, [])

	return (
		<Dialog.Container
			visible={open}
			useNativeDriver={false}
			onRequestClose={() => setOpen(false)}
			onBackdropPress={() => {
				if (!buttonsDisabled) {
					setOpen(false)
				}
			}}
			contentStyle={
				Platform.OS == "android" && {
					backgroundColor: getColor(darkMode, "backgroundSecondary")
				}
			}
		>
			<Dialog.Title>
				<Text
					style={
						Platform.OS == "android" && {
							color: getColor(darkMode, "textPrimary")
						}
					}
				>
					{i18n(lang, "deleteAccount")}
				</Text>
			</Dialog.Title>
			<Dialog.Input
				placeholder={i18n(lang, "code")}
				value={value}
				autoFocus={true}
				onChangeText={val => setValue(val)}
				textInputRef={inputRef}
				cursorColor={Platform.OS == "android" && getColor(darkMode, "linkPrimary")}
				underlineColorAndroid={getColor(darkMode, "backgroundTertiary")}
				style={
					Platform.OS == "android" && {
						color: getColor(darkMode, "textPrimary")
					}
				}
			/>
			<Dialog.Button
				label={i18n(lang, "cancel")}
				disabled={buttonsDisabled}
				onPress={() => setOpen(false)}
				color={getColor(darkMode, "linkPrimary")}
			/>
			<Dialog.Button
				label={i18n(lang, "delete")}
				disabled={buttonsDisabled}
				onPress={deleteAcc}
				color={getColor(darkMode, "linkPrimary")}
			/>
		</Dialog.Container>
	)
})

export default DeleteAccountTwoFactorDialog
