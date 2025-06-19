import { memo, useRef, useMemo, useEffect, useCallback } from "react"
import { FlatList, type ListRenderItemInfo } from "react-native"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useNotesTagsQuery from "@/queries/useNotesTagsQuery"
import { useTranslation } from "react-i18next"
import Tag from "./tag"

export const Item = memo((info: ListRenderItemInfo<string>) => {
	const { t } = useTranslation()

	const notesTagsQuery = useNotesTagsQuery({
		enabled: false
	})

	const tag = useMemo(() => {
		return notesTagsQuery.data?.find(t => t.uuid === info.item) ?? null
	}, [notesTagsQuery.data, info.item])

	const tagTranslation = useMemo(() => {
		switch (info.item) {
			case "all":
				return t("notes.tags.names.all")
			case "favorited":
				return t("notes.tags.names.favorited")
			case "pinned":
				return t("notes.tags.names.pinned")
			case "archived":
				return t("notes.tags.names.archived")
			case "trash":
				return t("notes.tags.names.trash")
			case "shared":
				return t("notes.tags.names.shared")
			default:
				return "_TAG_"
		}
	}, [info.item, t])

	return (
		<Tag
			tag={tag}
			name={tag ? tag.name : tagTranslation}
			id={tag ? tag.uuid : info.item}
			withRightMargin={true}
		/>
	)
})

Item.displayName = "Item"

export const ListHeader = memo(() => {
	const tagsListRef = useRef<FlatList<string>>(null)
	const [selectedTag] = useMMKVString("selectedTag", mmkvInstance)

	const notesTagsQuery = useNotesTagsQuery({
		enabled: false
	})

	const tags = useMemo(() => {
		if (notesTagsQuery.status !== "success") {
			return []
		}

		return notesTagsQuery.data.sort((a, b) =>
			a.name.localeCompare(b.name, "en", {
				numeric: true
			})
		)
	}, [notesTagsQuery.data, notesTagsQuery.status])

	const listTags = useMemo(() => {
		return ["all", "favorited", "pinned", "archived", "shared", "trash", ...tags.map(tag => tag.uuid), "plus"]
	}, [tags])

	const renderItem = useCallback((info: ListRenderItemInfo<string>) => {
		return <Item {...info} />
	}, [])

	const keyExtractor = useCallback((item: string) => item, [])

	useEffect(() => {
		if (selectedTag) {
			tagsListRef?.current?.scrollToItem({
				animated: true,
				viewPosition: 0.5,
				item: selectedTag
			})
		}
	}, [selectedTag])

	return (
		<FlatList
			ref={tagsListRef}
			horizontal={true}
			showsHorizontalScrollIndicator={false}
			showsVerticalScrollIndicator={false}
			keyExtractor={keyExtractor}
			data={listTags}
			renderItem={renderItem}
			contentContainerStyle={{
				paddingTop: 8,
				paddingHorizontal: 16,
				paddingBottom: 8
			}}
			windowSize={3}
			removeClippedSubviews={true}
			initialNumToRender={16}
			maxToRenderPerBatch={8}
			updateCellsBatchingPeriod={100}
		/>
	)
})

ListHeader.displayName = "ListHeader"

export default ListHeader
