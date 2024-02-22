import React, { useState, memo, useCallback, useMemo, useEffect } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { Note, NoteParticipant, Contact, noteParticipantsAdd, getPublicKeyFromEmail } from "../../lib/api"
import { getUserNameFromNoteParticipant } from "./utils"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"
import { generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import Image from "react-native-fast-image"
import { selectContacts } from "../ContactsScreen/SelectContactScreen"
import { showToast } from "../../components/Toasts"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { decryptNoteKeyParticipant, encryptMetadataPublicKey } from "../../lib/crypto"
import { SocketEvent } from "../../lib/services/socket"

const Item = memo(
	({
		darkMode,
		note,
		participant,
		index,
		participantsFilteredWithoutMe
	}: {
		darkMode: boolean
		note: Note
		participant: NoteParticipant
		index: number
		participantsFilteredWithoutMe: NoteParticipant[]
	}) => {
		return (
			<TouchableOpacity
				activeOpacity={0.5}
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingLeft: 20,
					paddingRight: 20,
					height: 55,
					marginBottom: index >= participantsFilteredWithoutMe.length - 1 ? 50 : 0
				}}
				onPress={() => {
					eventListener.emit("openNoteParticipantsActionSheet", {
						note,
						participant
					})
				}}
				onLongPress={() => {
					eventListener.emit("openNoteParticipantsActionSheet", {
						note,
						participant
					})
				}}
			>
				<View>
					{typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1 ? (
						<Image
							source={{
								uri: participant.avatar,
								priority: "high"
							}}
							defaultSource={require("../../assets/images/avatar_placeholder.jpg")}
							resizeMode="contain"
							style={{
								width: 34,
								height: 34,
								borderRadius: 34
							}}
						/>
					) : (
						<View
							style={{
								width: 34,
								height: 34,
								borderRadius: 34,
								backgroundColor: generateAvatarColorCode(participant.email, darkMode),
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center"
							}}
						>
							<Text
								style={{
									color: "white",
									fontWeight: "bold",
									fontSize: 20
								}}
							>
								{getUserNameFromNoteParticipant(participant).slice(0, 1).toUpperCase()}
							</Text>
						</View>
					)}
				</View>
				<View
					style={{
						height: "100%",
						borderBottomColor: getColor(darkMode, "primaryBorder"),
						borderBottomWidth:
							index >= participantsFilteredWithoutMe.length - 1 && participantsFilteredWithoutMe.length > 1 ? 0 : 0.5,
						alignItems: "center",
						flexDirection: "row",
						marginLeft: 10,
						justifyContent: "space-between",
						width: "100%"
					}}
				>
					<View
						style={{
							flexDirection: "column",
							width: "80%",
							height: "100%",
							justifyContent: "center"
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 16,
								maxWidth: "100%"
							}}
							numberOfLines={1}
						>
							{getUserNameFromNoteParticipant(participant)}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 13,
								maxWidth: "100%"
							}}
							numberOfLines={1}
						>
							{participant.email}
						</Text>
					</View>
					<View
						style={{
							paddingRight: 45
						}}
					>
						{participant.permissionsWrite ? (
							<Ionicon
								name="create-outline"
								color={getColor(darkMode, "textSecondary")}
								size={18}
							/>
						) : (
							<Ionicon
								name="eye-outline"
								color={getColor(darkMode, "textSecondary")}
								size={18}
							/>
						)}
					</View>
				</View>
			</TouchableOpacity>
		)
	}
)

const ParticipantsScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const [userId] = useMMKVNumber("userId", storage)
		const [selectedNote, setSelectedNote] = useState<Note>(route.params.note)
		const dimensions = useWindowDimensions()

		const participantsFilteredWithoutMe = useMemo(() => {
			const exists: Record<string, boolean> = {}

			return selectedNote.participants
				.filter(p => {
					if (exists[p.userId]) {
						return false
					}

					exists[userId] = true

					return p.userId !== userId
				})
				.sort((a, b) => getUserNameFromNoteParticipant(a).localeCompare(getUserNameFromNoteParticipant(b)))
		}, [userId, selectedNote.participants])

		const add = useCallback(async () => {
			if (!selectedNote || !navigation) {
				return
			}

			let contacts: Contact[] = []

			try {
				const selectContactRes = await selectContacts(
					navigation,
					selectedNote.participants.map(p => p.userId)
				)

				if (selectContactRes.cancelled) {
					return
				}

				contacts = selectContactRes.contacts
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })

				return
			}

			if (contacts.length <= 0) {
				return
			}

			showFullScreenLoadingModal()

			try {
				const promises: Promise<void>[] = []
				const privateKey = storage.getString("privateKey")
				const userId = storage.getNumber("userId")
				const key = await decryptNoteKeyParticipant(
					selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
					privateKey
				)

				if (key.length === 0) {
					return
				}

				for (const contact of contacts) {
					promises.push(
						new Promise(async (resolve, reject) => {
							try {
								const publicKeyRes = await getPublicKeyFromEmail(contact.email)
								const metadata = await encryptMetadataPublicKey(JSON.stringify({ key }), publicKeyRes)

								await noteParticipantsAdd({
									uuid: selectedNote.uuid,
									metadata,
									contactUUID: contact.uuid,
									permissionsWrite: true
								})

								eventListener.emit("noteParticipantAdded", {
									uuid: selectedNote.uuid,
									contact,
									permissionsWrite: true,
									metadata
								})

								resolve()
							} catch (e) {
								reject(e)
							}
						})
					)
				}

				await Promise.all(promises)

				eventListener.emit("refreshNotes")
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				hideFullScreenLoadingModal()
			}
		}, [selectedNote, navigation])

		const keyExtractor = useCallback((item: NoteParticipant) => item.userId.toString(), [])

		const renderItem = useCallback(
			({ item, index }: { item: NoteParticipant; index: number }) => {
				return (
					<Item
						darkMode={darkMode}
						note={selectedNote}
						participant={item}
						index={index}
						participantsFilteredWithoutMe={participantsFilteredWithoutMe}
					/>
				)
			},
			[darkMode, selectedNote, participantsFilteredWithoutMe]
		)

		useEffect(() => {
			const noteParticipantRemovedListener = eventListener.on(
				"noteParticipantRemoved",
				({ uuid, userId }: { uuid: string; userId: number }) => {
					if (selectedNote.uuid === uuid) {
						setSelectedNote(prev => ({ ...prev, participants: prev.participants.filter(p => p.userId !== userId) }))
					}
				}
			)

			const noteParticipantPermissionsListenr = eventListener.on(
				"noteParticipantPermissions",
				({ uuid, userId, permissionsWrite }: { uuid: string; userId: number; permissionsWrite: boolean }) => {
					if (selectedNote.uuid === uuid) {
						setSelectedNote(prev => ({
							...prev,
							participants: prev.participants.map(p => (p.userId === userId ? { ...p, permissionsWrite } : p))
						}))
					}
				}
			)

			const noteParticipantAddedListener = eventListener.on(
				"noteParticipantAdded",
				({
					uuid,
					contact,
					permissionsWrite,
					metadata
				}: {
					uuid: string
					contact: Contact
					permissionsWrite: boolean
					metadata: string
				}) => {
					if (selectedNote.uuid === uuid) {
						setSelectedNote(prev => ({
							...prev,
							participants: [
								...prev.participants.filter(p => p.userId !== contact.userId),
								...[
									{
										userId: contact.userId,
										isOwner: false,
										email: contact.email,
										avatar: contact.avatar,
										nickName: contact.nickName,
										metadata: metadata,
										permissionsWrite,
										addedTimestamp: Date.now()
									}
								]
							]
						}))
					}
				}
			)

			const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
				if (event.type === "noteParticipantRemoved") {
					if (selectedNote.uuid === event.data.note) {
						setSelectedNote(prev => ({ ...prev, participants: prev.participants.filter(p => p.userId !== event.data.userId) }))
					}
				} else if (event.type === "noteParticipantPermissions") {
					if (selectedNote.uuid === event.data.note) {
						setSelectedNote(prev => ({
							...prev,
							participants: prev.participants.map(p =>
								p.userId === event.data.userId ? { ...p, permissionsWrite: event.data.permissionsWrite } : p
							)
						}))
					}
				} else if (event.type === "noteParticipantNew") {
					if (selectedNote.uuid === event.data.note) {
						setSelectedNote(prev => ({
							...prev,
							participants: [
								...prev.participants.filter(p => p.userId !== event.data.userId),
								...[
									{
										userId: event.data.userId,
										isOwner: event.data.isOwner,
										email: event.data.email,
										avatar: event.data.avatar,
										nickName: event.data.nickName,
										metadata: event.data.metadata,
										permissionsWrite: event.data.permissionsWrite,
										addedTimestamp: event.data.addedTimestamp
									}
								]
							]
						}))
					}
				}
			})

			return () => {
				noteParticipantRemovedListener.remove()
				noteParticipantPermissionsListenr.remove()
				noteParticipantAddedListener.remove()
				socketEventListener.remove()
			}
		}, [selectedNote])

		return (
			<View
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary")
				}}
			>
				<DefaultTopBar
					onPressBack={() => {
						navigation.goBack()
					}}
					leftText={i18n(lang, "notes")}
					middleText={i18n(lang, "participants")}
					rightComponent={
						<View
							style={{
								width: "33%",
								justifyContent: "center",
								alignItems: "flex-end",
								paddingRight: 15,
								paddingTop: 3
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center"
								}}
							>
								<TouchableOpacity
									hitSlop={{
										top: 15,
										bottom: 15,
										right: 15,
										left: 15
									}}
									onPress={add}
								>
									<Ionicon
										name="add-outline"
										color={getColor(darkMode, "linkPrimary")}
										size={26}
									/>
								</TouchableOpacity>
							</View>
						</View>
					}
				/>
				<View
					style={{
						marginTop: 10,
						height: "100%",
						width: "100%"
					}}
				>
					<FlashList
						data={participantsFilteredWithoutMe}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						estimatedItemSize={55}
						extraData={{
							darkMode,
							selectedNote,
							participantsFilteredWithoutMe
						}}
						ListEmptyComponent={
							<View
								style={{
									flexDirection: "column",
									justifyContent: "center",
									alignItems: "center",
									width: "100%",
									marginTop: Math.floor(dimensions.height / 2) - 150
								}}
							>
								<Ionicon
									name="people-outline"
									size={40}
									color={getColor(darkMode, "textSecondary")}
								/>
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										fontSize: 16,
										marginTop: 5
									}}
								>
									{i18n(lang, "noParticipantsYet")}
								</Text>
							</View>
						}
					/>
				</View>
			</View>
		)
	}
)

export default ParticipantsScreen
