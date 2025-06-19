import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo, Fragment, useCallback, useState } from "react"
import { View, Platform, RefreshControl, type ListRenderItemInfo } from "react-native"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { ListItem, List, type ListDataItem } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { contactName } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { selectContacts } from "@/app/selectContacts"
import useSDKConfig from "@/hooks/useSDKConfig"
import Menu from "@/components/notes/participants/menu"
import useNotesQuery from "@/queries/useNotesQuery"
import { validate as validateUUID } from "uuid"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import queryUtils from "@/queries/utils"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	participant: NoteParticipant
	name: string
}

export default function Participants() {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [refreshing, setRefreshing] = useState<boolean>(false)

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

			const avatarSource = {
				uri: info.item.participant.avatar?.startsWith("https") ? info.item.participant.avatar : "avatar_fallback"
			}

			return (
				<Menu
					type="context"
					note={note}
					participant={info.item.participant}
				>
					<ListItem
						variant="full-width"
						removeSeparator={Platform.OS === "android"}
						isLastInSection={false}
						isFirstInSection={false}
						leftView={
							<View className="flex-1 flex-row items-center justify-center px-4">
								<Avatar
									source={avatarSource}
									style={{
										width: 36,
										height: 36
									}}
								/>
							</View>
						}
						rightView={
							Platform.OS === "android" ? (
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
												name="dots-horizontal"
												size={24}
												color={colors.foreground}
											/>
										</Button>
									</Menu>
								</View>
							) : undefined
						}
						{...info}
					/>
				</Menu>
			)
		},
		[note, colors.foreground]
	)

	const addParticipant = useCallback(async () => {
		if (!note) {
			return
		}

		const selectContactsResponse = await selectContacts({
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

			queryUtils.useNotesQuerySet({
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

	if (!note) {
		return <Redirect href="/notes" />
	}

	return (
		<Fragment>
			<LargeTitleHeader
				title="Participants"
				iosBlurEffect="systemChromeMaterial"
				rightView={() => {
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
				}}
			/>
			<Container>
				<List
					contentContainerClassName="pb-20"
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					data={participants}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListFooterComponent={
						<View className="h-16 flex-row items-center justify-center">
							<Text className="text-sm">
								{participants.length} {participants.length === 1 ? "participant" : "participants"}
							</Text>
						</View>
					}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)

								await notesQuery.refetch().catch(console.error)

								setRefreshing(false)
							}}
						/>
					}
				/>
			</Container>
		</Fragment>
	)
}
