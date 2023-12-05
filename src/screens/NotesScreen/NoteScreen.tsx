import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"
import { View, useWindowDimensions, KeyboardAvoidingView } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { NoteType, Note, editNoteContent } from "../../lib/api"
import { fetchNoteContent, quillStyle, createNotePreviewFromContentText, convertHTMLToRawText } from "./utils"
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
import debounce from "lodash/debounce"
import { Semaphore, SemaphoreInterface, formatBytes } from "../../lib/helpers"
import { decryptNoteKeyParticipant, encryptNotePreview, encryptNoteContent } from "../../lib/crypto"
import { MAX_NOTE_SIZE } from "../../lib/constants"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import Spinner from "../../components/Spinner"

const NoteScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const dimensions = useWindowDimensions()
	const [contentType, setContentType] = useState<NoteType>("text")
	const [content, setContent] = useState<string>("")
	const [editedContent, setEditedContent] = useState<string>("")
	const [synced, setSynced] = useState<{ content: boolean; title: boolean }>({ content: true, title: true })
	const prevContent = useRef<string>("")
	const quillRef = useRef<QuillEditor>(null)
	const insets = useSafeAreaInsets()
	const [userId] = useMMKVNumber("userId", storage)
	const saveMutex = useRef<SemaphoreInterface>(new Semaphore(1)).current
	const contentRef = useRef<string>("")
	const currentNoteRef = useRef<Note>(route.params.note)
	const [contentKey, setContentKey] = useState<string>("content-key-" + Date.now())

	const userHasWritePermissions = useMemo(() => {
		if (!currentNoteRef.current) {
			return false
		}

		return (
			currentNoteRef.current.participants.filter(participant => participant.userId === userId && participant.permissionsWrite)
				.length > 0
		)
	}, [currentNoteRef.current, userId])

	const loadNote = useCallback(async (skipCache: boolean = false) => {
		try {
			const [cache, type] = await Promise.all([
				dbFs.get<string | undefined>("noteContent:" + currentNoteRef.current.uuid),
				dbFs.get<NoteType | undefined>("noteType:" + currentNoteRef.current.uuid)
			])
			const hasCache = cache && type && typeof cache === "string" && typeof type === "string"

			if (!hasCache) {
				setLoadDone(false)
				setContent("")
				setEditedContent("")
				setContentType("text")
			}

			const noteContent = await fetchNoteContent(currentNoteRef.current, skipCache)

			setContentType(noteContent.type)
			setContent(noteContent.content)
			setEditedContent(noteContent.content)
			setSynced(prev => ({ ...prev, content: true, title: true }))

			if (skipCache && JSON.stringify(noteContent.content) !== prevContent.current) {
				setContentKey("content-key-" + Date.now())
			}

			prevContent.current = noteContent.content
			contentRef.current = noteContent.content

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

	const save = useCallback(async () => {
		await saveMutex.acquire()

		try {
			const newContent = `${contentRef.current}`

			if (!userHasWritePermissions || JSON.stringify(newContent) === JSON.stringify(prevContent.current)) {
				setSynced(prev => ({ ...prev, content: true }))

				return
			}

			setSynced(prev => ({ ...prev, content: false }))

			const privateKey = storage.getString("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				currentNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const preview = createNotePreviewFromContentText(newContent, currentNoteRef.current.type)
			const [contentEncrypted, previewEncrypted] = await Promise.all([
				encryptNoteContent(newContent, noteKey),
				encryptNotePreview(preview, noteKey)
			])

			if (contentEncrypted.length >= MAX_NOTE_SIZE) {
				showToast({ message: i18n(lang, "noteTooBig", true, ["__MAXSIZE__"], [formatBytes(MAX_NOTE_SIZE)]) })

				setSynced(prev => ({ ...prev, content: false }))

				return
			}

			await editNoteContent({
				uuid: currentNoteRef.current.uuid,
				preview: previewEncrypted,
				content: contentEncrypted,
				type: currentNoteRef.current.type
			})

			prevContent.current = newContent

			setSynced(prev => ({ ...prev, content: true }))

			await Promise.all([
				newContent.length < 128 * 1024 ? dbFs.set("noteContent:" + currentNoteRef.current.uuid, newContent) : Promise.resolve(),
				dbFs.set("noteType:" + currentNoteRef.current.uuid, currentNoteRef.current.type)
			]).catch(console.error)

			eventListener.emit("refreshNotes")
		} catch (e) {
			console.error(e)

			setSynced(prev => ({ ...prev, content: false }))

			showToast({ message: e.toString() })
		} finally {
			saveMutex.release()
		}
	}, [lang, userId, userHasWritePermissions, currentNoteRef.current])

	const debouncedSave = useCallback(debounce(save, 2000), [])

	useEffect(() => {
		contentRef.current = editedContent

		debouncedSave()
	}, [editedContent])

	useEffect(() => {
		loadNote()

		return () => {
			save()
		}
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
					<View
						style={{
							width: "33%",
							justifyContent: "center",
							alignItems: "flex-end",
							paddingRight: 15
						}}
					>
						{synced.content && synced.title ? (
							<Ionicon
								name="checkmark-circle-outline"
								size={23}
								color={getColor(darkMode, "green")}
							/>
						) : (
							<Spinner>
								<Ionicon
									name="sync-outline"
									size={23}
									color={getColor(darkMode, "textPrimary")}
								/>
							</Spinner>
						)}
					</View>
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
								key={contentKey}
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
                                        padding-bottom: 300px !important;
                                        margin-top: -5px !important;
                                    }
                                    `
								]}
								onHtmlChange={data => {
									if (!data || !data.html || data.html.length === 0) {
										return
									}

									contentRef.current = data.html

									setSynced(prev => ({ ...prev, content: false }))
									setEditedContent(data.html)
								}}
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

									contentRef.current = value

									setSynced(prev => ({ ...prev, content: false }))
									setEditedContent(value)
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
								key={contentKey}
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
                                        padding-bottom: 150px !important;
                                        margin-top: 0px !important;
                                    }
                                    `
								]}
								onHtmlChange={data => {
									if (!data || !data.html) {
										return
									}

									const text = convertHTMLToRawText(data.html)

									if (text.length === 0) {
										return
									}

									contentRef.current = text

									setSynced(prev => ({ ...prev, content: false }))
									setEditedContent(text)
								}}
							/>
						</KeyboardAvoidingView>
					)}
				</>
			)}
		</View>
	)
})

export default NoteScreen
