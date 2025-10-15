import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo, useCallback, useState, memo } from "react"
import { View, Platform, RefreshControl } from "react-native"
import type { Note, NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { contactName } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import contactsService from "@/services/contacts.service"
import useSDKConfig from "@/hooks/useSDKConfig"
import Menu from "@/components/notes/participants/menu"
import useNotesQuery, { notesQueryUpdate } from "@/queries/useNotes.query"
import { validate as validateUUID } from "uuid"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import RequireInternet from "@/components/requireInternet"
import ListEmpty from "@/components/listEmpty"
import { useTranslation } from "react-i18next"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import useNetInfo from "@/hooks/useNetInfo"
import assets from "@/lib/assets"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	participant: NoteParticipant
	name: string
}

export const Participant = memo(({ info, note }: { info: ListRenderItemInfo<ListItemInfo>; note: Note }) => {
	const { colors } = useColorScheme()

	const avatarSource = useMemo(() => {
		return {
			uri: info.item.participant.avatar?.startsWith("https") ? info.item.participant.avatar : assets.uri.images.avatar_fallback()
		}
	}, [info.item.participant.avatar])

	const leftView = useMemo(() => {
		return (
			<View className="flex-1 flex-row items-center justify-center px-4">
				<Avatar
					source={avatarSource}
					style={{
						width: 36,
						height: 36
					}}
				/>
			</View>
		)
	}, [avatarSource])

	const rightView = useMemo(() => {
		return Platform.OS === "android" ? (
			<View className="flex-1 flex-row items-center justify-center px-4">
				<Menu
					type="dropdown"
					note={note}
					participant={info.item.participant}
				>
					<Button
						variant="plain"
						size="icon"
					>
						<Icon
							namingScheme="sfSymbol"
							name="ellipsis"
							size={24}
							color={colors.foreground}
						/>
					</Button>
				</Menu>
			</View>
		) : undefined
	}, [colors.foreground, info.item.participant, note])

	return (
		<Menu
			type="context"
			note={note}
			participant={info.item.participant}
		>
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
				leftView={leftView}
				rightView={rightView}
			/>
		</Menu>
	)
})

Participant.displayName = "Participant"

export default function Participants() {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()

	const noteUUIDParsed = useMemo((): string | null => {
		try {
			return typeof uuid === "string" && validateUUID(uuid) ? uuid : null
		} catch {
			return null
		}
	}, [uuid])

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const note = useMemo((): Note | null => {
		if (!noteUUIDParsed || notesQuery.status !== "success") {
			return null
		}

		const note = notesQuery.data.find(n => n.uuid === noteUUIDParsed)

		if (!note) {
			return null
		}

		return note
	}, [notesQuery.data, noteUUIDParsed, notesQuery.status])

	const participants = useMemo((): ListItemInfo[] => {
		if (!note) {
			return []
		}

		return note.participants
			.filter(participant => participant.userId !== userId)
			.sort((a, b) =>
				contactName(a.email, a.nickName).localeCompare(contactName(b.email, b.nickName), "en", {
					numeric: true
				})
			)
			.map(participant => ({
				id: participant.userId.toString(),
				title: contactName(participant.email, participant.nickName),
				subTitle: participant.email,
				participant,
				name: contactName(participant.email, participant.nickName)
			}))
	}, [note, userId])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string) => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			if (!note) {
				return null
			}

			return (
				<Participant
					info={info}
					note={note}
				/>
			)
		},
		[note]
	)

	const addParticipant = useCallback(async () => {
		if (!note) {
			return
		}

		const selectContactsResponse = await contactsService.selectContacts({
			type: "all",
			max: 9999
		})

		if (selectContactsResponse.cancelled) {
			return
		}

		const filtered = selectContactsResponse.contacts.filter(c => !note.participants.some(p => p.userId === c.userId))

		if (filtered.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			const addedParticipants = await Promise.all(
				filtered.map(async contact => {
					const publicKey = await nodeWorker.proxy("fetchUserPublicKey", {
						email: contact.email
					})

					await nodeWorker.proxy("addNoteParticipant", {
						uuid: note.uuid,
						contactUUID: contact.uuid,
						permissionsWrite: true,
						publicKey
					})

					return {
						userId: contact.userId,
						isOwner: false,
						email: contact.email,
						avatar: contact.avatar,
						nickName: contact.nickName,
						metadata: "",
						permissionsWrite: true,
						addedTimestamp: Date.now()
					} satisfies NoteParticipant as NoteParticipant
				})
			)

			notesQueryUpdate({
				updater: prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									participants: [
										...n.participants.filter(p => !addedParticipants.some(ap => ap.userId === p.userId)),
										...addedParticipants
									]
							  }
							: n
					)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [note])

	const headerRightView = useCallback(() => {
		return (
			<Button
				variant="plain"
				size="icon"
				onPress={addParticipant}
			>
				<Icon
					name="plus"
					size={24}
					color={colors.primary}
				/>
			</Button>
		)
	}, [addParticipant, colors.primary])

	const ListFooterComponent = useCallback(() => {
		if (participants.length === 0) {
			return undefined
		}

		return (
			<View className="h-16 flex-row items-center justify-center">
				<Text className="text-sm">
					{t("notes.participants.list.footer", {
						count: participants.length
					})}
				</Text>
			</View>
		)
	}, [participants.length, t])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={notesQuery.status}
				itemCount={participants.length}
				texts={{
					error: t("notes.participants.list.error"),
					empty: t("notes.participants.list.empty"),
					emptySearch: t("notes.participants.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "account-multiple-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [notesQuery.status, participants.length, t])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await notesQuery.refetch().catch(console.error)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [notesQuery])

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

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={t("notes.participants.title")}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={true}
				backgroundColor={colors.card}
				backVisible={true}
				iosBackVisible={true}
				iosBackButtonTitleVisible={true}
				iosBlurEffect="systemChromeMaterial"
				rightView={headerRightView}
			/>
		) : (
			<LargeTitleHeader
				title={t("notes.participants.title")}
				materialPreset="inline"
				backVisible={true}
				backgroundColor={colors.card}
				rightView={headerRightView}
			/>
		)
	}, [colors.card, t, headerRightView])

	if (!note) {
		return <Redirect href="/notes" />
	}

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					contentContainerClassName="pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={participants}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={ListFooterComponent}
					ListEmptyComponent={ListEmptyComponent}
					refreshControl={refreshControl}
					refreshing={refreshing}
				/>
			</Container>
		</RequireInternet>
	)
}
