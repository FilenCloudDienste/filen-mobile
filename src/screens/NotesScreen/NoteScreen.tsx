import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"
import { View, Text, useWindowDimensions, TouchableOpacity, KeyboardAvoidingView } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { NoteType, Note } from "../../lib/api"
import { fetchNoteContent, quillStyle } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import QuillEditor from "react-native-cn-quill"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Checklist from "./Checklist"
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"

const NoteScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const dimensions = useWindowDimensions()
	const [contentType, setContentType] = useState<NoteType>("text")
	const [content, setContent] = useState<string>("")
	const [synced, setSynced] = useState<{ content: boolean; title: boolean }>({ content: true, title: true })
	const prevContent = useRef<string>("")
	const quillRef = useRef<QuillEditor>(null)
	const insets = useSafeAreaInsets()
	const [userId] = useMMKVNumber("userId", storage)

	const userHasWritePermissions = useMemo(() => {
		if (!route.params.note) {
			return false
		}

		return (
			(route.params.note as Note).participants.filter(participant => participant.userId === userId && participant.permissionsWrite)
				.length > 0
		)
	}, [route.params.note, userId])

	const loadNote = useCallback(async (skipCache: boolean = false) => {
		try {
			const [cache, type] = await Promise.all([
				dbFs.get<string | undefined>("noteContent:" + route.params.note.uuid),
				dbFs.get<NoteType | undefined>("noteType:" + route.params.note.uuid)
			])
			const hasCache = cache && type && typeof cache === "string" && typeof type === "string"

			if (!hasCache) {
				setLoadDone(false)
				setContent("")
				setContentType("text")
				setSynced(prev => ({ ...prev, content: false, title: false }))
			}

			const noteContent = await fetchNoteContent(route.params.note, skipCache)

			prevContent.current = noteContent.content

			setContentType(noteContent.type)
			setContent(noteContent.content)
			setSynced(prev => ({ ...prev, content: true, title: true }))

			if (noteContent.cache) {
				loadNote(true)
			}
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			setLoadDone(true)
		}
	}, [])

	useEffect(() => {
		loadNote()
	}, [])

	return (
		<View
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<DefaultTopBar
				onPressBack={() => {
					navigation.goBack()
				}}
				leftText={i18n(lang, "notes")}
				middleText={route.params.note.title}
				onPressMiddleText={userHasWritePermissions ? () => console.log("edit title") : undefined}
				rightComponent={
					<TouchableOpacity
						style={{
							width: "33%",
							justifyContent: "center",
							alignItems: "flex-end",
							paddingRight: 15
						}}
						hitSlop={{
							top: 15,
							bottom: 15,
							right: 15,
							left: 15
						}}
						onPress={() => {}}
					>
						<Text
							style={{
								color: getColor(darkMode, "linkPrimary"),
								fontSize: 17,
								fontWeight: "400"
							}}
						>
							{i18n(lang, "cancel")}
						</Text>
					</TouchableOpacity>
				}
			/>
			{loadDone && (
				<>
					{contentType === "rich" && (
						<KeyboardAvoidingView
							style={{
								height: "100%",
								width: "100%",
								backgroundColor: "transparent"
							}}
							behavior="padding"
							keyboardVerticalOffset={65}
						>
							<QuillEditor
								style={{
									backgroundColor: "transparent",
									marginTop: 10
								}}
								ref={quillRef}
								initialHtml={content}
								quill={{
									placeholder: "Note content..",
									theme: "snow",
									modules: {
										toolbar: [
											[{ header: [1, 2, 3, 4, 5, 6, false] }],
											["bold", "italic", "underline"],
											["code-block", "link", "blockquote"],
											[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
											[{ indent: "-1" }, { indent: "+1" }],
											[{ script: "sub" }, { script: "super" }]
										]
									}
								}}
								import3rdParties="local"
								theme={{
									background: "transparent",
									color: getColor(darkMode, "textPrimary"),
									placeholder: getColor(darkMode, "textSecondary")
								}}
								loading={<></>}
								customJS="setTimeout(() => { try { quill.root.setAttribute('spellcheck', false) } catch {} }, 1000);"
								customStyles={[
									quillStyle(darkMode),
									`
                                    html, head, body {
                                        background-color: ` +
										"transparent" +
										` !important;
                                    }

                                    .ql-editor {
                                        padding-bottom: ` +
										(insets.bottom + 85) +
										`px !important;
                                        margin-top: -5px !important;
                                    }
                                    `
								]}
							/>
						</KeyboardAvoidingView>
					)}
					{contentType === "checklist" && (
						<View
							style={{
								marginTop: 15,
								paddingLeft: 25,
								paddingRight: 25
							}}
						>
							<Checklist
								darkMode={darkMode}
								content={content}
								onChange={value => {
									if (value === "" || value.indexOf("<ul data-checked") === -1 || value === "<p><br></p>") {
										value = '<ul data-checked="false"><li><br></li></ul>'
									}

									if (value.indexOf("<p") !== -1) {
										value = value.replace(/<p>.*?<\/p>/g, "")
									}
								}}
							/>
						</View>
					)}
					{(contentType === "code" || contentType === "text" || contentType === "md") && (
						<KeyboardAvoidingView
							style={{
								height: "100%",
								width: "100%",
								backgroundColor: "transparent",
								paddingTop: 10
							}}
							behavior="padding"
							keyboardVerticalOffset={65}
						>
							<QuillEditor
								style={{
									backgroundColor: "transparent"
								}}
								ref={quillRef}
								initialHtml={content}
								webview={{
									style: {
										backgroundColor: "transparent"
									}
								}}
								quill={{
									placeholder: "Note content..",
									theme: "snow",
									modules: {
										toolbar: false
									}
								}}
								import3rdParties="local"
								theme={{
									background: "transparent",
									color: getColor(darkMode, "textPrimary"),
									placeholder: getColor(darkMode, "textSecondary")
								}}
								loading={
									<View
										style={{
											width: dimensions.width,
											height: dimensions.height,
											backgroundColor: "transparent"
										}}
									/>
								}
								customJS="setTimeout(() => { try { quill.root.setAttribute('spellcheck', false) } catch {} }, 1000);"
								customStyles={[
									quillStyle(darkMode),
									`
                                    html, head, body {
                                        background-color: ` +
										"transparent" +
										` !important;
                                    }

                                    .ql-container {
                                        padding-top: 0px !important;
                                        margin-top: 0px !important;
                                    }

                                    .ql-editor {
                                        padding-top: 0px !important;
                                        padding-bottom: 55px !important;
                                        margin-top: 0px !important;
                                    }
                                    `
								]}
							/>
						</KeyboardAvoidingView>
					)}
				</>
			)}
		</View>
	)
})

export default NoteScreen
