import { memo, useMemo, useCallback, useRef, useEffect, useState } from "react"
import { type Note, type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { useNoteContentQueryNoFocusRefresh } from "@/queries/useNoteContentQuery"
import { Platform, View, ActivityIndicator } from "react-native"
import Container from "@/components/Container"
import TextEditorDOM from "./text/dom"
import { useColorScheme } from "@/lib/useColorScheme"
import { bgColors } from "@/components/textEditor/editor"
import useBottomListContainerPadding from "@/hooks/useBottomListContainerPadding"
import RichTextEditorDOM from "./richtext/dom"
import Checklist from "./checklist"
import nodeWorker from "@/lib/nodeWorker"
import { useDebouncedCallback } from "use-debounce"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"
import { useFocusEffect } from "expo-router"
import useSDKConfig from "@/hooks/useSDKConfig"
import { KeyboardAvoidingView } from "react-native-keyboard-controller"

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
		const bottomListContainerPadding = useBottomListContainerPadding()
		const lastValueRef = useRef<string | null>(null)
		const noteContentQuery = useNoteContentQueryNoFocusRefresh({
			uuid: note.uuid
		})
		const [noteContentQueryDataUpdatedAt, setNoteContentQueryDataUpdatedAt] = useState<number>(noteContentQuery.dataUpdatedAt)
		const didChangeRef = useRef<{
			changed: boolean
			content: string
			uuid: string
			type: NoteType
			timestamp: number
		}>({
			changed: false,
			content: "",
			uuid: "",
			type: "text",
			timestamp: 0
		})
		const [{ userId }] = useSDKConfig()

		const initialValue = useMemo(() => {
			if (noteContentQuery.status !== "success") {
				return null
			}

			lastValueRef.current = noteContentQuery.data.content

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

		const onDidTypeDebounced = useDebouncedCallback(async (params: { type: NoteType; uuid: string; content: string }) => {
			if (isPreview || JSON.stringify(params.content) === JSON.stringify(lastValueRef.current) || !hasWriteAccess) {
				setSyncing(false)

				return
			}

			lastValueRef.current = params.content

			setSyncing(true)

			try {
				await nodeWorker.proxy("editNote", {
					uuid: params.uuid,
					content: params.content,
					type: params.type
				})

				didChangeRef.current = {
					changed: true,
					content: params.content,
					uuid: params.uuid,
					type: params.type,
					timestamp: Date.now()
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				setSyncing(false)
			}
		}, 3000)

		const onDidType = useCallback(
			(value: string) => {
				if (isPreview || !hasWriteAccess) {
					return
				}

				setSyncing(true)

				const valueCopied = `${value}`

				onDidTypeDebounced({
					type: note.type,
					uuid: note.uuid,
					content: valueCopied
				})?.catch(console.error)
			},
			[note.uuid, note.type, onDidTypeDebounced, setSyncing, isPreview, hasWriteAccess]
		)

		useEffect(() => {
			if (noteContentQuery.isFetching || noteContentQuery.isLoading || noteContentQuery.isPending || noteContentQuery.isRefetching) {
				setSyncing(true)
			} else {
				setSyncing(false)
			}
		}, [noteContentQuery.isFetching, setSyncing, noteContentQuery.isLoading, noteContentQuery.isPending, noteContentQuery.isRefetching])

		useEffect(() => {
			if (noteContentQuery.status === "success" && noteContentQuery.dataUpdatedAt !== noteContentQueryDataUpdatedAt) {
				setNoteContentQueryDataUpdatedAt(noteContentQuery.dataUpdatedAt)
			}
		}, [noteContentQuery.status, noteContentQuery.dataUpdatedAt, noteContentQueryDataUpdatedAt])

		useFocusEffect(
			useCallback(() => {
				return () => {
					if (didChangeRef.current.changed && !isPreview && hasWriteAccess) {
						queryUtils.useNoteContentQuerySet({
							uuid: didChangeRef.current.uuid,
							updater: prev => ({
								...prev,
								content: didChangeRef.current.content,
								editedTimestamp: didChangeRef.current.timestamp,
								type: didChangeRef.current.type
							})
						})
					}
				}
			}, [didChangeRef, isPreview, hasWriteAccess])
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
								{note.type === "md" || note.type === "text" || note.type === "code" ? (
									<TextEditorDOM
										key={`${isDarkColorScheme}:${noteContentQueryDataUpdatedAt}:${markdownPreview}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										title={note.title}
										darkMode={isDarkColorScheme}
										platformOS={Platform.OS}
										type={note.type}
										markdownPreview={markdownPreview}
										textForegroundColor={colors.foreground}
										backgroundColor={colors.background}
										readOnly={isPreview ? false : !hasWriteAccess}
										placeholder={note.type === "text" ? "Write something..." : "Write your code..."}
										onDidType={onDidType}
										dom={{
											bounces: false
										}}
									/>
								) : note.type === "checklist" ? (
									<Checklist
										key={`${noteContentQueryDataUpdatedAt}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										readOnly={isPreview ? false : !hasWriteAccess}
										onDidType={onDidType}
									/>
								) : (
									<RichTextEditorDOM
										key={`${isDarkColorScheme}:${noteContentQueryDataUpdatedAt}`}
										initialValue={initialValue}
										onValueChange={() => {}}
										type={note.type}
										readOnly={isPreview ? false : !hasWriteAccess}
										onDidType={onDidType}
										placeholder="Write something..."
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
					{Platform.OS === "ios" && !isPreview && (
						<View
							className="bg-background w-full"
							style={{
								height: bottomListContainerPadding
							}}
						/>
					)}
				</View>
			</Container>
		)
	}
)

Content.displayName = "Content"

export default Content
