import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { View, Text, useWindowDimensions, TouchableOpacity, Platform, StyleSheet } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { Note, NoteTag, NoteType } from "../../lib/api"
import { fetchNoteContent, quillStyle } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import { useMMKVString } from "react-native-mmkv"
import storage from "../../lib/storage"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import CodeEditor, { CodeEditorSyntaxStyles } from "@rivascva/react-native-code-editor"
import { useMMKVBoolean, useMMKVNumber } from "react-native-mmkv"
import { getLanguageOfFile, Languages } from "../TextEditorScreen"

export interface NoteScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	route: any
}

const NoteScreen = memo(({ navigation, route }: NoteScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const dimensions = useWindowDimensions()
	const [contentType, setContentType] = useState<NoteType>("text")
	const [content, setContent] = useState<string>("")
	const [synced, setSynced] = useState<{ content: boolean; title: boolean }>({ content: true, title: true })
	const prevContent = useRef<string>("")
	const quillRef = useRef<QuillEditor>(null)
	const [userId] = useMMKVNumber("userId", storage)
	const [hideEditorLineNumbers] = useMMKVBoolean("hideEditorLineNumbers:" + userId, storage)

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
						<View
							style={{
								width: dimensions.width,
								height: "100%",
								borderColor: getColor(darkMode, "primaryBorder"),
								borderTopWidth: 1,
								marginTop: 10
							}}
						>
							<QuillEditor
								style={{
									width: dimensions.width,
									height: dimensions.height - 500,
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
										toolbar: [
											[{ header: [1, 2, 3, 4, 5, 6, false] }],
											["bold", "italic", "underline"],
											["code-block", "link", "blockquote"],
											[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
											[{ indent: "-1" }, { indent: "+1" }],
											[{ script: "sub" }, { script: "super" }],
											[{ direction: "rtl" }]
										]
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
								customStyles={[
									`
                                    html, head, body {
                                        background-color: ` +
										"transparent" +
										` !important;
                                    }
                                    `,
									quillStyle(darkMode)
								]}
							/>
						</View>
					)}
					{contentType === "checklist" && (
						<QuillEditor
							style={{
								width: dimensions.width,
								height: dimensions.height,
								backgroundColor: "transparent"
							}}
							ref={quillRef}
							initialHtml={content}
							webview={{
								style: {
									backgroundColor: "transparent"
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
							customStyles={[
								`
                                html, head, body {
                                    background-color: ` +
									"transparent" +
									` !important;
                                }
                                `
								//quillStyle(darkMode)
							]}
						/>
					)}
					{(contentType === "code" || contentType === "text") && (
						<QuillEditor
							style={{
								width: dimensions.width,
								height: dimensions.height,
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
							customStyles={[
								`
                                html, head, body {
                                    background-color: ` +
									"transparent" +
									` !important;
                                }
                                `,
								quillStyle(darkMode)
							]}
						/>
					)}
					{contentType === "md" && (
						<View
							style={{
								paddingTop: 10
							}}
						>
							<CodeEditor
								autoFocus={false}
								initialValue={content}
								language="markdown"
								showLineNumbers={false}
								style={{
									backgroundColor: getColor(darkMode, "backgroundPrimary")
								}}
							/>
						</View>
					)}
				</>
			)}
		</View>
	)
})

export default NoteScreen
