import { Fragment, useMemo, useCallback, useState, useEffect, useRef, memo } from "react"
import Container from "@/components/Container"
import ListHeader from "@/components/notes/listHeader"
import useNotesQuery from "@/queries/useNotesQuery"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { View, RefreshControl, type ListRenderItemInfo, FlatList } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useNotesStore } from "@/stores/notes.store"
import useNotesTagsQuery from "@/queries/useNotesTagsQuery"
import mmkvInstance from "@/lib/mmkv"
import { useMMKVString } from "react-native-mmkv"
import Item from "@/components/notes/item"
import Header from "@/components/notes/header"
import { useShallow } from "zustand/shallow"
import alerts from "@/lib/alerts"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"
import { sortAndFilterNotes } from "@/lib/utils"
import { useFocusEffect } from "expo-router"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Notes = memo(() => {
	const [searchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [selectedTag] = useMMKVString("notesSelectedTag", mmkvInstance)
	const setNotes = useNotesStore(useShallow(state => state.setNotes))
	const listRef = useRef<FlatList<Note>>(null)
	const { t } = useTranslation()

	const notesQuery = useNotesQuery({})
	const notesTagsQuery = useNotesTagsQuery({})

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
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [onRefresh, refreshing])

	const renderItem = useCallback((info: ListRenderItemInfo<Note>) => {
		return <Item note={info.item} />
	}, [])

	const listFooter = useMemo(() => {
		return notes.length > 0 ? (
			<View className="flex-row items-center justify-center h-16">
				<Text className="text-sm">
					{t("notes.list.footer", {
						count: notes.length
					})}
				</Text>
			</View>
		) : undefined
	}, [notes.length, t])

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={notesQuery.status}
				itemCount={notes.length}
				searchTermLength={(searchTerm ?? "").length}
				texts={{
					error: t("notes.list.error"),
					empty: t("notes.list.empty"),
					emptySearch: t("notes.list.emptySearch")
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
	}, [notesQuery.status, notes.length, t, searchTerm])

	useEffect(() => {
		setNotes(notes)
	}, [notes, setNotes])

	useFocusEffect(
		useCallback(() => {
			useNotesStore.getState().setSelectedNotes([])
		}, [])
	)

	return (
		<Fragment>
			<Header />
			<Container>
				<FlatList
					ref={listRef}
					data={notes}
					contentInsetAdjustmentBehavior="automatic"
					renderItem={renderItem}
					refreshing={refreshing}
					contentContainerStyle={contentContainerStyle}
					ListFooterComponent={listFooter}
					ListEmptyComponent={listEmpty}
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
