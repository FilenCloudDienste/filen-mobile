import { useMemo, Fragment, useCallback, memo } from "react"
import { View, Platform } from "react-native"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { type NoteHistory } from "@filen/sdk/dist/types/api/v3/notes/history"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { simpleDate } from "@/lib/utils"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"
import useNoteHistoryQuery from "@/queries/useNoteHistoryQuery"
import { useTranslation } from "react-i18next"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import useDimensions from "@/hooks/useDimensions"
import ListEmpty from "@/components/listEmpty"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { useColorScheme } from "@/lib/useColorScheme"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	history: NoteHistory
}

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export const Item = memo(({ info, note }: { info: ListRenderItemInfo<ListItemInfo>; note: Note }) => {
	const { t } = useTranslation()

	const noteHistoryQuery = useNoteHistoryQuery({
		uuid: note.uuid,
		enabled: false
	})

	const restore = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("notes.history.prompts.restore.title"),
			message: t("notes.history.prompts.restore.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("restoreNoteHistory", {
				uuid: note.uuid,
				id: info.item.history.id
			})

			await noteHistoryQuery.refetch()

			queryUtils.useNotesQuerySet({
				updater: prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									type: info.item.history.type,
									editedTimestamp: info.item.history.editedTimestamp,
									preview: info.item.history.preview
							  }
							: n
					)
			})

			queryUtils.useNoteContentQuerySet({
				uuid: note.uuid,
				updater: prev => ({
					...prev,
					type: info.item.history.type,
					editedTimestamp: info.item.history.editedTimestamp,
					preview: info.item.history.preview,
					editorId: info.item.history.editorId
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [note.uuid, info.item.history, noteHistoryQuery, t])

	const rightView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center px-4">
				<Button
					size="sm"
					onPress={restore}
				>
					<Text>{t("notes.history.restore")}</Text>
				</Button>
			</View>
		)
	}, [restore, t])

	return (
		<ListItem
			{...info}
			variant="full-width"
			className="overflow-hidden"
			subTitleClassName="text-xs pt-1 font-normal"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-3 py-3 android:py-3"
			rightView={rightView}
		/>
	)
})

Item.displayName = "Item"

export const History = memo(({ note }: { note: Note }) => {
	const { screen } = useDimensions()
	const { t } = useTranslation()
	const { colors } = useColorScheme()

	const noteHistoryQuery = useNoteHistoryQuery({
		uuid: note.uuid
	})

	const history = useMemo((): ListItemInfo[] => {
		if (noteHistoryQuery.status !== "success") {
			return []
		}

		return noteHistoryQuery.data
			.sort((a, b) => b.editedTimestamp - a.editedTimestamp)
			.map(history => ({
				id: history.id.toString(),
				title: simpleDate(history.editedTimestamp),
				subTitle: history.preview.length > 0 ? history.preview : t("notes.history.noPreview"),
				history: history
			}))
	}, [noteHistoryQuery.data, noteHistoryQuery.status, t])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Item
					info={info}
					note={note}
				/>
			)
		},
		[note]
	)

	const listEmpty = useMemo(() => {
		return (
			<ListEmpty
				queryStatus={noteHistoryQuery.status}
				itemCount={history.length}
				texts={{
					error: t("notes.history.list.error"),
					empty: t("notes.history.list.empty"),
					emptySearch: t("notes.history.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "clock-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [noteHistoryQuery.status, history.length, t])

	const listFooter = useMemo(() => {
		return (
			<View className="h-16 flex-row items-center justify-center">
				<Text className="text-sm">
					{t("notes.history.list.footer", {
						count: history.length
					})}
				</Text>
			</View>
		)
	}, [history.length, t])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

	const getItemLayout = useCallback((_: ArrayLike<ListItemInfo> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={t("notes.history.title")}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={true}
				backgroundColor={colors.card}
				backVisible={true}
				iosBackVisible={true}
				iosBackButtonTitleVisible={true}
				iosBlurEffect="systemChromeMaterial"
			/>
		) : (
			<LargeTitleHeader
				title={t("notes.history.title")}
				materialPreset="inline"
				backVisible={true}
				backgroundColor={colors.card}
			/>
		)
	}, [colors.card, t])

	return (
		<Fragment>
			{header}
			<Container>
				<List
					contentContainerClassName="pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={history}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={listFooter}
					ListEmptyComponent={listEmpty}
					removeClippedSubviews={true}
					initialNumToRender={initialNumToRender}
					maxToRenderPerBatch={maxToRenderPerBatch}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={getItemLayout}
				/>
			</Container>
		</Fragment>
	)
})

History.displayName = "History"

export default History
