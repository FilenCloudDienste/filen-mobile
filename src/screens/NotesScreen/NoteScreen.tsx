import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"
import { View, KeyboardAvoidingView, Keyboard, TouchableOpacity, ActivityIndicator, AppState, Platform } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, CommonActions, useIsFocused } from "@react-navigation/native"
import { NoteType, Note, editNoteContent, noteHistoryRestore } from "../../lib/api"
import { fetchNoteContent, quillStyle, createNotePreviewFromContentText, fetchNotesAndTags } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import QuillEditor from "react-native-cn-quill"
import Checklist from "./Checklist"
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"
import debounce from "lodash/debounce"
import { Semaphore, SemaphoreInterface, formatBytes } from "../../lib/helpers"
import { decryptNoteKeyParticipant, encryptNotePreview, encryptNoteContent, decryptNoteTitle } from "../../lib/crypto"
import { MAX_NOTE_SIZE } from "../../lib/constants"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import Spinner from "../../components/Spinner"
import TextEditor from "../../components/TextEditor"
import Markdown from "react-native-marked"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import useKeyboardOffset from "../../lib/hooks/useKeyboardOffset"
import { SocketEvent } from "../../lib/services/socket"

const NoteScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const [contentType, setContentType] = useState<NoteType>("text")
	const [content, setContent] = useState<string>("")
	const [editedContent, setEditedContent] = useState<string>("")
	const [synced, setSynced] = useState<{ content: boolean; title: boolean }>({ content: true, title: true })
	const prevContent = useRef<string>("")
	const quillRef = useRef<QuillEditor>(null)
	const [userId] = useMMKVNumber("userId", storage)
	const saveMutex = useRef<SemaphoreInterface>(new Semaphore(1)).current
	const contentRef = useRef<string>("")
	const currentNoteRef = useRef<Note>(route.params.note)
	const [contentKey, setContentKey] = useState<string>("content-key-" + Date.now())
	const [showPreview, setShowPreview] = useState<boolean>(false)
	const [keyboardShowing, setKeyboardShowing] = useState<boolean>(false)
	const [title, setTitle] = useState<string>(currentNoteRef.current.title)
	const networkInfo = useNetworkInfo()
	const readOnly = useRef<boolean>(route.params.readOnly).current
	const historyMode = useRef<boolean>(route.params.historyMode).current
	const historyId = useRef<number>(route.params.historyId).current
	const loadNoteTimeout = useRef<number>(0)
	const isFocused = useIsFocused()
	const keyboardOffset = useKeyboardOffset()

	const userHasWritePermissions = useMemo(() => {
		if (!currentNoteRef.current) {
			return false
		}

		return (
			currentNoteRef.current.participants.filter(participant => participant.userId === userId && participant.permissionsWrite)
				.length > 0
		)
	}, [currentNoteRef.current, userId])

	const loadNote = useCallback(
		async (skipCache: boolean = false) => {
			if (skipCache && !networkInfo.online) {
				return
			}

			if (skipCache) {
				if (loadNoteTimeout.current > Date.now()) {
					return
				}

				loadNoteTimeout.current = Date.now() + 1000
			}

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

				contentRef.current = noteContent.content
				prevContent.current = noteContent.content

				if (noteContent.cache && networkInfo.online) {
					loadNote(true)
				}
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				setLoadDone(true)
			}
		},
		[networkInfo]
	)

	const restore = useCallback(async () => {
		if (!currentNoteRef.current) {
			return
		}

		showFullScreenLoadingModal()

		try {
			await noteHistoryRestore(currentNoteRef.current.uuid, historyId)

			const notesAndTags = await fetchNotesAndTags(true)

			eventListener.emit("notesUpdate", notesAndTags.notes)
			eventListener.emit("refreshNotes")

			navigation.dispatch(
				CommonActions.reset({
					index: 0,
					routes: [
						{
							name: "NotesScreen"
						}
					]
				})
			)
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [currentNoteRef.current, historyId, navigation])

	const save = useCallback(async () => {
		if (!networkInfo.online) {
			return
		}

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
				dbFs.set("noteContent:" + currentNoteRef.current.uuid, newContent),
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
	}, [lang, userId, userHasWritePermissions, currentNoteRef.current, networkInfo])

	const debouncedSave = useCallback(debounce(save, 2000), [])

	useEffect(() => {
		contentRef.current = editedContent

		setSynced(prev => ({ ...prev, content: false }))

		debouncedSave()
	}, [editedContent])

	useEffect(() => {
		if (isFocused) {
			loadNote(true)
		}
	}, [isFocused])

	useEffect(() => {
		loadNote()

		const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => setKeyboardShowing(true))
		const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => setKeyboardShowing(false))
		const keyboardWillHideListener = Keyboard.addListener("keyboardWillHide", () => setKeyboardShowing(false))

		const noteTitleEditedListener = eventListener.on("noteTitleEdited", ({ uuid, title }: { uuid: string; title: string }) => {
			if (uuid === currentNoteRef.current.uuid) {
				setTitle(title)
			}
		})

		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState === "active") {
				loadNote(true)
			}
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadNote(true)
		})

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (event.type === "noteContentEdited") {
				if (event.data.editorId !== storage.getNumber("userId")) {
					loadNote(true)
				}
			} else if (
				event.type === "noteParticipantNew" ||
				event.type === "noteParticipantPermissions" ||
				event.type === "noteParticipantRemoved"
			) {
				loadNote(true)
			} else if (event.type === "noteTitleEdited") {
				try {
					const userId = storage.getNumber("userId")
					const privateKey = storage.getString("privateKey")
					const noteKey = await decryptNoteKeyParticipant(
						currentNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
						privateKey
					)
					const titleDecrypted = await decryptNoteTitle(event.data.title, noteKey)

					setTitle(titleDecrypted)
				} catch (e) {
					console.error(e)
				}
			}
		})

		return () => {
			keyboardDidShowListener.remove()
			keyboardDidHideListener.remove()
			keyboardWillHideListener.remove()
			noteTitleEditedListener.remove()
			appStateChangeListener.remove()
			socketAuthedListener.remove()
			socketEventListener.remove()

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
				middleText={title}
				onPressMiddleText={
					userHasWritePermissions
						? () => {
								if (!networkInfo.online) {
									return
								}

								eventListener.emit("openNoteTitleDialog", currentNoteRef.current)
						  }
						: undefined
				}
				onLongPressMiddleText={() => {
					eventListener.emit("openNoteActionSheet", currentNoteRef.current)
				}}
				rightComponent={
					<View
						style={{
							width: "33%",
							justifyContent: "center",
							alignItems: "flex-end",
							paddingRight: 15
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center"
							}}
						>
							{readOnly ? (
								<>
									{currentNoteRef.current.type === "md" && (
										<TouchableOpacity
											onPress={() => setShowPreview(prev => !prev)}
											style={{
												marginRight: 10
											}}
										>
											<Ionicon
												name={showPreview ? "eye-off-outline" : "eye-outline"}
												style={{
													flexShrink: 0
												}}
												color={getColor(darkMode, "linkPrimary")}
												size={24}
											/>
										</TouchableOpacity>
									)}
									{historyMode && (
										<TouchableOpacity onPress={restore}>
											<Ionicon
												name="refresh-outline"
												style={{
													flexShrink: 0
												}}
												color={getColor(darkMode, "linkPrimary")}
												size={22}
											/>
										</TouchableOpacity>
									)}
								</>
							) : (
								<>
									{currentNoteRef.current.type === "md" ? (
										<TouchableOpacity
											style={{
												marginRight: 10
											}}
											onPress={() => setShowPreview(prev => !prev)}
										>
											<Ionicon
												name={showPreview ? "eye-off-outline" : "eye-outline"}
												style={{
													flexShrink: 0
												}}
												color={getColor(darkMode, "linkPrimary")}
												size={24}
											/>
										</TouchableOpacity>
									) : (
										<>
											{keyboardShowing && (
												<TouchableOpacity
													style={{
														marginRight: 10
													}}
													onPress={() => {
														try {
															Keyboard.dismiss()
														} catch (e) {
															console.error(e)
														}
													}}
												>
													<Ionicon
														name="chevron-down-outline"
														style={{
															flexShrink: 0
														}}
														color={getColor(darkMode, "linkPrimary")}
														size={24}
													/>
												</TouchableOpacity>
											)}
										</>
									)}
									{!networkInfo.online ? (
										<Ionicon
											name="cloud-offline-outline"
											size={22}
											color={getColor(darkMode, "textSecondary")}
										/>
									) : synced.content && synced.title ? (
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
								</>
							)}
						</View>
					</View>
				}
			/>
			{loadDone ? (
				<>
					{contentType === "rich" && (
						<KeyboardAvoidingView
							style={{
								height: "100%",
								width: "100%",
								backgroundColor: "transparent"
							}}
							behavior={Platform.OS === "android" ? undefined : "padding"}
							keyboardVerticalOffset={keyboardOffset}
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
									placeholder: i18n(lang, "noteContentPlaceholder"),
									theme: "snow",
									modules: {
										toolbar: readOnly
											? false
											: [
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
									if (!data || !data.html || readOnly) {
										return
									}

									setEditedContent(data.html)
								}}
							/>
						</KeyboardAvoidingView>
					)}
					{contentType === "checklist" && (
						<View
							style={{
								marginTop: 15
							}}
						>
							<Checklist
								darkMode={darkMode}
								content={content}
								readOnly={readOnly}
								onChange={value => {
									if (readOnly) {
										return
									}

									if (value === "" || value.indexOf("<ul data-checked") === -1 || value === "<p><br></p>") {
										value = '<ul data-checked="false"><li><br></li></ul>'
									}

									if (value.indexOf("<p") !== -1) {
										value = value.replace(/<p>.*?<\/p>/g, "")
									}

									setEditedContent(value)
								}}
							/>
						</View>
					)}
					{(contentType === "code" || contentType === "text" || contentType === "md") && (
						<>
							{contentType === "md" && showPreview ? (
								<View
									style={{
										width: "100%",
										height: "auto",
										marginTop: 10
									}}
								>
									<Markdown
										value={editedContent}
										flatListProps={{
											contentContainerStyle: {
												paddingLeft: 15,
												paddingRight: 15,
												paddingBottom: 100,
												paddingTop: 0,
												backgroundColor: getColor(darkMode, "backgroundPrimary")
											},
											style: {
												backgroundColor: getColor(darkMode, "backgroundPrimary")
											}
										}}
										styles={{
											strong: {
												color: getColor(darkMode, "textPrimary")
											},
											h1: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											h2: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											h3: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											h4: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											h5: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											h6: {
												color: getColor(darkMode, "textPrimary"),
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											hr: {
												borderBottomColor: getColor(darkMode, "primaryBorder")
											},
											code: {
												backgroundColor: getColor(darkMode, "backgroundSecondary"),
												borderRadius: 10
											},
											link: {
												color: getColor(darkMode, "linkPrimary"),
												fontStyle: "normal"
											},
											codespan: {
												backgroundColor: getColor(darkMode, "backgroundSecondary"),
												borderRadius: 5,
												color: getColor(darkMode, "textPrimary"),
												paddingLeft: 5,
												paddingRight: 5
											},
											table: {
												borderColor: getColor(darkMode, "primaryBorder"),
												borderWidth: 1,
												borderRadius: 5
											},
											tableCell: {
												backgroundColor: getColor(darkMode, "backgroundSecondary")
											},
											tableRow: { backgroundColor: getColor(darkMode, "backgroundTertiary") },
											text: {
												color: getColor(darkMode, "textPrimary")
											},
											image: {
												borderRadius: 10
											},
											li: {
												color: getColor(darkMode, "textPrimary"),
												fontWeight: "bold"
											},
											strikethrough: {
												color: getColor(darkMode, "textPrimary")
											},
											em: {
												color: getColor(darkMode, "textPrimary")
											},
											blockquote: {
												borderLeftColor: getColor(darkMode, "primaryBorder")
											}
										}}
									/>
								</View>
							) : (
								<KeyboardAvoidingView
									style={{
										height: "100%",
										width: "100%",
										backgroundColor: "transparent",
										paddingTop: 10
									}}
									behavior={Platform.OS === "android" ? undefined : "padding"}
									keyboardVerticalOffset={keyboardOffset}
								>
									<TextEditor
										darkMode={darkMode}
										value={content}
										readOnly={readOnly}
										placeholder={i18n(lang, "noteContentPlaceholder")}
										onChange={value => {
											if (readOnly) {
												return
											}

											setEditedContent(value)
										}}
									/>
								</KeyboardAvoidingView>
							)}
						</>
					)}
				</>
			) : (
				<View
					style={{
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						width: "100%",
						height: "100%"
					}}
				>
					<ActivityIndicator
						size="small"
						color={getColor(darkMode, "textPrimary")}
						style={{
							marginTop: -50
						}}
					/>
				</View>
			)}
		</View>
	)
})

export default NoteScreen
