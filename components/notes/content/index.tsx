import { memo, useMemo, useCallback, useRef, useEffect } from "react"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"
import { useNoteContentQuery } from "@/queries/useNoteContent.query"
import { Platform, View, ActivityIndicator } from "react-native"
import Container from "@/components/Container"
import TextEditorDOM from "./text/dom"
import { useColorScheme } from "@/lib/useColorScheme"
import { bgColors } from "@/components/textEditor/editor"
import RichTextEditorDOM from "./richtext/dom"
import Checklist from "./checklist"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { useFocusEffect } from "expo-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import { KeyboardAvoidingView } from "react-native-keyboard-controller"
import useNetInfo from "@/hooks/useNetInfo"
import { translateMemoized } from "@/lib/i18n"
import { createExecutableTimeout } from "@/lib/utils"
import Semaphore from "@/lib/semaphore"

const editMutex = new Semaphore(1)

export const Content = memo(
	({
		note,
		setSyncing,
		isPreview,
		markdownPreview
	}: {
		note: Note
		setSyncing: React.Dispatch<React.SetStateAction<boolean>>
		isPreview: boolean
		markdownPreview: boolean
	}) => {
		const { isDarkColorScheme, colors } = useColorScheme()
		const lastNoteContentRef = useRef<string | null>(null)
		const noteContentQuery = useNoteContentQuery({
			uuid: note.uuid
		})
		const [{ userId }] = useSDKConfig()
		const { hasInternet } = useNetInfo()
		const onValueChangeTimeoutRef = useRef<ReturnType<typeof createExecutableTimeout> | null>(null)

		const isFetching = useMemo(() => {
			return (
				noteContentQuery.isRefetching ||
				noteContentQuery.isLoading ||
				noteContentQuery.isFetching ||
				noteContentQuery.isPending ||
				noteContentQuery.isError ||
				noteContentQuery.isRefetchError ||
				noteContentQuery.isLoadingError
			)
		}, [
			noteContentQuery.isError,
			noteContentQuery.isFetching,
			noteContentQuery.isLoading,
			noteContentQuery.isLoadingError,
			noteContentQuery.isPending,
			noteContentQuery.isRefetchError,
			noteContentQuery.isRefetching
		])

		const initialValue = useMemo(() => {
			if (noteContentQuery.status !== "success") {
				return null
			}

			lastNoteContentRef.current = noteContentQuery.data.content

			return noteContentQuery.data.content
		}, [noteContentQuery.data, noteContentQuery.status])

		const hasWriteAccess = useMemo(() => {
			if (note.isOwner) {
				return true
			}

			return note.participants.some(participant => {
				if (participant.userId === userId) {
					return participant.permissionsWrite
				}

				return false
			})
		}, [note.isOwner, note.participants, userId])

		const containerStyle = useMemo(() => {
			return {
				backgroundColor:
					note.type === "md" || note.type === "code"
						? bgColors[markdownPreview ? "markdown" : "normal"][isDarkColorScheme ? "dark" : "light"]
						: colors.background
			}
		}, [isDarkColorScheme, markdownPreview, note.type, colors.background])

		const onValueChange = useCallback(
			(value: string) => {
				if (!note || !hasWriteAccess) {
					return
				}

				setSyncing(true)

				onValueChangeTimeoutRef.current?.cancel()

				onValueChangeTimeoutRef.current = createExecutableTimeout(async () => {
					await editMutex.acquire()

					try {
						if (
							lastNoteContentRef.current &&
							Buffer.from(value, "utf-8").toString("hex") === Buffer.from(lastNoteContentRef.current, "utf-8").toString("hex")
						) {
							return
						}

						await nodeWorker.proxy("editNote", {
							uuid: note.uuid,
							content: value,
							type: note.type
						})

						lastNoteContentRef.current = value
					} catch (e) {
						console.error(e)

						if (e instanceof Error) {
							alerts.error(e.message)
						}
					} finally {
						editMutex.release()

						setSyncing(false)
					}
				}, 2500)
			},
			[hasWriteAccess, note, setSyncing]
		)

		useEffect(() => {
			setSyncing(isFetching || noteContentQuery.status === "pending")
		}, [isFetching, setSyncing, noteContentQuery.status])

		useFocusEffect(
			useCallback(() => {
				return () => {
					onValueChangeTimeoutRef.current?.execute()
				}
			}, [])
		)

		return (
			<Container>
				<View className="flex-1 flex-col">
					<View
						className="flex-1"
						style={containerStyle}
					>
						{initialValue === null ? (
							<View className="flex-1 items-center justify-center">
								<ActivityIndicator
									size="small"
									color={colors.foreground}
								/>
							</View>
						) : (
							<KeyboardAvoidingView
								behavior="padding"
								style={{
									flex: 1
								}}
							>
								{(isFetching || noteContentQuery.status === "pending") && (
									<View className="absolute top-0 right-0 bottom-0 left-0 z-50 items-center justify-center bg-background opacity-50">
										<ActivityIndicator
											size="small"
											color={colors.foreground}
											className="-mt-16"
										/>
									</View>
								)}
								{note.type === "md" || note.type === "text" || note.type === "code" ? (
									<TextEditorDOM
										key={`${isDarkColorScheme}:${noteContentQuery.dataUpdatedAt}:${markdownPreview}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										title={note.title}
										darkMode={isDarkColorScheme}
										platformOS={Platform.OS}
										type={note.type}
										markdownPreview={markdownPreview}
										textForegroundColor={colors.foreground}
										backgroundColor={colors.background}
										readOnly={isPreview ? false : !hasWriteAccess || !hasInternet}
										placeholder={
											note.type === "text"
												? translateMemoized("notes.content.placeholders.text")
												: translateMemoized("notes.content.placeholders.code")
										}
										onDidType={onValueChange}
										dom={{
											bounces: false
										}}
									/>
								) : note.type === "checklist" ? (
									<Checklist
										key={`${noteContentQuery.dataUpdatedAt}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										readOnly={isPreview ? false : !hasWriteAccess || !hasInternet}
										onDidType={onValueChange}
									/>
								) : (
									<RichTextEditorDOM
										key={`${isDarkColorScheme}:${noteContentQuery.dataUpdatedAt}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										type={note.type}
										readOnly={isPreview ? false : !hasWriteAccess || !hasInternet}
										onDidType={onValueChange}
										placeholder={translateMemoized("notes.content.placeholders.text")}
										darkMode={isDarkColorScheme}
										platformOS={Platform.OS}
										isPreview={isPreview}
										colors={{
											text: {
												foreground: colors.foreground,
												primary: colors.primary,
												muted: colors.grey
											},
											background: {
												primary: colors.background,
												secondary: colors.card
											}
										}}
										dom={{
											bounces: false
										}}
									/>
								)}
							</KeyboardAvoidingView>
						)}
					</View>
				</View>
			</Container>
		)
	}
)

Content.displayName = "Content"

export default Content
