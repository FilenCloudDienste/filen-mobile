import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from "react"
import { View, Text, TouchableHighlight, TouchableOpacity, useWindowDimensions, RefreshControl, ActivityIndicator } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, StackActions } from "@react-navigation/native"
import { Contact } from "../../lib/api"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import { randomIdUnsafe, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { navigationAnimation } from "../../lib/state"
import { dbFs } from "../../lib/db"
import { FetchContactsResult, fetchContacts, sortContacts } from "./utils"
import { showToast } from "../../components/Toasts"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { TopBar } from "../../components/TopBar"

export interface SelectedContact extends Contact {
	selected: boolean
}

export type SelectContactResponse =
	| {
			cancelled: true
			contacts: []
			requestId: string
	  }
	| {
			cancelled: false
			contacts: Contact[]
			requestId: string
	  }

export const selectContacts = (
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>,
	hiddenUserIds: number[] = []
): Promise<SelectContactResponse> => {
	return new Promise((resolve, reject) => {
		let listener: ReturnType<typeof eventListener.on> = null

		try {
			const requestId = randomIdUnsafe()

			listener = eventListener.on("selectContactResponse", ({ contacts, cancelled, requestId: rId }: SelectContactResponse) => {
				if (requestId !== rId) {
					return
				}

				if (cancelled) {
					resolve({
						cancelled: true,
						contacts: [],
						requestId
					})

					return
				}

				resolve({
					cancelled: false,
					contacts,
					requestId
				})

				listener.remove()
			})

			navigationAnimation({ enable: true }).then(() => {
				navigation.dispatch(
					StackActions.push("SelectContactScreen", {
						requestId,
						hiddenUserIds
					})
				)
			})
		} catch (e) {
			reject(e)
		}
	})
}

const Item = memo(
	({
		darkMode,
		contact,
		contacts,
		index,
		setContacts
	}: {
		darkMode: boolean
		contact: SelectedContact
		contacts: SelectedContact[]
		index: number
		setContacts: React.Dispatch<React.SetStateAction<SelectedContact[]>>
	}) => {
		const toggle = useCallback(() => {
			setContacts(prev => prev.map(c => (c.uuid === contact.uuid ? { ...c, selected: !c.selected } : c)))
		}, [setContacts])

		return (
			<TouchableHighlight
				underlayColor={getColor(darkMode, "backgroundTertiary")}
				style={{
					flexDirection: "row",
					height: 55,
					width: "100%"
				}}
				onPress={toggle}
				onLongPress={toggle}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingLeft: 15,
						paddingRight: 15,
						height: 55,
						width: "100%",
						marginBottom: index >= contacts.length - 1 ? 55 : 0,
						backgroundColor: contact.selected
							? getColor(darkMode, "backgroundTertiary")
							: getColor(darkMode, "backgroundPrimary")
					}}
				>
					<View>
						{contact.avatar.indexOf("https://") !== -1 ? (
							<Image
								source={{
									uri: contact.avatar
								}}
								cachePolicy="memory-disk"
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
									backgroundColor: generateAvatarColorCode(contact.email, darkMode),
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
									{(contact.nickName.length > 0 ? contact.nickName : contact.email).slice(0, 1).toUpperCase()}
								</Text>
							</View>
						)}
					</View>
					<View
						style={{
							flexDirection: "column",
							marginLeft: 10,
							height: "100%",
							borderBottomColor: getColor(darkMode, "primaryBorder"),
							borderBottomWidth: index >= contacts.length - 1 && contacts.length > 1 ? 0 : 0.5,
							width: "100%",
							justifyContent: "center"
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 16,
								maxWidth: "90%"
							}}
							numberOfLines={1}
						>
							{contact.nickName.length > 0 ? contact.nickName : contact.email}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 13,
								maxWidth: "90%"
							}}
							numberOfLines={1}
						>
							{contact.email}
						</Text>
					</View>
				</View>
			</TouchableHighlight>
		)
	}
)

const SelectContactScreen = memo(
	({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const dimensions = useWindowDimensions()
		const [searchTerm, setSearchTerm] = useState<string>("")
		const [loadDone, setLoadDone] = useState<boolean>(false)
		const [contacts, setContacts] = useState<SelectedContact[]>([])
		const [refreshing, setRefreshing] = useState<boolean>(false)
		const networkInfo = useNetworkInfo()
		const didSendResponse = useRef<boolean>(false)
		const requestId = useRef<string>(route.params.requestId).current
		const hiddenUserIds = useRef<number[]>(route.params.hiddenUserIds).current

		const contactsSorted = useMemo(() => {
			return sortContacts(contacts, searchTerm).filter(c => !hiddenUserIds.includes(c.userId))
		}, [contacts, searchTerm, hiddenUserIds]) as SelectedContact[]

		const selectedContacts = useMemo(() => {
			return contactsSorted.filter(c => c.selected)
		}, [contactsSorted])

		const loadContacts = useCallback(
			async (skipCache: boolean = false) => {
				if (skipCache && !networkInfo.online) {
					return
				}

				try {
					const cache = await dbFs.get<FetchContactsResult>("contacts")
					const hasCache =
						cache &&
						cache.contacts &&
						Array.isArray(cache.contacts) &&
						cache.requestsOut &&
						Array.isArray(cache.requestsOut) &&
						cache.requestsIn &&
						Array.isArray(cache.requestsIn) &&
						cache.blocked &&
						Array.isArray(cache.blocked)

					if (!hasCache) {
						setLoadDone(false)
						setContacts([])
					}

					const res = await fetchContacts(skipCache)

					setContacts(prev => {
						const prevSelected = prev.filter(c => c.selected).map(c => c.userId)

						return res.contacts.map(c => ({ ...c, selected: prevSelected.includes(c.userId) }))
					})

					if (res.cache && networkInfo.online) {
						loadContacts(true)
					}
				} catch (e) {
					console.error(e)

					showToast({ message: e.toString() })
				} finally {
					setLoadDone(true)
				}
			},
			[networkInfo]
		)

		const keyExtractor = useCallback((item: SelectedContact) => item.uuid, [])

		const renderItem = useCallback(
			({ item, index }: { item: SelectedContact; index: number }) => {
				return (
					<Item
						darkMode={darkMode}
						contact={item}
						contacts={contactsSorted}
						index={index}
						setContacts={setContacts}
					/>
				)
			},
			[darkMode, contactsSorted, setContacts]
		)

		useEffect(() => {
			loadContacts()

			const refreshInterval = setInterval(() => {
				loadContacts(true)
			}, 5000)

			return () => {
				clearInterval(refreshInterval)

				if (!didSendResponse.current) {
					didSendResponse.current = true

					eventListener.emit("selectContactResponse", {
						cancelled: true,
						contacts: [],
						requestId
					})
				}
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
								if (selectedContacts.length === 0 || didSendResponse.current || !networkInfo.online) {
									return
								}

								didSendResponse.current = true

								eventListener.emit("selectContactResponse", {
									cancelled: false,
									contacts: selectedContacts,
									requestId
								})

								if (navigation.canGoBack()) {
									navigation.goBack()
								}
							}}
						>
							{selectedContacts.length > 0 && (
								<Ionicon
									name="add-outline"
									size={26}
									color={getColor(darkMode, "linkPrimary")}
								/>
							)}
						</TouchableOpacity>
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
						data={contactsSorted}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						estimatedItemSize={55}
						extraData={{
							darkMode,
							contactsSorted,
							setContacts
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
									await loadContacts(true).catch(console.error)

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
											{i18n(lang, "noContactsYet")}
										</Text>
									</View>
								)}
							</>
						}
					/>
				</View>
			</View>
		)
	}
)

export default SelectContactScreen
