import { Fragment, useMemo, useCallback, useState, useEffect, useRef, memo } from "react"
import Container from "@/components/Container"
import ListHeader from "@/components/notes/listHeader"
import useNotesQuery from "@/queries/useNotesQuery"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { View, RefreshControl, ActivityIndicator, type ListRenderItemInfo, FlatList } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useNotesStore } from "@/stores/notes.store"
import useNotesTagsQuery from "@/queries/useNotesTagsQuery"
import { validate as validateUUID } from "uuid"
import mmkvInstance from "@/lib/mmkv"
import { useMMKVString } from "react-native-mmkv"
import Item from "@/components/notes/item"
import Header from "@/components/notes/header"
import { useColorScheme } from "@/lib/useColorScheme"
import { useShallow } from "zustand/shallow"

export const Notes = memo(() => {
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [selectedTag] = useMMKVString("selectedTag", mmkvInstance)
	const setNotes = useNotesStore(useShallow(state => state.setNotes))
	const { colors } = useColorScheme()
	const listRef = useRef<FlatList<Note>>(null)

	const notesQuery = useNotesQuery({})
	const notesTagsQuery = useNotesTagsQuery({})

	const notes = useMemo(() => {
		if (notesQuery.status !== "success") {
			return []
		}

		const lowercaseSearchTerm = searchTerm.toLowerCase().trim()
		const filteredBySearchTerm =
			lowercaseSearchTerm.length > 0
				? notesQuery.data.filter(
						note =>
							note.title.toLowerCase().trim().includes(lowercaseSearchTerm) ||
							note.preview.toLowerCase().trim().includes(lowercaseSearchTerm) ||
							note.type.toLowerCase().trim().includes(lowercaseSearchTerm) ||
							note.tags.some(tag => tag.name.toLowerCase().trim().includes(lowercaseSearchTerm))
					)
				: notesQuery.data

		const selectedTagIsUUID = validateUUID(selectedTag)

		const filteredByTag =
			selectedTag !== "all" && selectedTag !== undefined && selectedTag !== null
				? filteredBySearchTerm.filter(note => {
						if (selectedTagIsUUID) {
							return note.tags.some(tag => tag.uuid === selectedTag)
						}

						if (selectedTag === "favorited") {
							return note.favorite
						}

						if (selectedTag === "pinned") {
							return note.pinned
						}

						if (selectedTag === "trash") {
							return note.trash
						}

						if (selectedTag === "archived") {
							return note.archive
						}

						if (selectedTag === "shared") {
							return note.isOwner && note.participants.length > 1
						}

						return true
					})
				: filteredBySearchTerm

		return filteredByTag.sort((a, b) => {
			if (a.pinned !== b.pinned) {
				return b.pinned ? 1 : -1
			}

			if (a.trash !== b.trash && a.archive === false) {
				return a.trash ? 1 : -1
			}

			if (a.archive !== b.archive) {
				return a.archive ? 1 : -1
			}

			if (a.trash !== b.trash) {
				return a.trash ? 1 : -1
			}

			return b.editedTimestamp - a.editedTimestamp
		})
	}, [notesQuery.data, notesQuery.status, searchTerm, selectedTag])

	const refreshControl = useMemo(() => {
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={async () => {
					setRefreshing(true)

					await Promise.all([notesQuery.refetch(), notesTagsQuery.refetch()]).catch(console.error)

					setRefreshing(false)
				}}
			/>
		)
	}, [notesQuery, notesTagsQuery, refreshing])

	const renderItem = useCallback((info: ListRenderItemInfo<Note>) => {
		return <Item note={info.item} />
	}, [])

	useEffect(() => {
		setNotes(notes)
	}, [notes, setNotes])

	return (
		<Fragment>
			<Header setSearchTerm={setSearchTerm} />
			<Container>
				<FlatList
					ref={listRef}
					data={notes}
					contentInsetAdjustmentBehavior="automatic"
					renderItem={renderItem}
					refreshing={refreshing}
					contentContainerStyle={{
						paddingBottom: 100
					}}
					ListFooterComponent={() => {
						return notes.length > 0 ? (
							<View className="flex-row items-center justify-center h-16">
								<Text className="text-sm">{notes.length} items</Text>
							</View>
						) : undefined
					}}
					ListEmptyComponent={() => {
						if (notesQuery.status === "pending") {
							return (
								<View className="flex-row items-center justify-center h-16">
									<ActivityIndicator
										size="small"
										color={colors.foreground}
									/>
								</View>
							)
						}

						if (notesQuery.status === "error") {
							return (
								<View className="flex-row items-center justify-center h-16">
									<Text className="text-sm">Error loading notes</Text>
								</View>
							)
						}

						if (notes.length === 0) {
							if (searchTerm.length > 0) {
								return (
									<View className="flex-row items-center justify-center h-16">
										<Text className="text-sm">No notes found for this search</Text>
									</View>
								)
							}

							if (selectedTag !== "all") {
								return (
									<View className="flex-row items-center justify-center h-16">
										<Text className="text-sm">No notes found for this tag</Text>
									</View>
								)
							}

							return (
								<View className="flex-row items-center justify-center h-16">
									<Text className="text-sm">No notes found</Text>
								</View>
							)
						}

						return (
							<View className="flex-row items-center justify-center h-16">
								<Text className="text-sm">No notes found</Text>
							</View>
						)
					}}
					ListHeaderComponent={ListHeader}
					refreshControl={refreshControl}
					windowSize={3}
					removeClippedSubviews={true}
					initialNumToRender={32}
					maxToRenderPerBatch={16}
					updateCellsBatchingPeriod={100}
				/>
			</Container>
		</Fragment>
	)
})

Notes.displayName = "Notes"

export default Notes
