import React, { useState, useEffect, memo, useMemo, useCallback } from "react"
import { View, Text, useWindowDimensions, TouchableOpacity, RefreshControl } from "react-native"
import { TopBar } from "../../components/TopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"
import { Note, NoteTag } from "../../lib/api"
import { fetchNotesAndTags, sortAndFilterNotes, sortAndFilterTags } from "./utils"
import { dbFs } from "../../lib/db"
import { showToast } from "../../components/Toasts"
import { useMMKVString } from "react-native-mmkv"
import storage from "../../lib/storage"
import { navigationAnimation } from "../../lib/state"
import { StackActions } from "@react-navigation/native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import eventListener from "../../lib/eventListener"

const Item = memo(
	({
		darkMode,
		note,
		index,
		notesSorted,
		navigation
	}: {
		darkMode: boolean
		note: Note
		index: number
		notesSorted: Note[]
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	}) => {
		return (
			<View
				style={{
					paddingLeft: 0,
					paddingRight: 15
				}}
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
								flexDirection: "column"
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
										paddingRight: 15
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
											paddingRight: 15,
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
										paddingRight: 15,
										fontSize: 12
									}}
									numberOfLines={1}
								>
									{new Date(note.editedTimestamp).toLocaleString()}
								</Text>
							)}
							{note.tags.length > 0 && (
								<Text
									style={{
										color: getColor(darkMode, "textSecondary"),
										marginTop: 7,
										paddingRight: 15
									}}
									numberOfLines={1}
								>
									# {note.tags.map(tag => tag.name).join(" ")}
								</Text>
							)}
							{index < notesSorted.length - 1 && (
								<View
									style={{
										//backgroundColor: darkMode ? "rgba(84, 84, 88, 0.3)" : "rgba(84, 84, 88, 0.15)",
										backgroundColor: getColor(darkMode, "primaryBorder"),
										height: 0.5,
										width: "100%",
										marginTop: 15
									}}
								/>
							)}
						</View>
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
				/>
			)
		},
		[darkMode, notesSorted, navigation]
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
