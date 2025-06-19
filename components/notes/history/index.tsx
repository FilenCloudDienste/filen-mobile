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

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	history: NoteHistory
}

export const History = memo(({ note }: { note: Note }) => {
	const { t } = useTranslation()

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
			const alertPromptResponse = await alertPrompt({
				title: "disableEmbeds",
				message: "Are u sure"
			})

			if (alertPromptResponse.cancelled) {
				return
			}

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
					{...info}
					variant="full-width"
					className="overflow-hidden"
					subTitleClassName="text-xs pt-1 font-normal"
					textNumberOfLines={1}
					subTitleNumberOfLines={1}
					isFirstInSection={false}
					isLastInSection={false}
					removeSeparator={Platform.OS === "android"}
					innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
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
			<LargeTitleHeader
				title="History"
				backVisible={true}
				iosBackButtonMenuEnabled={false}
				iosBlurEffect="systemChromeMaterial"
			/>
			<Container>
				<List
					contentContainerClassName="pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={history}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={ListFooter}
				/>
			</Container>
		</Fragment>
	)
})

History.displayName = "History"

export default History
