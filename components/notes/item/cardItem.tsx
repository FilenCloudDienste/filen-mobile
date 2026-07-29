import Avatar from "@/components/avatar"
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import useNetInfo from "@/hooks/useNetInfo"
import useSDKConfig from "@/hooks/useSDKConfig"
import alerts from "@/lib/alerts"
import assets from "@/lib/assets"
import { cn } from "@/lib/cn"
import { translateMemoized } from "@/lib/i18n"
import { simpleDate } from "@/lib/time"
import { useColorScheme } from "@/lib/useColorScheme"
import { contactName, fastLocaleCompare, hideSearchBarWithDelay } from "@/lib/utils"
import { noteContentQueryGet } from "@/queries/useNoteContent.query"
import { useNotesStore } from "@/stores/notes.store"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"
import { Icon } from "@roninoss/icons"
import { useMappingHelper } from "@shopify/flash-list"
import { useRouter } from "expo-router"
import { memo, useCallback, useMemo } from "react"
import { View } from "react-native"
import { useShallow } from "zustand/shallow"
import { SelectableListItem } from "../../SelectableListItem"
import Menu from "../menu"
import Tag from "../tag"
import { NoteIcon } from "./NoteIcon"

const ICON_SIZE = 20

export const CardItem = memo(({ note }: { note: Note }) => {
	const { push: routerPush } = useRouter()
	const [{ userId }] = useSDKConfig()
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const isSelected = useNotesStore(useShallow(state => state.selectedNotes.some(n => n.uuid === note.uuid)))
	const { getMappingKey } = useMappingHelper()

	const participants = useMemo(() => {
		return note.participants
			.filter(p => p.userId !== userId)
			.sort((a, b) => fastLocaleCompare(contactName(a.email, a.nickName), contactName(b.email, b.nickName)))
			.slice(0, 3)
	}, [note.participants, userId])

	const tags = useMemo(() => {
		return note.tags.sort((a, b) => {
			return fastLocaleCompare(a.name, b.name)
		}).slice(0, 3)
	}, [note.tags])

	const onSelected = useCallback(() => {
		useNotesStore.getState().setSelectedNotes(prev => {
			return isSelected ? prev.filter(i => i.uuid !== note.uuid) : [...prev.filter(i => i.uuid !== note.uuid), note]
		})
	}, [isSelected, note])

	const onPress = useCallback(async () => {
		await hideSearchBarWithDelay(true)

		if (!hasInternet) {
			const cachedContent = noteContentQueryGet({
				uuid: note.uuid
			})

			if (!cachedContent) {
				alerts.error(translateMemoized("errors.youAreOffline"))

				return
			}
		}

		routerPush({
			pathname: "/notes/[uuid]",
			params: {
				uuid: note.uuid
			}
		})
	}, [routerPush, hasInternet, note])

	const noop = useCallback(() => {}, [])

	const previewLines = useMemo(() => {
		if (note.preview.length === 0) return 0
		if (note.preview.length < 50) return 3
		if (note.preview.length < 100) return 6
		if (note.preview.length < 200) return 10
		if (note.preview.length < 400) return 14
		if (note.preview.length < 600) return 18
		if (note.preview.length < 1000) return 28
		return 30
	}, [note.preview.length])

	return (
		<View
			testID={`notes.cardItem.${note.title}`}
			className="p-1"
		>
			<Menu
				note={note}
				type="context"
				insideNote={false}
				markdownPreview={false}
				setMarkdownPreview={noop}
			>
				<Button
					className="bg-card border border-border rounded-xl"
					variant="plain"
					size="none"
					onPress={onPress}
				>
					<SelectableListItem
						selected={isSelected}
						onSelected={onSelected}
						selectionActive={selectedNotesCount > 0}
					>
						<View className="flex-col p-3 gap-2">
							{/* Header with title and icons */}
							<View className="flex-row items-start gap-2">
								<NoteIcon
									note={note}
									iconSize={ICON_SIZE}
								/>
								<Text
									numberOfLines={2}
									ellipsizeMode="tail"
									className="font-medium text-sm flex-1"
								>
									{note.title}
								</Text>
								<View className="flex-row gap-1">
									{note.pinned && (
										<Icon
											name="pin"
											color={colors.grey}
											size={14}
										/>
									)}
									{note.favorite && (
										<Icon
											name="heart"
											color="#ef4444"
											size={14}
										/>
									)}
								</View>
							</View>

							{/* Preview content */}
							{note.preview.length > 0 && (
								<Text
									numberOfLines={previewLines}
									ellipsizeMode="tail"
									className="text-muted-foreground text-xs leading-4"
								>
									{note.preview}
								</Text>
							)}

							{/* Tags */}
							{tags.length > 0 && (
								<View className="flex-row gap-1 flex-wrap">
									{tags.map((tag, index) => (
										<Tag
											key={getMappingKey(tag.uuid, index)}
											tag={tag}
											name={tag.name}
											id={tag.uuid}
										/>
									))}
								</View>
							)}

							{/* Footer with date and participants */}
							<View className="flex-row items-center justify-between mt-1">
								<Text
									numberOfLines={1}
									className="text-muted-foreground text-xs"
								>
									{simpleDate(note.editedTimestamp)}
								</Text>
								{participants.length > 0 && (
									<View className="flex-row items-center">
										{participants.map((participant, index) => (
											<Avatar
												key={getMappingKey(participant.userId, index)}
												className={cn("h-5 w-5", index > 0 && "-ml-2")}
												source={
													participant.avatar?.startsWith("https")
														? { uri: participant.avatar }
														: { uri: assets.uri.images.avatar_fallback() }
												}
												style={{
													width: 20,
													height: 20
												}}
											/>
										))}
									</View>
								)}
							</View>
						</View>
					</SelectableListItem>
				</Button>
			</Menu>
		</View>
	)
})

CardItem.displayName = "CardItem"

export default CardItem
