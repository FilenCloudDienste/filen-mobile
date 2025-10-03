import { memo, Fragment, useMemo, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, ListItem, type ListRenderItemInfo, type ListDataItem } from "@/components/nativewindui/List"
import { Platform } from "react-native"
import useEventsQuery from "@/queries/useEvents.query"
import { type UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"
import { simpleDate } from "@/lib/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	event: UserEvent
}

const contentContainerStyle = {
	paddingBottom: 100
}

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { t } = useTranslation()

	const onPress = useCallback(() => {
		alertPrompt({
			title: t("settings.events.event"),
			message: `${info.item.title}`
		}).catch(console.error)
	}, [info.item.title, t])

	return (
		<ListItem
			{...info}
			className="overflow-hidden"
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-3 py-3 android:py-3"
			onPress={onPress}
		/>
	)
})

Item.displayName = "Item"

export const Events = memo(() => {
	const { t } = useTranslation()

	const events = useEventsQuery({
		filter: "all"
	})

	const eventTypeToTitle = useCallback(
		(event: UserEvent) => {
			switch (event.type) {
				case "2faDisabled": {
					return t("settings.events.eventInfo.2faDisabled")
				}

				case "2faEnabled": {
					return t("settings.events.eventInfo.2faEnabled")
				}

				case "deleteFilePermanently": {
					return t("settings.events.eventInfo.deleteFilePermanently", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "deleteAll": {
					return t("settings.events.eventInfo.deleteAll")
				}

				case "codeRedeemed": {
					return t("settings.events.eventInfo.codeRedeemed", {
						code: event.info.code
					})
				}

				case "baseFolderCreated": {
					return t("settings.events.eventInfo.baseFolderCreated")
				}

				case "deleteFolderPermanently": {
					return t("settings.events.eventInfo.deleteFolderPermanently", {
						name: event.info.nameDecrypted.name
					})
				}

				case "deleteUnfinished": {
					return t("settings.events.eventInfo.deleteUnfinished")
				}

				case "login": {
					return t("settings.events.eventInfo.login")
				}

				case "deleteVersioned": {
					return t("settings.events.eventInfo.deleteVersioned")
				}

				case "emailChangeAttempt": {
					return t("settings.events.eventInfo.emailChangeAttempt")
				}

				case "emailChanged": {
					return t("settings.events.eventInfo.emailChanged")
				}

				case "passwordChanged": {
					return t("settings.events.eventInfo.passwordChanged")
				}

				case "failedLogin": {
					return t("settings.events.eventInfo.failedLogin")
				}

				case "fileLinkEdited": {
					return t("settings.events.eventInfo.fileLinkEdited", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileMetadataChanged": {
					return t("settings.events.eventInfo.fileMetadataChanged", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileMoved": {
					return t("settings.events.eventInfo.fileMoved", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileRenamed": {
					return t("settings.events.eventInfo.fileRenamed", {
						oldName: event.info.oldMetadataDecrypted.name,
						newName: event.info.metadataDecrypted.name
					})
				}

				case "fileShared": {
					return t("settings.events.eventInfo.fileShared", {
						name: event.info.metadataDecrypted.name,
						email: event.info.receiverEmail
					})
				}

				case "fileUploaded": {
					return t("settings.events.eventInfo.fileUploaded", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileRestored": {
					return t("settings.events.eventInfo.fileRestored", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileRm": {
					return t("settings.events.eventInfo.fileRm", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileTrash": {
					return t("settings.events.eventInfo.fileTrash", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "fileVersioned": {
					return t("settings.events.eventInfo.fileVersioned", {
						name: event.info.metadataDecrypted.name
					})
				}

				case "folderColorChanged": {
					return t("settings.events.eventInfo.folderColorChanged", {
						name: event.info.nameDecrypted.name
					})
				}

				case "folderLinkEdited": {
					return t("settings.events.eventInfo.folderLinkEdited")
				}

				case "folderMetadataChanged": {
					return t("settings.events.eventInfo.folderMetadataChanged", {
						name: event.info.nameDecrypted.name
					})
				}

				case "folderMoved": {
					return t("settings.events.eventInfo.folderMoved", {
						name: event.info.nameDecrypted.name
					})
				}

				case "folderRenamed": {
					return t("settings.events.eventInfo.folderRenamed", {
						oldName: event.info.oldNameDecrypted.name,
						newName: event.info.nameDecrypted.name
					})
				}

				case "folderShared": {
					return t("settings.events.eventInfo.folderShared", {
						name: event.info.nameDecrypted.name,
						email: event.info.receiverEmail
					})
				}

				case "folderRestored": {
					return t("settings.events.eventInfo.folderRestored", {
						name: event.info.nameDecrypted.name
					})
				}

				case "folderTrash": {
					return t("settings.events.eventInfo.folderTrash", {
						name: event.info.nameDecrypted.name
					})
				}

				case "itemFavorite": {
					if (event.info.value === 1) {
						return t("settings.events.eventInfo.itemFavorited", {
							name: event.info.metadataDecrypted?.name
						})
					} else {
						return t("settings.events.eventInfo.itemUnfavorited", {
							name: event.info.metadataDecrypted?.name
						})
					}
				}

				case "removedSharedInItems": {
					return t("settings.events.eventInfo.removedSharedInItems", {
						email: event.info.sharerEmail
					})
				}

				case "removedSharedOutItems": {
					return t("settings.events.eventInfo.removedSharedOutItems", {
						email: event.info.receiverEmail
					})
				}

				case "requestAccountDeletion": {
					return t("settings.events.eventInfo.requestAccountDeletion")
				}

				case "subFolderCreated": {
					return t("settings.events.eventInfo.subFolderCreated", {
						name: event.info.nameDecrypted.name
					})
				}

				case "trashEmptied": {
					return t("settings.events.eventInfo.trashEmptied")
				}

				case "versionedFileRestored": {
					return t("settings.events.eventInfo.versionedFileRestored", {
						name: event.info.metadataDecrypted.name
					})
				}
			}
		},
		[t]
	)

	const eventsSorted = useMemo(() => {
		if (events.status !== "success") {
			return []
		}

		return events.data
			.sort((a, b) => b.timestamp - a.timestamp)
			.map(event => ({
				id: event.uuid,
				title: eventTypeToTitle(event),
				subTitle: simpleDate(event.timestamp),
				event
			})) satisfies ListItemInfo[]
	}, [events.status, events.data, eventTypeToTitle])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Item info={info} />
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={events.status}
				itemCount={eventsSorted.length}
				texts={{
					error: t("settings.events.listEmpty.error"),
					empty: t("settings.events.listEmpty.empty"),
					emptySearch: t("settings.events.listEmpty.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "cog-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [events.status, eventsSorted.length, t])

	return (
		<Fragment>
			<LargeTitleHeader title={t("settings.events.title")} />
			<List
				contentInsetAdjustmentBehavior="automatic"
				variant="full-width"
				contentContainerStyle={contentContainerStyle}
				data={eventsSorted}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				ListEmptyComponent={ListEmptyComponent}
			/>
		</Fragment>
	)
})

Events.displayName = "Events"

export default Events
