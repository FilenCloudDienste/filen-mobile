import Container from "@/components/Container"
import ListEmpty from "@/components/listEmpty"
import { Button } from "@/components/nativewindui/Button"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownNativeIcon } from "@/components/nativewindui/DropdownMenu/createDropdownNativeIcon"
import type { DropdownItem } from "@/components/nativewindui/DropdownMenu/types"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Text } from "@/components/nativewindui/Text"
import Header from "@/components/notes/header"
import Item from "@/components/notes/item"
import ListHeader from "@/components/notes/listHeader"
import MasonryGrid from "@/components/notes/masonryGrid"
import useDimensions from "@/hooks/useDimensions"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"
import { t, translateMemoized } from "@/lib/i18n"
import mmkvInstance from "@/lib/mmkv"
import { sortAndFilterNotes } from "@/lib/utils"
import useNotesQuery from "@/queries/useNotes.query"
import useNotesTagsQuery from "@/queries/useNotesTags.query"
import notesService from "@/services/notes.service"
import { useNotesStore } from "@/stores/notes.store"
import type { Note, NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { Icon } from "@roninoss/icons"
import { FlashList, type FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list"
import { useFocusEffect } from "expo-router"
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshControl, View } from "react-native"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useShallow } from "zustand/shallow"
import { useColorScheme } from "@/lib/useColorScheme"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Notes = memo(() => {
	const { colors } = useColorScheme()
	const [searchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [selectedTag] = useMMKVString("notesSelectedTag", mmkvInstance)
	const [isGridView = false, setIsGridView] = useMMKVBoolean("notesGridView", mmkvInstance)
	const setNotes = useNotesStore(useShallow(state => state.setNotes))
	const listRef = useRef<FlashListRef<Note>>(null)
	const { hasInternet } = useNetInfo()
	const { screen } = useDimensions()

	const createNote = useCallback(async (type: NoteType) => {
		try {
			await notesService.createNote({
				type
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const createNoteDropdownItems = useMemo(() => {
		return [
			createDropdownItem({
				actionKey: "createNote_text",
				title: translateMemoized("notes.header.dropdown.types.text"),
				icon: createDropdownNativeIcon({
					name: "note-text-outline",
					color: colors.foreground
				})
			}),
			createDropdownItem({
				actionKey: "createNote_checklist",
				title: translateMemoized("notes.header.dropdown.types.checklist"),
				icon: createDropdownNativeIcon({
					name: "format-list-checks",
					color: colors.foreground
				})
			}),
			createDropdownItem({
				actionKey: "createNote_markdown",
				title: translateMemoized("notes.header.dropdown.types.markdown"),
				icon: createDropdownNativeIcon({
					name: "file-document-outline",
					color: colors.foreground
				})
			}),
			createDropdownItem({
				actionKey: "createNote_code",
				title: translateMemoized("notes.header.dropdown.types.code"),
				icon: createDropdownNativeIcon({
					name: "code-parentheses",
					color: colors.foreground
				})
			}),
			createDropdownItem({
				actionKey: "createNote_rich",
				title: translateMemoized("notes.header.dropdown.types.rich"),
				icon: createDropdownNativeIcon({
					name: "image-text",
					color: colors.foreground
				})
			})
		]
	}, [colors])

	const onCreateNoteDropdownPress = useCallback(
		async (item: Omit<DropdownItem, "icon">) => {
			try {
				switch (item.actionKey) {
					case "createNote_markdown": {
						await createNote("md")
						break
					}
					case "createNote_checklist": {
						await createNote("checklist")
						break
					}
					case "createNote_text": {
						await createNote("text")
						break
					}
					case "createNote_code": {
						await createNote("code")
						break
					}
					case "createNote_rich": {
						await createNote("rich")
						break
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[createNote]
	)

	const notesQuery = useNotesQuery()
	const notesTagsQuery = useNotesTagsQuery()

	const notes = useMemo(() => {
		if (notesQuery.status !== "success") {
			return []
		}

		return sortAndFilterNotes({
			notes: notesQuery.data,
			searchTerm: searchTerm ?? "",
			selectedTag: selectedTag ?? "all"
		})
	}, [notesQuery.data, notesQuery.status, searchTerm, selectedTag])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await Promise.all([notesQuery.refetch(), notesTagsQuery.refetch()])
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [notesQuery, notesTagsQuery])

	const refreshControl = useMemo(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [onRefresh, refreshing, hasInternet])

	const renderItem = useCallback((info: ListRenderItemInfo<Note>) => {
		return <Item note={info.item} />
	}, [])

	const keyExtractor = useCallback((item: Note) => {
		return item.uuid
	}, [])

	const ListHeaderComponent = useCallback(() => {
		return <ListHeader />
	}, [])

	const ListFooterComponent = useCallback(() => {
		if (notes.length === 0) {
			return undefined
		}

		return (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">
					{t("notes.list.footer", {
						count: notes.length
					})}
				</Text>
			</View>
		)
	}, [notes.length])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={notesQuery.status}
				itemCount={notes.length}
				searchTermLength={(searchTerm ?? "").length}
				texts={{
					error: translateMemoized("notes.list.error"),
					empty: translateMemoized("notes.list.empty"),
					emptySearch: translateMemoized("notes.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "book-open-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [notesQuery.status, notes.length, searchTerm])

	useEffect(() => {
		setNotes(notes)
	}, [notes, setNotes])

	useFocusEffect(
		useCallback(() => {
			useNotesStore.getState().setSelectedNotes([])

			return () => {
				useNotesStore.getState().setSelectedNotes([])
			}
		}, [])
	)

	return (
		<Fragment>
			<Header
				isGridView={isGridView}
				setIsGridView={setIsGridView}
			/>
			<Container>
				{isGridView ? (
					<MasonryGrid
						notes={notes}
						refreshing={refreshing}
						refreshControl={refreshControl}
						ListHeaderComponent={ListHeaderComponent}
						ListFooterComponent={ListFooterComponent}
						ListEmptyComponent={ListEmptyComponent}
					/>
				) : (
					<FlashList
						ref={listRef}
						data={notes}
						contentInsetAdjustmentBehavior="automatic"
						renderItem={renderItem}
						refreshing={refreshing}
						contentContainerStyle={contentContainerStyle}
						ListFooterComponent={ListFooterComponent}
						ListEmptyComponent={ListEmptyComponent}
						ListHeaderComponent={ListHeaderComponent}
						refreshControl={refreshControl}
						keyExtractor={keyExtractor}
						drawDistance={Math.floor(screen.height / 4)}
					/>
				)}
				{hasInternet && (
					<View className="absolute bottom-6 right-6">
						<DropdownMenu
							items={createNoteDropdownItems}
							onItemPress={onCreateNoteDropdownPress}
							materialSide="top"
						>
							<Button
								testID="notes.fab.plus"
								variant="primary"
								size="icon"
								className="w-14 h-14 rounded-full shadow-lg"
							>
								<Icon
									name="plus"
									size={28}
									color="foreground"
								/>
							</Button>
						</DropdownMenu>
					</View>
				)}
			</Container>
		</Fragment>
	)
})

Notes.displayName = "Notes"

export default Notes
