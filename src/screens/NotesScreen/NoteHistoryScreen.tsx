import React, { useState, memo, useCallback, useEffect } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, RefreshControl, ActivityIndicator } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, StackActions } from "@react-navigation/native"
import { Note, NoteHistory, noteHistory } from "../../lib/api"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import storage from "../../lib/storage"
import { simpleDate } from "../../lib/helpers"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { showToast } from "../../components/Toasts"
import { decryptNoteKeyParticipant, decryptNoteContent } from "../../lib/crypto"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { createNotePreviewFromContentText } from "./utils"
import { hideAllActionSheets } from "../../components/ActionSheets"
import { navigationAnimation } from "../../lib/state"

const Item = memo(
	({
		darkMode,
		entry,
		index,
		entries,
		navigation,
		selectedNote
	}: {
		darkMode: boolean
		entry: NoteHistoryEntry
		entries: NoteHistoryEntry[]
		index: number
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		selectedNote: Note
	}) => {
		return (
			<TouchableOpacity
				activeOpacity={0.5}
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingLeft: 15,
					paddingRight: 15,
					height: 55,
					marginBottom: index >= entries.length - 1 ? 55 : 0,
					borderBottomColor: getColor(darkMode, "primaryBorder"),
					borderBottomWidth: index >= entries.length - 1 && entries.length > 1 ? 0 : 0.5
				}}
				onPress={async () => {
					await hideAllActionSheets()
					await navigationAnimation({ enable: true })

					navigation.dispatch(
						StackActions.push("NoteScreen", {
							note: selectedNote,
							tags: [],
							readOnly: true,
							historyMode: true,
							historyId: entry.entry.id
						})
					)
				}}
			>
				<View
					style={{
						height: "100%",
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
						width: "100%"
					}}
				>
					<View
						style={{
							flexDirection: "column",
							width: "90%",
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
							{simpleDate(entry.entry.editedTimestamp)}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 13,
								maxWidth: "100%",
								marginTop: 3
							}}
							numberOfLines={1}
						>
							{createNotePreviewFromContentText(entry.content, entry.entry.type)}
						</Text>
					</View>
					<View
						style={{
							justifyContent: "flex-end",
							flexDirection: "row"
						}}
					>
						<Ionicon
							name="chevron-forward-outline"
							color={getColor(darkMode, "textSecondary")}
							size={18}
						/>
					</View>
				</View>
			</TouchableOpacity>
		)
	}
)

export type NoteHistoryEntry = { entry: NoteHistory; content: string }

const NoteHistoryScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const [selectedNote, setSelectedNote] = useState<Note>(route.params.note)
		const dimensions = useWindowDimensions()
		const [loading, setLoading] = useState<boolean>(false)
		const [refreshing, setRefreshing] = useState<boolean>(false)
		const [history, setHistory] = useState<NoteHistoryEntry[]>([])
		const networkInfo = useNetworkInfo()

		const loadHistory = useCallback(async () => {
			if (!selectedNote || !networkInfo.online) {
				return
			}

			setLoading(true)

			try {
				const result = await noteHistory(selectedNote.uuid)
				const userId = storage.getNumber("userId")
				const privateKey = storage.getString("privateKey")
				const promises: Promise<void>[] = []
				const entries: NoteHistoryEntry[] = []

				for (const historyEntry of result) {
					promises.push(
						new Promise(async (resolve, reject) => {
							try {
								const noteKey = await decryptNoteKeyParticipant(
									selectedNote.participants.filter(participant => participant.userId === userId)[0].metadata,
									privateKey
								)

								if (noteKey.length === 0) {
									resolve()

									return
								}

								const contentDecrypted = await decryptNoteContent(historyEntry.content, noteKey)

								entries.push({
									entry: historyEntry,
									content: contentDecrypted
								})
							} catch (e) {
								reject(e)

								return
							}

							resolve()
						})
					)
				}

				await Promise.all(promises)

				setHistory(entries.sort((a, b) => b.entry.editedTimestamp - a.entry.editedTimestamp))
			} catch (e) {
				console.error(e)

				showToast({ message: e.toString() })
			} finally {
				setLoading(false)
			}
		}, [selectedNote, navigation, networkInfo])

		const keyExtractor = useCallback((item: NoteHistoryEntry) => item.entry.id.toString(), [])

		const renderItem = useCallback(
			({ item, index }: { item: NoteHistoryEntry; index: number }) => {
				return (
					<Item
						darkMode={darkMode}
						entries={history}
						entry={item}
						index={index}
						navigation={navigation}
						selectedNote={selectedNote}
					/>
				)
			},
			[darkMode, history, selectedNote, navigation]
		)

		useEffect(() => {
			loadHistory()
		}, [])

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
					middleText={i18n(lang, "history")}
					rightComponent={
						<View
							style={{
								width: "33%",
								justifyContent: "center",
								alignItems: "flex-end",
								paddingRight: 15,
								paddingTop: 3
							}}
						/>
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
						data={history}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						estimatedItemSize={55}
						extraData={{
							darkMode,
							history,
							selectedNote,
							navigation
						}}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={async () => {
									if (loading || !networkInfo.online) {
										return
									}

									setRefreshing(true)

									await new Promise(resolve => setTimeout(resolve, 500))
									await loadHistory().catch(console.error)

									setRefreshing(false)
								}}
								tintColor={getColor(darkMode, "textPrimary")}
							/>
						}
						ListEmptyComponent={
							<>
								{!loading && !refreshing ? (
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
											name="time-outline"
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
											{i18n(lang, "noNoteHistory")}
										</Text>
									</View>
								) : loading ? (
									<View
										style={{
											flexDirection: "column",
											justifyContent: "center",
											alignItems: "center",
											width: "100%",
											marginTop: Math.floor(dimensions.height / 2) - 100
										}}
									>
										<ActivityIndicator
											size="small"
											color={getColor(darkMode, "textPrimary")}
											style={{
												marginTop: -50
											}}
										/>
									</View>
								) : null}
							</>
						}
					/>
				</View>
			</View>
		)
	}
)

export default NoteHistoryScreen
