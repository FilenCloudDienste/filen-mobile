import { memo, useRef, useMemo, useCallback } from "react"
import { FlashList, type ListRenderItemInfo, type FlashListRef } from "@shopify/flash-list"
import useNotesTagsQuery from "@/queries/useNotesTagsQuery"
import { useTranslation } from "react-i18next"
import Tag from "./tag"
import useNetInfo from "@/hooks/useNetInfo"
import { View } from "react-native"
import OfflineListHeader from "../offlineListHeader"

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
			case "all": {
				return t("notes.tags.names.all")
			}

			case "favorited": {
				return t("notes.tags.names.favorited")
			}

			case "pinned": {
				return t("notes.tags.names.pinned")
			}

			case "archived": {
				return t("notes.tags.names.archived")
			}

			case "trash": {
				return t("notes.tags.names.trash")
			}

			case "shared": {
				return t("notes.tags.names.shared")
			}

			default: {
				return "_TAG_"
			}
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
	const tagsListRef = useRef<FlashListRef<string>>(null)
	const { hasInternet } = useNetInfo()

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
				drawDistance={0}
			/>
		</View>
	)
})

ListHeader.displayName = "ListHeader"

export default ListHeader
