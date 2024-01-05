import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import {
	View,
	AppState,
	TouchableOpacity,
	Text,
	RefreshControl,
	ActivityIndicator,
	useWindowDimensions,
	ScrollView,
	NativeSyntheticEvent,
	NativeScrollEvent
} from "react-native"
import { TopBar } from "../../components/TopBar"
import { getColor, blurhashes } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef, useIsFocused } from "@react-navigation/native"
import { fetchContacts, FetchContactsResult } from "./utils"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { dbFs } from "../../lib/db"
import { Contact, ContactRequest, BlockedContact } from "../../lib/api"
import Ionicon from "@expo/vector-icons/Ionicons"
import { FlashList } from "@shopify/flash-list"
import { Image } from "expo-image"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import { generateAvatarColorCode } from "../../lib/helpers"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import eventListener from "../../lib/eventListener"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const Item = memo(
	({
		darkMode,
		contact,
		contacts,
		index,
		type
	}: {
		darkMode: boolean
		contact: Contact | ContactRequest | BlockedContact
		contacts: Contact[] | ContactRequest[] | BlockedContact[]
		index: number
		type: "contact" | "request" | "blocked" | "pending"
	}) => {
		const openActionSheet = useCallback(() => {
			eventListener.emit("openContactActionSheet", {
				type,
				data: contact
			})
		}, [type, contact])

		return (
			<TouchableOpacity
				style={{
					flexDirection: "row",
					height: 55,
					width: "100%"
				}}
				onPress={openActionSheet}
				onLongPress={openActionSheet}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						paddingLeft: 15,
						paddingRight: 15,
						height: 55,
						width: "100%",
						marginBottom: index >= contacts.length - 1 ? 100 : 0,
						backgroundColor: getColor(darkMode, "backgroundPrimary")
					}}
				>
					<View>
						{type === "contact" && typeof (contact as Contact).lastActive === "number" && (
							<View
								style={{
									backgroundColor:
										(contact as Contact).lastActive > Date.now() - ONLINE_TIMEOUT
											? getColor(darkMode, "green")
											: "gray",
									width: 12,
									height: 12,
									borderRadius: 12,
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									position: "absolute",
									left: 23,
									top: 23,
									zIndex: 10001
								}}
							/>
						)}
						{contact.avatar.indexOf("https://") !== -1 ? (
							<Image
								source={{
									uri: contact.avatar
								}}
								cachePolicy="memory-disk"
								placeholder={darkMode ? blurhashes.dark.backgroundSecondary : blurhashes.light.backgroundSecondary}
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
			</TouchableOpacity>
		)
	}
)

export type ContactTab = "all" | "pending" | "requests" | "blocked"

const ContactTabs: ContactTab[] = ["all", "pending", "requests", "blocked"]

const ContactsScreen = memo(({ navigation, route }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList>; route: any }) => {
	const darkMode = useDarkMode()
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [loadDone, setLoadDone] = useState<boolean>(false)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const networkInfo = useNetworkInfo()
	const [contacts, setContacts] = useState<Contact[]>([])
	const [requestsIn, setRequestsIn] = useState<ContactRequest[]>([])
	const [requestsOut, setRequestsOut] = useState<ContactRequest[]>([])
	const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([])
	const isFocused = useIsFocused()
	const dimensions = useWindowDimensions()
	const lang = useLang()
	const [activeTab, setActiveTab] = useState<ContactTab>("all")
	const insets = useSafeAreaInsets()
	const scrollRef = useRef<ScrollView>()
	const [tabSize, setTabSize] = useState<number>(Math.floor(dimensions.width - insets.left - insets.right))

	const contactsSorted = useMemo(() => {
		const sorted = contacts
			.sort((a, b) => {
				const isOnlineA = a.lastActive > Date.now() - ONLINE_TIMEOUT
				const isOnlineB = b.lastActive > Date.now() - ONLINE_TIMEOUT

				if (isOnlineA > isOnlineB) {
					return -1
				} else if (isOnlineA < isOnlineB) {
					return 1
				} else {
					return a.email.localeCompare(b.email)
				}
			})
			.filter(contact => {
				if (searchTerm.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})

		return sorted
	}, [contacts, searchTerm])

	const blockedContactsSorted = useMemo(() => {
		return blockedContacts
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(block => {
				if (searchTerm.length === 0) {
					return true
				}

				if (
					block.email.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 ||
					block.nickName.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [blockedContacts, searchTerm])

	const requestsInSorted = useMemo(() => {
		return requestsIn
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(contact => {
				if (searchTerm.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [requestsIn, searchTerm])

	const requestsOutSorted = useMemo(() => {
		return requestsOut
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(contact => {
				if (searchTerm.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(searchTerm.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [requestsOut, searchTerm])

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
					setBlockedContacts([])
					setRequestsIn([])
					setRequestsOut([])
				}

				const res = await fetchContacts(skipCache)

				setContacts(res.contacts)
				setBlockedContacts(res.blocked)
				setRequestsIn(res.requestsIn)
				setRequestsOut(res.requestsOut)

				if (res.cache && networkInfo.online) {
					loadContacts(true)
				}
			} catch (e) {
				console.error(e)
			} finally {
				setLoadDone(true)
			}
		},
		[networkInfo]
	)

	const keyExtractorContacts = useCallback((item: Contact) => item.uuid, [])
	const keyExtractorRequests = useCallback((item: ContactRequest) => item.uuid, [])
	const keyExtractorBlocked = useCallback((item: BlockedContact) => item.uuid, [])

	const renderItemContacts = useCallback(
		({ item, index }: { item: Contact | ContactRequest | BlockedContact; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					contact={item}
					contacts={contactsSorted}
					index={index}
					type="contact"
				/>
			)
		},
		[darkMode, contactsSorted]
	)

	const renderItemRequestsIn = useCallback(
		({ item, index }: { item: Contact | ContactRequest | BlockedContact; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					contact={item}
					contacts={requestsInSorted}
					index={index}
					type="request"
				/>
			)
		},
		[darkMode, requestsInSorted]
	)

	const renderItemRequestsOut = useCallback(
		({ item, index }: { item: Contact | ContactRequest | BlockedContact; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					contact={item}
					contacts={requestsOutSorted}
					index={index}
					type="pending"
				/>
			)
		},
		[darkMode, requestsOutSorted]
	)

	const renderItemBlocked = useCallback(
		({ item, index }: { item: Contact | ContactRequest | BlockedContact; index: number }) => {
			return (
				<Item
					darkMode={darkMode}
					contact={item}
					contacts={blockedContactsSorted}
					index={index}
					type="blocked"
				/>
			)
		},
		[darkMode, blockedContactsSorted]
	)

	const showTab = useCallback(
		(tab: ContactTab) => {
			const offset =
				tab === "all"
					? 0
					: tab === "pending"
					? Math.floor(tabSize * 1)
					: tab === "requests"
					? Math.floor(tabSize * 2)
					: Math.floor(tabSize * 3)

			scrollRef?.current?.scrollTo({ y: 0, x: offset })

			setActiveTab(tab)
		},
		[tabSize]
	)

	const onMomentumScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const tab = Math.floor(e.nativeEvent.contentSize.width / ContactTabs.length)
		const all = 0
		const pending = Math.floor(tab)
		const requests = Math.floor(tab * 2)
		const blocked = Math.floor(tab * 3)
		const offset = Math.floor(e.nativeEvent.contentOffset.x <= 0 ? 0 : e.nativeEvent.contentOffset.x) + 5

		setTabSize(tab)

		if (offset >= blocked) {
			setActiveTab("blocked")

			return
		}

		if (offset >= requests) {
			setActiveTab("requests")

			return
		}

		if (offset >= pending) {
			setActiveTab("pending")

			return
		}

		if (offset >= all) {
			setActiveTab("all")

			return
		}

		setActiveTab("all")
	}, [])

	useEffect(() => {
		if (isFocused) {
			loadContacts(true)
		}
	}, [isFocused])

	useEffect(() => {
		loadContacts()

		const refreshInterval = setInterval(() => {
			loadContacts(true)
		}, 5000)

		const appStateListener = AppState.addEventListener("change", nextState => {
			if (nextState === "active") {
				loadContacts(true)
			}
		})

		const updateContactsListListener = eventListener.on("updateContactsList", () => {
			loadContacts(true)
		})

		const removeContactRequestListener = eventListener.on("removeContactRequest", (uuid: string) => {
			setRequestsIn(prev => prev.filter(request => request.uuid !== uuid))
			setRequestsOut(prev => prev.filter(request => request.uuid !== uuid))

			loadContacts(true)
		})

		const showContactsPendingListener = eventListener.on("showContactsPending", () => {
			showTab("pending")
		})

		return () => {
			clearInterval(refreshInterval)

			appStateListener.remove()
			updateContactsListListener.remove()
			removeContactRequestListener.remove()
			showContactsPendingListener.remove()
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
						onPress={() => eventListener.emit("openAddContactDialog")}
					>
						<Ionicon
							name="add-outline"
							size={26}
							color={getColor(darkMode, "linkPrimary")}
						/>
					</TouchableOpacity>
				}
			/>
			<View
				style={{
					width: "100%",
					height: 40,
					flexDirection: "row",
					justifyContent: "space-between",
					marginTop: 45
				}}
			>
				{ContactTabs.map(tab => {
					return (
						<TouchableOpacity
							key={tab}
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "center",
								height: "100%",
								width: "25%",
								borderBottomColor:
									activeTab === tab ? getColor(darkMode, "linkPrimary") : getColor(darkMode, "primaryBorder"),
								borderBottomWidth: activeTab === tab ? 2 : 0.5,
								paddingLeft: 3,
								paddingRight: 3,
								gap: 7
							}}
							onPress={() => {
								showTab(tab)
							}}
						>
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									fontSize: 15,
									maxWidth: "80%"
								}}
								numberOfLines={1}
							>
								{i18n(lang, "contactsTab_" + tab)}
							</Text>
							{tab === "requests" && requestsInSorted.length > 0 && (
								<View
									style={{
										width: 16,
										height: 16,
										borderRadius: 16,
										backgroundColor: getColor(darkMode, "red"),
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center"
									}}
								>
									<Text
										style={{
											color: "white",
											fontSize: 10
										}}
										numberOfLines={1}
									>
										{requestsInSorted.length >= 9 ? 9 : requestsInSorted.length}
									</Text>
								</View>
							)}
						</TouchableOpacity>
					)
				})}
			</View>
			<ScrollView
				style={{
					height: "100%",
					width: dimensions.width - insets.left - insets.right,
					marginTop: 10
				}}
				ref={scrollRef}
				pagingEnabled={true}
				horizontal={true}
				showsHorizontalScrollIndicator={false}
				disableIntervalMomentum={true}
				snapToAlignment="center"
				onMomentumScrollEnd={onMomentumScroll}
				onMomentumScrollBegin={onMomentumScroll}
				onLayout={e => setTabSize(Math.floor(e.nativeEvent.layout.width))}
			>
				{ContactTabs.map(tab => {
					return (
						<View
							key={tab}
							style={{
								height: "100%",
								width: dimensions.width - insets.left - insets.right
							}}
						>
							<FlashList
								data={
									tab === "all"
										? contactsSorted
										: tab === "blocked"
										? blockedContactsSorted
										: tab === "pending"
										? requestsOutSorted
										: requestsInSorted
								}
								renderItem={
									tab === "all"
										? renderItemContacts
										: tab === "blocked"
										? renderItemBlocked
										: tab === "pending"
										? renderItemRequestsOut
										: renderItemRequestsIn
								}
								keyExtractor={
									tab === "all"
										? keyExtractorContacts
										: tab === "blocked"
										? keyExtractorBlocked
										: tab === "pending"
										? keyExtractorRequests
										: keyExtractorRequests
								}
								estimatedItemSize={55}
								extraData={{
									darkMode,
									contactsSorted,
									requestsInSorted,
									requestsOutSorted,
									blockedContactsSorted
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
					)
				})}
			</ScrollView>
		</View>
	)
})

export default ContactsScreen
