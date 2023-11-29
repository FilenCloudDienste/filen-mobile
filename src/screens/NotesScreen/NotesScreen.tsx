import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { View, Text, useWindowDimensions, ScrollView, TouchableOpacity } from "react-native"
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

export interface NotesScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
	route: any
}

const NotesScreen = memo(({ navigation, route }: NotesScreenProps) => {
	const darkMode = useDarkMode()
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const [notes, setNotes] = useState<Note[]>([])
	const [tags, setTags] = useState<NoteTag[]>([])
	const [activeTag, setActiveTag] = useMMKVString("notesActiveTag", storage)
	const dimensions = useWindowDimensions()

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

	useEffect(() => {
		loadNotesAndTags()
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
			<ScrollView
				style={{
					flexDirection: "column",
					width: dimensions.width,
					marginTop: 60,
					paddingLeft: 15,
					paddingRight: 15
				}}
			>
				{notesSorted.map((note, index) => {
					return (
						<TouchableOpacity
							key={note.uuid}
							activeOpacity={0.8}
							style={{
								flexDirection: "column",
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								borderTopLeftRadius: index === 0 ? 10 : 0,
								borderTopRightRadius: index === 0 ? 10 : 0,
								borderBottomLeftRadius: index >= notesSorted.length - 1 ? 10 : 0,
								borderBottomRightRadius: index >= notesSorted.length - 1 ? 10 : 0,
								marginBottom: index >= notesSorted.length - 1 ? 20 : 0
							}}
							onPress={async () => {
								await navigationAnimation({ enable: true })

								navigation.dispatch(
									StackActions.push("NoteScreen", {
										note
									})
								)
							}}
						>
							<View
								style={{
									flexDirection: "column",
									paddingLeft: 25,
									paddingRight: 25,
									paddingBottom: 10,
									paddingTop: 10
								}}
							>
								<Text
									style={{
										color: getColor(darkMode, "textPrimary"),
										fontWeight: "bold",
										fontSize: 15
									}}
									numberOfLines={1}
								>
									{note.title}
								</Text>
								{note.preview.length > 0 ? (
									<Text
										style={{
											color: getColor(darkMode, "textSecondary"),
											marginTop: 5
										}}
										numberOfLines={1}
									>
										{new Date(note.editedTimestamp).toLocaleString()} {note.preview}
									</Text>
								) : (
									<Text
										style={{
											color: getColor(darkMode, "textSecondary"),
											marginTop: 5
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
											marginTop: 5
										}}
										numberOfLines={1}
									>
										# {note.tags.map(tag => tag.name).join(" ")}
									</Text>
								)}
							</View>
							{index < notesSorted.length - 1 && (
								<View
									style={{
										paddingLeft: 25
									}}
								>
									<View
										style={{
											backgroundColor: darkMode ? "rgba(84, 84, 88, 0.3)" : "rgba(84, 84, 88, 0.15)",
											height: 1
										}}
									/>
								</View>
							)}
						</TouchableOpacity>
					)
				})}
			</ScrollView>
		</View>
	)
})

export default NotesScreen
