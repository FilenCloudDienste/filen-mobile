import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from "react"
import { View, Text, TouchableOpacity, RefreshControl, useWindowDimensions, ActivityIndicator } from "react-native"
import { TopBar } from "../../components/TopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useFocusEffect } from "@react-navigation/native"
import { Note, NoteTag } from "../../lib/api"
import { fetchNotesAndTags, sortAndFilterNotes, getUserNameFromNoteParticipant } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import { useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"
import { navigationAnimation } from "../../lib/state"
import { StackActions } from "@react-navigation/native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import eventListener from "../../lib/eventListener"
import Image from "react-native-fast-image"
import { generateAvatarColorCode } from "../../lib/helpers"
import { Feather } from "@expo/vector-icons"
import { SheetManager } from "react-native-actions-sheet"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { SocketEvent } from "../../lib/services/socket"
import { useAppState } from "@react-native-community/hooks"

const Item = memo(
	({
		darkMode,
		note,
		index,
		notesSorted,
		navigation,
		userId,
		tags
	}: {
		darkMode: boolean
		note: Note
		index: number
		notesSorted: Note[]
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		userId: number
		tags: NoteTag[]
	}) => {
		const participantsFilteredWithoutMe = useMemo(() => {
			return note.participants
				.filter(p => p.userId !== userId)
				.sort((a, b) => getUserNameFromNoteParticipant(a).localeCompare(getUserNameFromNoteParticipant(b)))
		}, [userId, note.participants])

		const me = useMemo(() => {
			const filtered = note.participants.filter(p => p.userId === userId)

			if (filtered.length === 0) {
				return null
			}

			return filtered[0]
		}, [userId, note.participants])

		const writeAccess = useMemo(() => {
			if (userId === note.ownerId) {
				return true
			}

			if (!me) {
				return false
			}

			return me.permissionsWrite
		}, [me, note, userId])

		return (
			<TouchableOpacity
				style={{
					flexDirection: "column",
					marginBottom: index >= notesSorted.length - 1 ? 130 : 0,
					paddingBottom: index >= notesSorted.length - 1 ? 15 : 0
				}}
				onPress={async () => {
					await navigationAnimation({ enable: true })

					navigation.dispatch(
						StackActions.push("NoteScreen", {
							note,
							tags,
							readOnly: !writeAccess,
							historyMode: false,
							historyId: "",
							historyContent: "",
							historyType: ""
						})
					)
				}}
				onLongPress={() => {
					eventListener.emit("openNoteActionSheet", { note, tags })
				}}
			>
				<View
					style={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						flexDirection: "row",
						paddingLeft: 15,
						paddingRight: 50,
						width: "100%",
						paddingTop: 15,
						justifyContent: "space-between"
					}}
				>
					<View
						style={{
							flexDirection: "row",
							gap: 10,
							width: "100%",
							height: "100%"
						}}
					>
						<View
							style={{
								width: 30,
								flexDirection: "column",
								alignSelf: "flex-start"
							}}
						>
							{note.trash ? (
								<Ionicon
									name="trash-outline"
									size={20}
									color={getColor(darkMode, "red")}
								/>
							) : note.archive ? (
								<Ionicon
									name="archive-outline"
									size={20}
									color={getColor(darkMode, "orange")}
								/>
							) : (
								<>
									{note.type === "text" && (
										<Ionicon
											name="reorder-four-outline"
											size={24}
											color={getColor(darkMode, "blue")}
										/>
									)}
									{note.type === "md" && (
										<MaterialCommunityIcons
											name="language-markdown-outline"
											size={26}
											color={getColor(darkMode, "indigo")}
										/>
									)}
									{note.type === "code" && (
										<View
											style={{
												paddingLeft: 1
											}}
										>
											<Ionicon
												name="code-slash"
												size={22}
												color={getColor(darkMode, "red")}
											/>
										</View>
									)}
									{note.type === "checklist" && (
										<MaterialCommunityIcons
											name="format-list-checks"
											size={24}
											color={getColor(darkMode, "purple")}
										/>
									)}
									{note.type === "rich" && (
										<MaterialCommunityIcons
											name="file-image-outline"
											size={24}
											color={getColor(darkMode, "cyan")}
										/>
									)}
									{note.pinned && (
										<MaterialCommunityIcons
											name="pin"
											size={18}
											color={getColor(darkMode, "textSecondary")}
											style={{
												marginTop: 5
											}}
										/>
									)}
								</>
							)}
						</View>
						<View
							style={{
								flexDirection: "column"
							}}
						>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center"
								}}
							>
								{note.favorite && (
									<Ionicon
										name={darkMode ? "heart" : "heart-outline"}
										size={15}
										color={getColor(darkMode, "textPrimary")}
										style={{
											marginRight: 7,
											flexShrink: 0
										}}
									/>
								)}
								{!writeAccess && (
									<Ionicon
										name="eye-outline"
										size={15}
										color={getColor(darkMode, "textPrimary")}
										style={{
											marginRight: 7,
											flexShrink: 0
										}}
									/>
								)}
								<Text
									style={{
										color: getColor(darkMode, "textPrimary"),
										fontSize: 15,
										paddingRight: participantsFilteredWithoutMe.length > 0 ? 55 : 15
									}}
									numberOfLines={1}
								>
									{note.title}
								</Text>
							</View>
							{note.preview.length > 0 ? (
								<>
									<Text
										style={{
											color: getColor(darkMode, "textSecondary"),
											marginTop: 5,
											paddingRight: participantsFilteredWithoutMe.length > 0 ? 55 : 15,
											fontSize: 12
										}}
										numberOfLines={1}
									>
										{new Date(note.editedTimestamp).toLocaleString()}
									</Text>
									<Text
										style={{
											color: getColor(darkMode, "textSecondary"),
											marginTop: 7,
											paddingRight: participantsFilteredWithoutMe.length > 0 ? 55 : 15
										}}
										numberOfLines={1}
									>
										{note.preview}
									</Text>
								</>
							) : (
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										marginTop: 5,
										paddingRight: participantsFilteredWithoutMe.length > 0 ? 55 : 15,
										fontSize: 12
									}}
									numberOfLines={1}
								>
									{new Date(note.editedTimestamp).toLocaleString()}
								</Text>
							)}
							{note.tags.length > 0 && (
								<View
									style={{
										flexDirection: "row",
										flexWrap: "wrap",
										marginTop: 3,
										paddingRight: participantsFilteredWithoutMe.length > 0 ? 65 : 15
									}}
								>
									{note.tags
										.sort((a, b) => a.name.localeCompare(b.name))
										.map(tag => {
											return (
												<View
													key={tag.uuid}
													style={{
														backgroundColor: getColor(darkMode, "backgroundSecondary"),
														paddingLeft: 6,
														paddingRight: 6,
														paddingTop: 3,
														paddingBottom: 3,
														justifyContent: "center",
														alignItems: "center",
														flexDirection: "row",
														borderRadius: 5,
														marginRight: 5,
														marginTop: 5
													}}
												>
													<Text
														style={{
															color: getColor(darkMode, "purple"),
															fontSize: 13
														}}
													>
														#
													</Text>
													<Text
														style={{
															color: getColor(darkMode, "textSecondary"),
															marginLeft: 5,
															fontSize: 13
														}}
													>
														{tag.name}
													</Text>
												</View>
											)
										})}
								</View>
							)}
						</View>
					</View>
					{participantsFilteredWithoutMe.length > 0 && (
						<View
							style={{
								flexDirection: "row",
								justifyContent: "flex-end",
								alignItems: "center"
							}}
						>
							{participantsFilteredWithoutMe.slice(0, 2).map((participant, index) => {
								if (typeof participant.avatar === "string" && participant.avatar.indexOf("https://") !== -1) {
									return (
										<Image
											key={participant.userId}
											source={{
												uri: participant.avatar,
												priority: "high"
											}}
											defaultSource={require("../../assets/images/avatar_placeholder.jpg")}
											resizeMode="contain"
											style={{
												width: 24,
												height: 24,
												borderRadius: 24,
												left: index > 0 ? 8 : 0,
												position: "absolute"
											}}
										/>
									)
								}

								return (
									<View
										key={participant.userId}
										style={{
											width: 24,
											height: 24,
											borderRadius: 24,
											backgroundColor: generateAvatarColorCode(participant.email, darkMode),
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											left: index > 0 ? 8 : 0,
											position: "absolute"
										}}
									>
										<Text
											style={{
												color: "white",
												fontWeight: "bold",
												fontSize: 16
											}}
										>
											{getUserNameFromNoteParticipant(participant).slice(0, 1).toUpperCase()}
										</Text>
									</View>
								)
							})}
						</View>
					)}
				</View>
				{index < notesSorted.length - 1 && (
					<View
						style={{
							backgroundColor: getColor(darkMode, "primaryBorder"),
							height: 0.5,
							width: "200%",
							marginTop: 15,
							marginLeft: 55
						}}
					/>
				)}
			</TouchableOpacity>
		)
	}
)

const NotesScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [notes, setNotes] = useState<Note[]>([])
	const [tags, setTags] = useState<NoteTag[]>([])
	const networkInfo = useNetworkInfo()
	const [userId] = useMMKVNumber("userId", storage)
	const dimensions = useWindowDimensions()
	const lang = useLang()
	const loadNotesAndTagsTimeout = useRef<number>(0)
	const appState = useAppState()
	const didInitialLoad = useRef<boolean>(false)

	const notesSorted = useMemo(() => {
		return sortAndFilterNotes(notes, searchTerm, "")
	}, [notes, searchTerm])

	const loadNotesAndTags = useCallback(
		async (skipCache: boolean = false) => {
			if (skipCache && !networkInfo.online) {
				return
			}

			if (skipCache) {
				if (loadNotesAndTagsTimeout.current > Date.now()) {
					return
				}

				loadNotesAndTagsTimeout.current = Date.now() + 100
			}

			try {
				const getItemsInDb = await dbFs.get<ReturnType<typeof fetchNotesAndTags> | undefined>("notesAndTags")
				const hasItemsInDb =
					getItemsInDb &&
					getItemsInDb.notes &&
					getItemsInDb.tags &&
					Array.isArray(getItemsInDb.notes) &&
					Array.isArray(getItemsInDb.tags)

				if (!hasItemsInDb) {
					setLoadDone(false)
					setNotes([])
					setTags([])
				}

				const notesAndTags = await fetchNotesAndTags(skipCache)

				setNotes(notesAndTags.notes)
				setTags(notesAndTags.tags)

				if (notesAndTags.cache && networkInfo.online) {
					loadNotesAndTags(true)
				}
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				setLoadDone(true)
			}
		},
		[networkInfo, searchTerm]
	)

	const keyExtractor = useCallback((item: Note) => item.uuid, [])

	const renderItem = useCallback(
		({ item, index }: { item: Note; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					note={item}
					notesSorted={notesSorted}
					index={index}
					navigation={navigation}
					userId={userId}
					tags={tags}
				/>
			)
		},
		[darkMode, notesSorted, navigation, userId, tags]
	)

	useFocusEffect(
		useCallback(() => {
			if (didInitialLoad.current) {
				loadNotesAndTags(true)
			}
		}, [])
	)

	useEffect(() => {
		if (appState === "active" && didInitialLoad.current) {
			loadNotesAndTags(true)
		}
	}, [appState])

	useEffect(() => {
		if (!didInitialLoad.current) {
			didInitialLoad.current = true

			loadNotesAndTags()
		}

		const notesUpdateListener = eventListener.on("notesUpdate", (notes: Note[]) => {
			setNotes(notes)
		})

		const refreshNotesListener = eventListener.on("refreshNotes", () => {
			loadNotesAndTags(true)
		})

		const notesTagsUpdateListener = eventListener.on("notesTagsUpdate", (t: NoteTag[]) => {
			setTags(t)
		})

		const socketAuthedListener = eventListener.on("socketAuthed", () => {
			loadNotesAndTags(true)
		})

		const socketEventListener = eventListener.on("socketEvent", async (event: SocketEvent) => {
			if (
				event.type === "noteParticipantNew" ||
				event.type === "noteParticipantPermissions" ||
				event.type === "noteParticipantRemoved" ||
				event.type === "noteArchived" ||
				event.type === "noteDeleted" ||
				event.type === "noteNew" ||
				event.type === "noteRestored" ||
				event.type === "noteTitleEdited" ||
				event.type === "noteContentEdited"
			) {
				loadNotesAndTags(true)
			}
		})

		return () => {
			notesUpdateListener.remove()
			refreshNotesListener.remove()
			notesTagsUpdateListener.remove()
			socketEventListener.remove()
			socketAuthedListener.remove()
		}
	}, [])

	return (
		<View
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<TopBar
				navigation={navigation}
				route={route}
				setLoadDone={setLoadDone}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				rightComponent={
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 12,
							justifyContent: "flex-end"
						}}
					>
						<TouchableOpacity
							hitSlop={{
								top: 15,
								bottom: 15,
								right: 15,
								left: 15
							}}
							style={{
								alignItems: "flex-end",
								flexDirection: "row",
								backgroundColor: "transparent",
								width: "33%",
								paddingLeft: 0,
								justifyContent: "flex-end"
							}}
							onPress={() => {
								SheetManager.show("CreateNoteActionSheet")
							}}
						>
							{networkInfo.online && (
								<Feather
									name="edit"
									size={18}
									color={getColor(darkMode, "linkPrimary")}
								/>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							hitSlop={{
								top: 15,
								bottom: 15,
								right: 5,
								left: 5
							}}
							onPress={() => SheetManager.show("TopBarActionSheet")}
						>
							<Ionicon
								name="ellipsis-horizontal-circle-outline"
								size={23}
								color={getColor(darkMode, "linkPrimary")}
							/>
						</TouchableOpacity>
					</View>
				}
			/>
			<View
				style={{
					height: "100%",
					width: "100%",
					marginTop: 50
				}}
			>
				<FlashList
					data={notesSorted}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					estimatedItemSize={100}
					extraData={{
						darkMode,
						notesSorted,
						navigation,
						userId,
						tags
					}}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								if (!loadDone || !networkInfo.online) {
									return
								}

								setRefreshing(true)

								await new Promise(resolve => setTimeout(resolve, 500))
								await loadNotesAndTags(true).catch(console.error)

								setRefreshing(false)
							}}
							tintColor={getColor(darkMode, "textPrimary")}
						/>
					}
					ListEmptyComponent={
						<>
							{!loadDone || refreshing ? (
								<>
									{!loadDone && (
										<View
											style={{
												flexDirection: "column",
												justifyContent: "center",
												alignItems: "center",
												width: "100%",
												marginTop: Math.floor(dimensions.height / 2) - 200
											}}
										>
											<ActivityIndicator
												size="small"
												color={getColor(darkMode, "textPrimary")}
											/>
										</View>
									)}
								</>
							) : searchTerm.length > 0 ? (
								<View
									style={{
										flexDirection: "column",
										justifyContent: "center",
										alignItems: "center",
										width: "100%",
										marginTop: Math.floor(dimensions.height / 2) - 200
									}}
								>
									<Ionicon
										name="search-outline"
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
										{i18n(lang, "nothingFoundFor", true, ["__TERM__"], [searchTerm])}
									</Text>
								</View>
							) : (
								<View
									style={{
										flexDirection: "column",
										justifyContent: "center",
										alignItems: "center",
										width: "100%",
										marginTop: Math.floor(dimensions.height / 2) - 200
									}}
								>
									<Ionicon
										name="book-outline"
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
										{i18n(lang, "noNotesYet")}
									</Text>
								</View>
							)}
						</>
					}
				/>
			</View>
		</View>
	)
})

export default NotesScreen
