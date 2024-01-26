import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import { View, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from "react-native"
import useLang from "../../lib/hooks/useLang"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import * as fs from "../../lib/fs"
import { queueFileUpload } from "../../lib/services/upload/upload"
import { useStore } from "../../lib/state"
import { getColor } from "../../style/colors"
import { getParent } from "../../lib/helpers"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import TextEditor from "../../components/TextEditor"
import useKeyboardOffset from "../../lib/hooks/useKeyboardOffset"

export const TextEditorScreen = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const textEditorText = useStore(state => state.textEditorText)
	const textEditorState = useStore(state => state.textEditorState)
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [value, setValue] = useState<string>("")
	const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
	const textEditorParent = useStore(state => state.textEditorParent)
	const keyboardOffset = useKeyboardOffset()
	const fileName = useRef<string>(
		textEditorState === "edit" ? createTextFileDialogName : (currentActionSheetItem?.name as string)
	).current
	const setTextEditorState = useStore(state => state.setTextEditorState)

	const save = useCallback(() => {
		if (value.length <= 0) {
			return
		}

		if (value === textEditorText) {
			return navigation.goBack()
		}

		let parent: string = getParent()

		if (textEditorParent.length > 16) {
			parent = textEditorParent
		}

		if (parent.length < 16) {
			return
		}

		navigation.goBack()

		fs.getDownloadPath({ type: "temp" }).then(async path => {
			path = path + fileName

			try {
				if ((await fs.stat(path)).exists) {
					await fs.unlink(path)
				}
			} catch (e) {
				//console.log(e)
			}

			fs.writeAsString(path, value, {
				encoding: "utf8"
			})
				.then(async () => {
					try {
						var stat = await fs.stat(path)
					} catch (e: any) {
						console.log(e)

						showToast({ message: e.toString() })

						return
					}

					if (!stat.exists) {
						return
					}

					if (typeof stat !== "object") {
						return
					}

					queueFileUpload({
						file: {
							path: decodeURIComponent(path).replace("file://", ""),
							name: fileName,
							size: stat.size,
							mime: "text/plain",
							lastModified: Date.now()
						},
						parent
					}).catch(err => {
						if (err.toString() === "stopped") {
							return
						}

						if (err.toString() === "wifiOnly") {
							showToast({ message: i18n(lang, "onlyWifiUploads") })

							return
						}

						console.error(err)

						showToast({ message: err.toString() })
					})
				})
				.catch(err => {
					console.log(err)

					showToast({ message: err.toString() })
				})
		})
	}, [textEditorText, value, textEditorParent])

	const close = useCallback(() => {
		if (textEditorText !== value) {
			Alert.alert(
				i18n(lang, "exit"),
				i18n(lang, "exitWithoutSavingChanges"),
				[
					{
						text: i18n(lang, "cancel"),
						onPress: () => {
							return false
						},
						style: "cancel"
					},
					{
						text: i18n(lang, "exit"),
						onPress: () => {
							navigation.goBack()
						},
						style: "default"
					}
				],
				{
					cancelable: true
				}
			)
		} else {
			navigation.goBack()
		}
	}, [textEditorText, value])

	useEffect(() => {
		if (textEditorText.length > 0) {
			setValue(textEditorText)
		} else {
			setValue("")
		}
	}, [textEditorText])

	return (
		<KeyboardAvoidingView
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: "transparent"
			}}
			behavior={Platform.OS === "android" ? undefined : "padding"}
			keyboardVerticalOffset={keyboardOffset}
		>
			<DefaultTopBar
				leftText={i18n(lang, "back")}
				middleText={fileName}
				onPressBack={() => close()}
				rightComponent={
					textEditorState === "edit" ? (
						<View
							style={{
								flexDirection: "row",
								width: "33%",
								justifyContent: "flex-end",
								paddingRight: 15
							}}
						>
							{textEditorText !== value && (
								<TouchableOpacity
									onPress={() => save()}
									hitSlop={{
										top: 15,
										bottom: 15,
										right: 15,
										left: 15
									}}
								>
									<Ionicon
										name="save-outline"
										size={21}
										color={getColor(darkMode, "linkPrimary")}
										style={{
											marginTop: 5
										}}
									/>
								</TouchableOpacity>
							)}
						</View>
					) : undefined
				}
			/>
			<View
				style={{
					height: "100%",
					width: "100%",
					marginTop: 5
				}}
			>
				<TextEditor
					darkMode={darkMode}
					value={textEditorText.length > 0 ? textEditorText : ""}
					readOnly={false}
					placeholder=""
					onChange={e => {
						setValue(e)
						setTextEditorState("edit")
					}}
				/>
			</View>
		</KeyboardAvoidingView>
	)
})
