import React, { useState, useEffect, memo, useMemo, useCallback } from "react"
import { View, Text, useWindowDimensions, TouchableOpacity, RefreshControl } from "react-native"
import { TopBar } from "../../components/TopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { Note, NoteTag } from "../../lib/api"
import { fetchNotesAndTags, sortAndFilterNotes, sortAndFilterTags, getUserNameFromNoteParticipant } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import storage from "../../lib/storage"
import { navigationAnimation } from "../../lib/state"
import { StackActions } from "@react-navigation/native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import eventListener from "../../lib/eventListener"
import FastImage from "react-native-fast-image"
import { generateAvatarColorCode } from "../../lib/helpers"

const Item = memo(
	({
		darkMode,
		note,
		index,
		notesSorted,
		navigation,
		userId
	}: {
		darkMode: boolean
		note: Note
		index: number
		notesSorted: Note[]
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		userId: number
	}) => {
		const [height, setHeight] = useState<number>(0)

		const participantsFilteredWithoutMe = useMemo(() => {
			return note.participants
				.filter(p => p.userId !== userId)
				.sort((a, b) => getUserNameFromNoteParticipant(a).localeCompare(getUserNameFromNoteParticipant(b)))
		}, [userId, note.participants])

		return (
			<View
				style={{
					paddingLeft: 0,
					paddingRight: 15
				}}
				onLayout={e => setHeight(e.nativeEvent.layout.height)}
			>
				<TouchableOpacity
					activeOpacity={0.6}
					style={{
						flexDirection: "column",
						borderTopLeftRadius: index === 0 ? 10 : 0,
						borderTopRightRadius: index === 0 ? 10 : 0,
						borderBottomLeftRadius: index >= notesSorted.length - 1 ? 10 : 0,
						borderBottomRightRadius: index >= notesSorted.length - 1 ? 10 : 0,
						marginBottom: index >= notesSorted.length - 1 ? 130 : 0,
						paddingBottom: index >= notesSorted.length - 1 ? 15 : 0,
						paddingTop: 15
					}}
					onPress={async () => {
						await navigationAnimation({ enable: true })

						navigation.dispatch(
							StackActions.push("NoteScreen", {
								note
							})
						)
					}}
					onLongPress={() => {
						eventListener.emit("openNoteActionSheet", note)
					}}
				>
					<View
						style={{
							flexDirection: "row",
							paddingLeft: 15,
							paddingRight: 30
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
								flexDirection: "column",
								paddingLeft: 10,
								width: "100%"
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
											paddingRight: 15
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
										paddingRight: participantsFilteredWithoutMe.length > 0 ? 55 : 15
									}}
								>
									{note.tags.map(tag => {
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
							{index < notesSorted.length - 1 && (
								<View
									style={{
										backgroundColor: getColor(darkMode, "primaryBorder"),
										height: 0.5,
										width: "200%",
										marginTop: 15
									}}
								/>
							)}
						</View>
						{participantsFilteredWithoutMe.length > 0 && (
							<View
								style={{
									flexDirection: "row",
									justifyContent: "center",
									position: "absolute",
									right: participantsFilteredWithoutMe.length > 1 ? 35 : 25,
									top: height === 0 ? 15 : Math.floor(height / 2) - 28
								}}
							>
								{participantsFilteredWithoutMe.map((participant, index) => {
									if (index >= 2) {
										return null
									}

									if (participant.avatar.indexOf("https://") !== -1) {
										return (
											<FastImage
												key={participant.userId}
												source={{
													uri: participantsFilteredWithoutMe[0].avatar
												}}
												style={{
													width: 24,
													height: 24,
													borderRadius: 24,
													left: index > 0 ? 10 : 0,
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
												left: index > 0 ? 10 : 0,
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
				</TouchableOpacity>
			</View>
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
	const [activeTag, setActiveTag] = useMMKVString("notesActiveTag", storage)
	const dimensions = useWindowDimensions()
	const networkInfo = useNetworkInfo()
	const [userId] = useMMKVNumber("userId", storage)

	const notesSorted = useMemo(() => {
		return sortAndFilterNotes(notes, searchTerm, activeTag ? activeTag : "")
	}, [notes, searchTerm, activeTag])

	const tagsSorted = useMemo(() => {
		return sortAndFilterTags(tags)
	}, [tags])

	const loadNotesAndTags = useCallback(async (skipCache: boolean = false) => {
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

			if (notesAndTags.cache) {
				loadNotesAndTags(true)
			}
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			setLoadDone(true)
		}
	}, [])

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
				/>
			)
		},
		[darkMode, notesSorted, navigation, userId]
	)

	useEffect(() => {
		loadNotesAndTags()

		const notesUpdateListener = eventListener.on("notesUpdate", (notes: Note[]) => {
			setNotes(notes)
		})

		const refreshNotesListener = eventListener.on("refreshNotes", () => {
			loadNotesAndTags(true)
		})

		return () => {
			notesUpdateListener.remove()
			refreshNotesListener.remove()
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
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								if (!loadDone || !networkInfo.online) {
									return
								}

								setRefreshing(true)

								await new Promise(resolve => setTimeout(resolve, 500))

								loadNotesAndTags(true).catch(console.error)

								setRefreshing(false)
							}}
							tintColor={getColor(darkMode, "textPrimary")}
						/>
					}
				/>
			</View>
		</View>
	)
})

export default NotesScreen
