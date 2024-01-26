import React, { useState, useEffect, useRef, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import useLang from "../../../lib/hooks/useLang"
import { userNickname, UserGetAccount } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { Keyboard, Text, Platform } from "react-native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import striptags from "striptags"
import eventListener from "../../../lib/eventListener"

const ChatNickNameDialog = memo(() => {
	const [value, setValue] = useState<string>("")
	const inputRef = useRef<any>()
	const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()
	const [account, setAccount] = useState<UserGetAccount | undefined>(undefined)

	const rename = useCallback(async () => {
		const name = striptags(value.trim())

		if (!name || name.length === 0 || !account || account.nickName === name) {
			return
		}

		setButtonsDisabled(true)
		setOpen(false)
		showFullScreenLoadingModal()

		Keyboard.dismiss()

		try {
			await userNickname(name)

			eventListener.emit("nickNameUpdated", name)
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
			setButtonsDisabled(false)
			setValue("")
		}
	}, [value, account])

	useEffect(() => {
		const openChatNickNameDialogListener = eventListener.on("openChatNickNameDialog", (acc: UserGetAccount) => {
			setButtonsDisabled(false)
			setValue(typeof acc.nickName === "string" && acc.nickName.length > 0 ? acc.nickName : "")
			setAccount(acc)
			setOpen(true)

			setTimeout(() => {
				inputRef?.current?.focus()
			}, 500)
		})

		return () => {
			openChatNickNameDialogListener.remove()
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
					{i18n(lang, "nickname")}
				</Text>
			</Dialog.Title>
			<Dialog.Input
				placeholder={i18n(lang, "nickname")}
				value={value}
				onChangeText={val => setValue(val)}
				textInputRef={inputRef}
				cursorColor={Platform.OS === "android" && getColor(darkMode, "linkPrimary")}
				underlineColorAndroid={getColor(darkMode, "backgroundTertiary")}
				style={
					Platform.OS === "android" && {
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
				label={i18n(lang, "rename")}
				disabled={buttonsDisabled}
				onPress={rename}
				color={getColor(darkMode, "linkPrimary")}
			/>
		</Dialog.Container>
	)
})

export default ChatNickNameDialog
