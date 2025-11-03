import { memo, useRef, useMemo, useCallback } from "react"
import { FlashList, type ListRenderItemInfo, type FlashListRef } from "@shopify/flash-list"
import useNotesTagsQuery from "@/queries/useNotesTags.query"
import { translateMemoized } from "@/lib/i18n"
import Tag from "./tag"
import useNetInfo from "@/hooks/useNetInfo"
import { View } from "react-native"
import OfflineListHeader from "../offlineListHeader"
import useDimensions from "@/hooks/useDimensions"
import { fastLocaleCompare } from "@/lib/utils"

export const Item = memo((info: ListRenderItemInfo<string>) => {
	const notesTagsQuery = useNotesTagsQuery({
		enabled: false
	})

	const tag = useMemo(() => {
		return notesTagsQuery.data?.find(t => t.uuid === info.item) ?? null
	}, [notesTagsQuery.data, info.item])

	const tagTranslation = useMemo(() => {
		switch (info.item) {
			case "all": {
				return translateMemoized("notes.tags.names.all")
			}

			case "favorited": {
				return translateMemoized("notes.tags.names.favorited")
			}

			case "pinned": {
				return translateMemoized("notes.tags.names.pinned")
			}

			case "archived": {
				return translateMemoized("notes.tags.names.archived")
			}

			case "trash": {
				return translateMemoized("notes.tags.names.trash")
			}

			case "shared": {
				return translateMemoized("notes.tags.names.shared")
			}

			default: {
				return "_TAG_"
			}
		}
	}, [info.item])

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
	const tagsListRef = useRef<FlashListRef<string>>(null)
	const { hasInternet } = useNetInfo()
	const { screen } = useDimensions()

	const notesTagsQuery = useNotesTagsQuery({
		enabled: false
	})

	const tags = useMemo(() => {
		if (notesTagsQuery.status !== "success") {
			return []
		}

		return notesTagsQuery.data.sort((a, b) => fastLocaleCompare(a.name, b.name))
	}, [notesTagsQuery.data, notesTagsQuery.status])

	const listTags = useMemo(() => {
		return [
			"all",
			"favorited",
			"pinned",
			"archived",
			"shared",
			"trash",
			...tags.map(tag => tag.uuid),
			...(hasInternet ? ["plus"] : [])
		] satisfies string[]
	}, [tags, hasInternet])

	const renderItem = useCallback((info: ListRenderItemInfo<string>) => {
		return <Item {...info} />
	}, [])

	const keyExtractor = useCallback((item: string) => item, [])

	const contentContainerStyle = useMemo(() => {
		return {
			paddingTop: !hasInternet ? 16 : 8,
			paddingHorizontal: 16,
			paddingBottom: 8
		}
	}, [hasInternet])

	return (
		<View className="shrink-0">
			{!hasInternet && <OfflineListHeader />}
			<FlashList
				ref={tagsListRef}
				horizontal={true}
				data={listTags}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				keyExtractor={keyExtractor}
				renderItem={renderItem}
				contentContainerStyle={contentContainerStyle}
				maxItemsInRecyclePool={0}
				drawDistance={Math.floor(screen.width / 2)}
			/>
		</View>
	)
})

ListHeader.displayName = "ListHeader"

export default ListHeader
