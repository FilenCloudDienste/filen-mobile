import { useMemo, Fragment, useCallback, memo, useRef } from "react"
import { View } from "react-native"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import { type NoteHistory } from "@filen/sdk/dist/types/api/v3/notes/history"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, ESTIMATED_ITEM_HEIGHT, type ListDataItem } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { type ListRenderItemInfo } from "@shopify/flash-list"
import { simpleDate } from "@/lib/utils"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"
import useNoteHistoryQuery from "@/queries/useNoteHistoryQuery"
import { useTranslation } from "react-i18next"
import useViewLayout from "@/hooks/useViewLayout"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	history: NoteHistory
}

export const History = memo(({ note }: { note: Note }) => {
	const { t } = useTranslation()
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

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
				subTitle: history.preview.length > 0 ? history.preview : "No preview available",
				history: history
			}))
	}, [noteHistoryQuery.data, noteHistoryQuery.status])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const restore = useCallback(
		async (history: NoteHistory) => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("restoreNoteHistory", {
					uuid: note.uuid,
					id: history.id
				})

				await noteHistoryQuery.refetch()

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										type: history.type,
										editedTimestamp: history.editedTimestamp,
										preview: history.preview
								  }
								: n
						)
				})

				queryUtils.useNoteContentQuerySet({
					uuid: note.uuid,
					updater: prev => ({
						...prev,
						type: history.type,
						editedTimestamp: history.editedTimestamp,
						preview: history.preview,
						editorId: history.editorId
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
		},
		[note.uuid, noteHistoryQuery]
	)

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<ListItem
					variant="full-width"
					rightView={
						<View className="flex-1 flex-row items-center px-4">
							<Button
								size="sm"
								onPress={() => restore(info.item.history)}
							>
								<Text>{t("fileVersionHistory.list.item.restore")}</Text>
							</Button>
						</View>
					}
					{...info}
				/>
			)
		},
		[t, restore]
	)

	const ListFooter = useMemo(() => {
		return (
			<View className="h-16 flex-row items-center justify-center">
				<Text className="text-sm">{history.length} items</Text>
			</View>
		)
	}, [history.length])

	return (
		<Fragment>
			<LargeTitleHeader title="History" />
			<Container>
				<View
					className="flex-1"
					ref={viewRef}
					onLayout={onLayout}
				>
					<List
						contentContainerClassName="pb-20"
						contentInsetAdjustmentBehavior="automatic"
						variant="full-width"
						data={history}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						ListFooterComponent={ListFooter}
						estimatedListSize={
							listLayout.width > 0 && listLayout.height > 0
								? {
										width: listLayout.width,
										height: listLayout.height
								  }
								: undefined
						}
						estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
						drawDistance={0}
						removeClippedSubviews={true}
						disableAutoLayout={true}
					/>
				</View>
			</Container>
		</Fragment>
	)
})

History.displayName = "History"

export default History
