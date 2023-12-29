import React, { useState, useEffect, memo, useMemo, useCallback } from "react"
import { Text, View, TextInput, TouchableOpacity, DeviceEventEmitter, Keyboard, Platform, useWindowDimensions } from "react-native"
import storage from "../../lib/storage"
import { useMMKVString, useMMKVBoolean, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import Ionicon from "@expo/vector-icons/Ionicons"
import { SheetManager } from "react-native-actions-sheet"
import { useStore, navigationAnimation } from "../../lib/state"
import { getParent, getRouteURL } from "../../lib/helpers"
import { CommonActions } from "@react-navigation/native"
import { getColor } from "../../style/colors"
import { NavigationContainerRef, StackActions } from "@react-navigation/native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import memoryCache from "../../lib/memoryCache"
import { Feather } from "@expo/vector-icons"

export const TopBar = memo(
	({
		navigation,
		route,
		setLoadDone,
		searchTerm,
		setSearchTerm,
		rightComponent
	}: {
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		route: any
		setLoadDone: React.Dispatch<React.SetStateAction<boolean>>
		searchTerm: string
		setSearchTerm: React.Dispatch<React.SetStateAction<string>>
		rightComponent?: React.ReactNode
	}) => {
		const getTopBarTitle = useCallback(
			({ route, lang = "en" }: { route: any; lang: string | undefined }): string => {
				let title = "Cloud"
				const parent = getParent(route)
				const routeURL = getRouteURL(route)

				const isMainScreen = route.name && route.name === "MainScreen"
				const isTransfersScreen = route.name && route.name === "TransfersScreen"
				const isSettingsScreen = route.name && route.name === "SettingsScreen"
				const isBaseScreen = parent.indexOf("base") !== -1
				const isRecentsScreen = parent.indexOf("recents") !== -1
				const isTrashScreen = parent.indexOf("trash") !== -1
				const isSharedInScreen = parent.indexOf("shared-in") !== -1
				const isSharedOutScreen = parent.indexOf("shared-out") !== -1
				const isPublicLinksScreen = parent.indexOf("links") !== -1
				const isOfflineScreen = parent.indexOf("offline") !== -1
				const isFavoritesScreen = parent.indexOf("favorites") !== -1
				const isPhotosScreen = parent.indexOf("photos") !== -1
				const isChatsScreen = route.name && route.name.indexOf("Chat") !== -1
				const isNotesScreen = route.name && route.name.indexOf("Note") !== -1
				const isContactsScreen = route.name && route.name.indexOf("Contact") !== -1
				const isChatParticipantsScreen = route.name && route.name === "ChatParticipantsScreen"
				const isSelectContactScreen = route.name && route.name === "SelectContactScreen"

				if (isTransfersScreen) {
					title = i18n(lang, "transfers")
				} else if (isSettingsScreen) {
					title = i18n(lang, "settings")
				} else if (isRecentsScreen) {
					title = i18n(lang, "home")
				} else if (isTrashScreen) {
					title = i18n(lang, "trash")
				} else if (isSharedInScreen) {
					title = i18n(lang, "home")
				} else if (isSharedOutScreen) {
					title = i18n(lang, "home")
				} else if (isPublicLinksScreen) {
					title = i18n(lang, "home")
				} else if (isFavoritesScreen) {
					title = i18n(lang, "home")
				} else if (isOfflineScreen) {
					title = i18n(lang, "home")
				} else if (isPhotosScreen) {
					title = i18n(lang, "photos")
				} else if (isChatParticipantsScreen) {
					title = i18n(lang, "participants")
				} else if (isSelectContactScreen) {
					title = i18n(lang, "selectContacts")
				} else if (isChatsScreen) {
					title = i18n(lang, "chats")
				} else if (isNotesScreen) {
					title = i18n(lang, "notes")
				} else if (isContactsScreen) {
					title = i18n(lang, "contacts")
				} else {
					if (parent === "base") {
						title = i18n(lang, "cloud")
					} else {
						if (routeURL.split("/").length - 1 > 0) {
							if (memoryCache.has("itemCache:folder:" + parent)) {
								title = memoryCache.get("itemCache:folder:" + parent).name
							} else {
								title = i18n(lang, "cloud")
							}
						} else {
							title = i18n(lang, "cloud")
						}
					}
				}

				return title
			},
			[route]
		)

		const darkMode = useDarkMode()
		const itemsSelectedCount = useStore(state => state.itemsSelectedCount)
		const lang = useLang()
		const [showTextClearButton, setShowTextClearButton] = useState(false)
		const [title, setTitle] = useState<string>(getTopBarTitle({ route, lang }))
		const setTopBarHeight = useStore(state => state.setTopBarHeight)
		const [publicKey] = useMMKVString("publicKey", storage)
		const [privateKey] = useMMKVString("privateKey", storage)
		const dimensions = useWindowDimensions()
		const [userId] = useMMKVNumber("userId", storage)
		const [hideRecents] = useMMKVBoolean("hideRecents:" + userId, storage)

		const [parent, routeURL] = useMemo(() => {
			const parent = getParent(route)
			const routeURL = getRouteURL(route)

			return [parent, routeURL]
		}, [route])

		const homeTabBarTextMaxWidth = useMemo(() => {
			let tabs = 5

			if (hideRecents) {
				tabs -= 1
			}

			if (typeof privateKey !== "string" && typeof publicKey !== "string") {
				tabs -= 2
			} else {
				if (typeof privateKey === "string" && typeof publicKey === "string" && privateKey.length < 16 && publicKey.length < 16) {
					tabs -= 2
				}
			}

			return dimensions.width / tabs - 20
		}, [dimensions, hideRecents, privateKey, publicKey])

		const [
			isMainScreen,
			isTransfersScreen,
			isSettingsScreen,
			isBaseScreen,
			isRecentsScreen,
			isTrashScreen,
			isSharedInScreen,
			isSharedOutScreen,
			isPublicLinksScreen,
			isOfflineScreen,
			isFavoritesScreen,
			isPhotosScreen,
			showHomeTabBar,
			showBackButton,
			isChatsScreen,
			isNotesScreen,
			isContactsScreen,
			isSelectContactScreen,
			isChatParticipantsScreen
		] = useMemo(() => {
			const isMainScreen = route.name && route.name === "MainScreen"
			const isTransfersScreen = route.name && route.name === "TransfersScreen"
			const isSettingsScreen = route.name && route.name === "SettingsScreen"
			const isBaseScreen = parent.indexOf("base") !== -1
			const isRecentsScreen = parent.indexOf("recents") !== -1
			const isTrashScreen = parent.indexOf("trash") !== -1
			const isSharedInScreen = parent.indexOf("shared-in") !== -1
			const isSharedOutScreen = parent.indexOf("shared-out") !== -1
			const isPublicLinksScreen = parent.indexOf("links") !== -1
			const isOfflineScreen = parent.indexOf("offline") !== -1
			const isFavoritesScreen = parent.indexOf("favorites") !== -1
			const isPhotosScreen = parent.indexOf("photos") !== -1
			const isChatsScreen = route.name && route.name.indexOf("Chat") !== -1
			const isNotesScreen = route.name && route.name.indexOf("Note") !== -1
			const isContactsScreen = route.name && route.name === "ContactsScreen"
			const isSelectContactScreen = route.name && route.name === "SelectContactScreen"
			const isChatParticipantsScreen = route.name && route.name === "ChatParticipantsScreen"

			const showHomeTabBar = ["shared-in", "shared-out", "links", "recents", "offline", "favorites"].includes(parent)

			let showBackButton =
				typeof route.params !== "undefined" &&
				!isBaseScreen &&
				!isRecentsScreen &&
				!isSharedInScreen &&
				!isSharedOutScreen &&
				!isPublicLinksScreen &&
				!isFavoritesScreen &&
				!isOfflineScreen &&
				!isPhotosScreen &&
				!isChatsScreen &&
				!isNotesScreen &&
				!isContactsScreen

			if (isTransfersScreen && !showBackButton) {
				showBackButton = true
			}

			if (isMainScreen && routeURL.split("/").length - 1 === 0) {
				showBackButton = false
			}

			if (isTrashScreen || isSelectContactScreen || isChatParticipantsScreen) {
				showBackButton = true
			}

			return [
				isMainScreen,
				isTransfersScreen,
				isSettingsScreen,
				isBaseScreen,
				isRecentsScreen,
				isTrashScreen,
				isSharedInScreen,
				isSharedOutScreen,
				isPublicLinksScreen,
				isOfflineScreen,
				isFavoritesScreen,
				isPhotosScreen,
				showHomeTabBar,
				showBackButton,
				isChatsScreen,
				isNotesScreen,
				isContactsScreen,
				isSelectContactScreen,
				isChatParticipantsScreen
			]
		}, [route, parent])

		const goBack = useCallback((): void => {
			if (typeof setLoadDone !== "undefined") {
				setLoadDone(false)
			}

			navigation.goBack()
		}, [])

		useEffect(() => {
			setTitle(getTopBarTitle({ route, lang }))
		}, [])

		return (
			<View onLayout={e => setTopBarHeight(e.nativeEvent.layout.height)}>
				<View
					style={{
						height: showHomeTabBar ? 85 : isMainScreen && !isPhotosScreen ? 85 : 35,
						marginTop: 10
					}}
				>
					<View
						style={{
							justifyContent: "space-between",
							flexDirection: "row",
							paddingLeft: !showBackButton ? 15 : 10,
							paddingRight: 15,
							alignItems: "center",
							width: "100%",
							height: 30
						}}
					>
						{itemsSelectedCount > 0 && isMainScreen ? (
							<TouchableOpacity
								style={{
									flexDirection: "row",
									alignItems: "center",
									width: "33%",
									justifyContent: "flex-start"
								}}
								onPress={() => {
									DeviceEventEmitter.emit("event", {
										type: "unselect-all-items"
									})
								}}
								hitSlop={{
									top: 15,
									bottom: 15,
									right: 15,
									left: 15
								}}
							>
								<Ionicon
									name="chevron-back-outline"
									size={28}
									color={getColor(darkMode, "linkPrimary")}
								/>
								<Text
									style={{
										fontSize: 17,
										color: getColor(darkMode, "linkPrimary"),
										fontWeight: "400"
									}}
									numberOfLines={1}
								>
									{itemsSelectedCount + " " + i18n(lang, "items", false)}
								</Text>
							</TouchableOpacity>
						) : (
							showBackButton && (
								<TouchableOpacity
									style={{
										flexDirection: "row",
										alignItems: "center",
										width: "33%",
										justifyContent: "flex-start"
									}}
									onPress={() => goBack()}
									hitSlop={{
										top: 15,
										bottom: 15,
										right: 15,
										left: 15
									}}
								>
									<Ionicon
										name="chevron-back-outline"
										size={28}
										color={getColor(darkMode, "linkPrimary")}
									/>
									<Text
										style={{
											fontSize: 17,
											color: getColor(darkMode, "linkPrimary"),
											fontWeight: "400",
											maxWidth: "70%"
										}}
										numberOfLines={1}
									>
										{isTrashScreen
											? i18n(lang, "settings")
											: isChatParticipantsScreen
											? i18n(lang, "chats")
											: i18n(lang, "back")}
									</Text>
								</TouchableOpacity>
							)
						)}
						<View
							style={{
								width: "33%",
								alignItems: !showBackButton ? "flex-start" : "center"
							}}
						>
							{itemsSelectedCount <= 0 && (
								<Text
									style={{
										fontSize: 17,
										color: getColor(darkMode, "textPrimary"),
										fontWeight: "600"
									}}
									numberOfLines={1}
								>
									{title}
								</Text>
							)}
						</View>
						{rightComponent ? (
							rightComponent
						) : (
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
								onPress={async () => {
									if (isContactsScreen) {
										await navigationAnimation({ enable: true })

										navigation.dispatch(StackActions.push("AddContactScreen"))

										return
									}

									if (isNotesScreen) {
										SheetManager.show("CreateNoteActionSheet")

										return
									}

									SheetManager.show("TopBarActionSheet")
								}}
							>
								{isNotesScreen ? (
									<View>
										<Feather
											name="edit"
											size={18}
											color={getColor(darkMode, "linkPrimary")}
										/>
									</View>
								) : isContactsScreen ? (
									<View>
										<Ionicon
											name="add-outline"
											size={26}
											color={getColor(darkMode, "linkPrimary")}
										/>
									</View>
								) : (
									!isSettingsScreen && (
										<View>
											<Ionicon
												name="ellipsis-horizontal-circle-outline"
												size={23}
												color={getColor(darkMode, "linkPrimary")}
											/>
										</View>
									)
								)}
							</TouchableOpacity>
						)}
					</View>
					{(isMainScreen || isNotesScreen || isContactsScreen || isChatsScreen || isSelectContactScreen) && !isPhotosScreen && (
						<View
							style={{
								paddingLeft: 15,
								paddingRight: 15
							}}
						>
							<Ionicon
								name="search-outline"
								size={18}
								color="gray"
								style={{
									position: "absolute",
									zIndex: 2,
									marginTop: 19,
									marginLeft: 23
								}}
							/>
							{showTextClearButton && (
								<TouchableOpacity
									hitSlop={{
										top: 10,
										left: 10,
										right: 10,
										bottom: 10
									}}
									style={{
										position: "absolute",
										zIndex: 2,
										right: 0,
										marginTop: 19,
										width: 43,
										height: 30
									}}
									onPress={() => {
										setSearchTerm("")

										Keyboard.dismiss()

										setShowTextClearButton(false)
									}}
								>
									<Ionicon
										name="close-circle"
										size={18}
										color="gray"
									/>
								</TouchableOpacity>
							)}
							<TextInput
								onChangeText={val => {
									if (val.length > 0) {
										setShowTextClearButton(true)
									} else {
										setShowTextClearButton(false)
									}

									setSearchTerm(val)
								}}
								value={searchTerm}
								placeholder={
									isChatsScreen || isContactsScreen || isNotesScreen || isSelectContactScreen
										? i18n(lang, "search")
										: i18n(lang, "searchInThisFolder")
								}
								placeholderTextColor="gray"
								autoCapitalize="none"
								style={{
									height: 36,
									marginTop: 10,
									zIndex: 1,
									padding: 5,
									backgroundColor: getColor(darkMode, "backgroundSecondary"),
									color: "gray",
									borderRadius: 10,
									paddingLeft: 35,
									paddingRight: 40,
									fontSize: 16
								}}
							/>
						</View>
					)}
				</View>
				{showHomeTabBar && (
					<View
						style={{
							paddingTop: 3,
							height: 40,
							flexDirection: "row",
							paddingLeft: 15,
							paddingRight: 15,
							borderBottomWidth: 0,
							borderBottomColor: getColor(darkMode, "primaryBorder"),
							justifyContent: "space-between"
						}}
					>
						{!hideRecents && (
							<TouchableOpacity
								style={{
									borderBottomWidth: isRecentsScreen ? (Platform.OS === "ios" ? 2 : 2) : 0,
									borderBottomColor: isRecentsScreen ? getColor(darkMode, "linkPrimary") : "#171717",
									height: 27
								}}
								onPress={() => {
									navigationAnimation({ enable: false }).then(() => {
										navigation.dispatch(
											CommonActions.reset({
												index: 0,
												routes: [
													{
														name: "MainScreen",
														params: {
															parent: "recents"
														}
													}
												]
											})
										)
									})
								}}
							>
								<Text
									style={{
										color: isRecentsScreen ? getColor(darkMode, "linkPrimary") : "gray",
										fontWeight: "bold",
										fontSize: 14,
										paddingTop: 2,
										maxWidth: homeTabBarTextMaxWidth
									}}
									numberOfLines={1}
								>
									{i18n(lang, "recents")}
								</Text>
							</TouchableOpacity>
						)}
						{typeof privateKey === "string" &&
							typeof publicKey === "string" &&
							privateKey.length > 16 &&
							publicKey.length > 16 && (
								<>
									<TouchableOpacity
										style={{
											borderBottomWidth: isSharedInScreen ? (Platform.OS === "ios" ? 1.5 : 2) : 0,
											borderBottomColor: isSharedInScreen ? getColor(darkMode, "linkPrimary") : "#171717",
											height: 27
										}}
										onPress={() => {
											navigationAnimation({ enable: false }).then(() => {
												navigation.dispatch(
													CommonActions.reset({
														index: 0,
														routes: [
															{
																name: "MainScreen",
																params: {
																	parent: "shared-in"
																}
															}
														]
													})
												)
											})
										}}
									>
										<Text
											style={{
												color: isSharedInScreen ? getColor(darkMode, "linkPrimary") : "gray",
												fontWeight: "bold",
												fontSize: 14,
												paddingTop: 2,
												maxWidth: homeTabBarTextMaxWidth
											}}
											numberOfLines={1}
										>
											{i18n(lang, "sharedIn")}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={{
											borderBottomWidth: isSharedOutScreen ? (Platform.OS === "ios" ? 1.5 : 2) : 0,
											borderBottomColor: isSharedOutScreen ? getColor(darkMode, "linkPrimary") : "#171717",
											height: 27
										}}
										onPress={() => {
											navigationAnimation({ enable: false }).then(() => {
												navigation.dispatch(
													CommonActions.reset({
														index: 0,
														routes: [
															{
																name: "MainScreen",
																params: {
																	parent: "shared-out"
																}
															}
														]
													})
												)
											})
										}}
									>
										<Text
											style={{
												color: isSharedOutScreen ? getColor(darkMode, "linkPrimary") : "gray",
												fontWeight: "bold",
												fontSize: 14,
												paddingTop: 2,
												maxWidth: homeTabBarTextMaxWidth
											}}
											numberOfLines={1}
										>
											{i18n(lang, "sharedOut")}
										</Text>
									</TouchableOpacity>
								</>
							)}
						<TouchableOpacity
							style={{
								borderBottomWidth: isPublicLinksScreen ? (Platform.OS === "ios" ? 1.5 : 2) : 0,
								borderBottomColor: isPublicLinksScreen ? getColor(darkMode, "linkPrimary") : "#171717",
								height: 27
							}}
							onPress={() => {
								navigationAnimation({ enable: false }).then(() => {
									navigation.dispatch(
										CommonActions.reset({
											index: 0,
											routes: [
												{
													name: "MainScreen",
													params: {
														parent: "links"
													}
												}
											]
										})
									)
								})
							}}
						>
							<Text
								style={{
									color: isPublicLinksScreen ? getColor(darkMode, "linkPrimary") : "gray",
									fontWeight: "bold",
									fontSize: 14,
									paddingTop: 2,
									maxWidth: homeTabBarTextMaxWidth
								}}
								numberOfLines={1}
							>
								{i18n(lang, "publicLinks")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								borderBottomWidth: isFavoritesScreen ? (Platform.OS === "ios" ? 1.5 : 2) : 0,
								borderBottomColor: isFavoritesScreen ? getColor(darkMode, "linkPrimary") : "#171717",
								height: 27
							}}
							onPress={() => {
								navigationAnimation({ enable: false }).then(() => {
									navigation.dispatch(
										CommonActions.reset({
											index: 0,
											routes: [
												{
													name: "MainScreen",
													params: {
														parent: "favorites"
													}
												}
											]
										})
									)
								})
							}}
						>
							<Text
								style={{
									color: isFavoritesScreen ? getColor(darkMode, "linkPrimary") : "gray",
									fontWeight: "bold",
									fontSize: 14,
									paddingTop: 2,
									maxWidth: homeTabBarTextMaxWidth
								}}
								numberOfLines={1}
							>
								{i18n(lang, "favorites")}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								borderBottomWidth: isOfflineScreen ? (Platform.OS === "ios" ? 1.5 : 2) : 0,
								borderBottomColor: isOfflineScreen ? getColor(darkMode, "linkPrimary") : "#171717",
								height: 27
							}}
							onPress={() => {
								navigationAnimation({ enable: false }).then(() => {
									navigation.dispatch(
										CommonActions.reset({
											index: 0,
											routes: [
												{
													name: "MainScreen",
													params: {
														parent: "offline"
													}
												}
											]
										})
									)
								})
							}}
						>
							<Text
								style={{
									color: isOfflineScreen ? getColor(darkMode, "linkPrimary") : "gray",
									fontWeight: "bold",
									fontSize: 14,
									paddingTop: 2,
									maxWidth: homeTabBarTextMaxWidth
								}}
								numberOfLines={1}
							>
								{i18n(lang, "offlineFiles")}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		)
	}
)
