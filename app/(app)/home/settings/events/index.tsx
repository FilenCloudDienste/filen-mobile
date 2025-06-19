import { memo, Fragment, useMemo, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, ListItem, type ListRenderItemInfo, type ListDataItem } from "@/components/nativewindui/List"
import { View, ActivityIndicator, Platform } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import useEventsQuery from "@/queries/useEventsQuery"
import { type UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"
import { simpleDate } from "@/lib/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	event: UserEvent
}

export const Events = memo(() => {
	const { colors } = useColorScheme()

	const events = useEventsQuery({})

	const eventTypeToTitle = useCallback((event: UserEvent) => {
		switch (event.type) {
			case "2faDisabled": {
				return "Two Factor Authentication disabled"
			}

			case "2faEnabled": {
				return "Two Factor Authentication enabled"
			}

			case "deleteFilePermanently": {
				return `${event.info.metadataDecrypted.name} deleted permanently`
			}

			case "deleteAll": {
				return "All directories and files deleted permanently"
			}

			case "codeRedeemed": {
				return `Code "${event.info.code}" redeemed`
			}

			case "baseFolderCreated": {
				return "Base directory created"
			}

			case "deleteFolderPermanently": {
				return `${event.info.nameDecrypted.name} deleted permanently`
			}

			case "deleteUnfinished": {
				return "Unfinished uploads deleted"
			}

			case "login": {
				return "Logged in"
			}

			case "deleteVersioned": {
				return "All versioned files deleted"
			}

			case "emailChangeAttempt": {
				return "Email change attempted"
			}

			case "emailChanged": {
				return "Email changed"
			}

			case "passwordChanged": {
				return "Password changed"
			}

			case "failedLogin": {
				return "Failed login attempt"
			}

			case "fileLinkEdited": {
				return `Public link for ${event.info.metadataDecrypted.name} edited`
			}

			case "fileMetadataChanged": {
				return `Metadata for ${event.info.metadataDecrypted.name} changed`
			}

			case "fileMoved": {
				return `${event.info.metadataDecrypted.name} moved`
			}

			case "fileRenamed": {
				return `${event.info.oldMetadataDecrypted.name} renamed to ${event.info.metadataDecrypted.name}`
			}

			case "fileShared": {
				return `${event.info.metadataDecrypted.name} shared with ${event.info.receiverEmail}`
			}

			case "fileUploaded": {
				return `${event.info.metadataDecrypted.name} uploaded`
			}

			case "fileRestored": {
				return `${event.info.metadataDecrypted.name} restored`
			}

			case "fileRm": {
				return `${event.info.metadataDecrypted.name} deleted`
			}

			case "fileTrash": {
				return `${event.info.metadataDecrypted.name} moved to trash`
			}

			case "fileVersioned": {
				return `${event.info.metadataDecrypted.name} versioned`
			}

			case "folderColorChanged": {
				return `Color for directory ${event.info.nameDecrypted.name} changed `
			}

			case "folderLinkEdited": {
				return "Public link for directory edited"
			}

			case "folderMetadataChanged": {
				return `Metadata for directory ${event.info.nameDecrypted.name} changed`
			}

			case "folderMoved": {
				return `Directory ${event.info.nameDecrypted.name} moved`
			}

			case "folderRenamed": {
				return `Directory ${event.info.oldNameDecrypted.name} renamed to ${event.info.nameDecrypted.name}`
			}

			case "folderShared": {
				return `Directory ${event.info.nameDecrypted.name} shared with ${event.info.receiverEmail}`
			}

			case "folderRestored": {
				return `Directory ${event.info.nameDecrypted.name} restored`
			}

			case "folderTrash": {
				return `Directory ${event.info.nameDecrypted.name} moved to trash`
			}

			case "itemFavorite": {
				return `${event.info.metadataDecrypted?.name} ${event.info.value === 1 ? "favorited" : "unfavorited"}`
			}

			case "removedSharedInItems": {
				return `Shared items removed from ${event.info.sharerEmail}`
			}

			case "removedSharedOutItems": {
				return `Shared items removed from ${event.info.receiverEmail}`
			}

			case "requestAccountDeletion": {
				return "Account deletion requested"
			}

			case "subFolderCreated": {
				return `Directory ${event.info.nameDecrypted.name} created`
			}

			case "trashEmptied": {
				return "Trash emptied"
			}

			case "versionedFileRestored": {
				return `${event.info.metadataDecrypted.name} version restored`
			}
		}
	}, [])

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
				innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
				onPress={() => {
					alertPrompt({
						title: "Event",
						message: `${info.item.title}`,
						cancelText: ""
					}).catch(console.error)
				}}
			/>
		)
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	return (
		<Fragment>
			<LargeTitleHeader title="Events" />
			<List
				contentInsetAdjustmentBehavior="automatic"
				variant="full-width"
				contentContainerStyle={{
					paddingBottom: 100
				}}
				data={eventsSorted}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				ListEmptyComponent={() => {
					return (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator
								size="small"
								color={colors.foreground}
							/>
						</View>
					)
				}}
				onEndReachedThreshold={0.3}
				onEndReached={() => console.log("End reached")}
			/>
		</Fragment>
	)
})

Events.displayName = "Events"

export default Events
