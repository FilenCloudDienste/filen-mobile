import React, { useState, useEffect, memo, useRef, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { getParent } from "../../../lib/helpers"
import { i18n } from "../../../i18n"
import { navigationAnimation } from "../../../lib/state"
import { StackActions } from "@react-navigation/native"
import { DeviceEventEmitter, Text, Platform } from "react-native"
import { NavigationContainerRef } from "@react-navigation/native"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import { getColor } from "../../../style"

export interface CreateTextFileDialogProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

const CreateTextFileDialog = memo(({ navigation }: CreateTextFileDialogProps) => {
	const [value, setValue] = useState<string>(".txt")
	const inputRef = useRef<any>()
	const lang = useLang()
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
	const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
	const setTextEditorParent = useStore(state => state.setTextEditorParent)
	const [open, setOpen] = useState<boolean>(false)
	const darkMode = useDarkMode()

	const create = useCallback(() => {
		const name = value.trim()

		if (!name) {
			return
		}

		if (name.length == 0) {
			return
		}

		setCreateTextFileDialogName(name)
		setTextEditorText("")
		setTextEditorParent(getParent())
		setTextEditorState("edit")
		setValue(".txt")

		navigationAnimation({ enable: true }).then(() => {
			navigation.dispatch(StackActions.push("TextEditorScreen"))

			setOpen(false)
		})
	}, [value])

	useEffect(() => {
		const openCreateTextFileDialogListener = DeviceEventEmitter.addListener("openCreateTextFileDialog", () => {
			setValue(".txt")
			setOpen(true)

			setTimeout(() => {
				inputRef?.current?.focus()
			}, 500)
		})

		return () => {
			openCreateTextFileDialogListener.remove()
		}
	}, [])

	return (
		<Dialog.Container
			visible={open}
			useNativeDriver={false}
			onRequestClose={() => setOpen(false)}
			onBackdropPress={() => setOpen(false)}
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
					{i18n(lang, "createTextFile")}
				</Text>
			</Dialog.Title>
			<Dialog.Input
				placeholder={i18n(lang, "fileName")}
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
				onPress={() => setOpen(false)}
				color={getColor(darkMode, "linkPrimary")}
			/>
			<Dialog.Button
				label={i18n(lang, "create")}
				onPress={create}
				color={getColor(darkMode, "linkPrimary")}
			/>
		</Dialog.Container>
	)
})

export default CreateTextFileDialog
