import React, { useState, useEffect, Fragment, memo, useCallback } from "react"
import { View, Platform, DeviceEventEmitter, Appearance, AppState, AppStateStatus } from "react-native"
import { setup } from "./lib/services/setup"
import storage from "./lib/storage"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useMMKVBoolean, useMMKVNumber } from "react-native-mmkv"
import { NavigationContainer, createNavigationContainerRef, StackActions, CommonActions, DarkTheme } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainScreen } from "./screens/MainScreen"
import { LoginScreen } from "./screens/LoginScreen"
import ShareMenu from "react-native-share-menu"
import { setStatusBarStyle } from "./lib/statusbar"
import { SetupScreen } from "./screens/SetupScreen"
import { BottomBar } from "./components/BottomBar"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { SettingsScreen } from "./screens/SettingsScreen"
import { useStore, navigationAnimation } from "./lib/state"
import { enableScreens } from "react-native-screens"
import { TransfersIndicator } from "./components/TransfersIndicator"
import { TransfersScreen } from "./screens/TransfersScreen"
import Toast from "react-native-toast-notifications"
import { CameraUploadScreen } from "./screens/CameraUploadScreen"
import { BiometricAuthScreen } from "./screens/BiometricAuthScreen"
import { LanguageScreen } from "./screens/LanguageScreen"
import { SettingsAdvancedScreen } from "./screens/SettingsAdvancedScreen"
import { SettingsAccountScreen } from "./screens/SettingsAccountScreen"
import { EventsScreen, EventsInfoScreen } from "./screens/EventsScreen"
import { showToast } from "./components/Toasts"
import { i18n } from "./i18n"
import { RegisterScreen } from "./screens/RegisterScreen"
import { ResendConfirmationScreen } from "./screens/ResendConfirmationScreen"
import { GDPRScreen } from "./screens/GDPRScreen"
import { InviteScreen } from "./screens/InviteScreen"
import { TextEditorScreen } from "./screens/TextEditorScreen"
import ImageViewerScreen from "./screens/ImageViewerScreen/ImageViewerScreen"
import { CameraUploadAlbumsScreen } from "./screens/CameraUploadAlbumsScreen"
import { isRouteInStack, isNavReady, generateRandomString, convertTimestampToMs, getFileExt } from "./lib/helpers"
import * as Sentry from "@sentry/react-native"
import { getColor } from "./style"
import PublicLinkActionSheet from "./components/ActionSheets/PublicLinkActionSheet"
import BottomBarAddActionSheet from "./components/ActionSheets/BottomBarAddActionSheet"
import TopBarActionSheet from "./components/ActionSheets/TopBarActionSheet"
import ItemActionSheet from "./components/ActionSheets/ItemActionSheet"
import FolderColorActionSheet from "./components/ActionSheets/FolderColorActionSheet"
import ShareActionSheet from "./components/ActionSheets/ShareActionSheet"
import FileVersionsActionSheet from "./components/ActionSheets/FileVersionsActionSheet"
import ProfilePictureActionSheet from "./components/ActionSheets/ProfilePictureActionSheet"
import SortByActionSheet from "./components/ActionSheets/SortByActionSheet"
import LockAppAfterActionSheet from "./components/ActionSheets/LockAppAfterActionSheet"
import RenameDialog from "./components/Dialogs/RenameDialog"
import CreateFolderDialog from "./components/Dialogs/CreateFolderDialog"
import ConfirmPermanentDeleteDialog from "./components/Dialogs/ConfirmPermanentDeleteDialog"
import ConfirmRemoveFromSharedInDialog from "./components/Dialogs/ConfirmRemoveFromSharedInDialog"
import ConfirmStopSharingDialog from "./components/Dialogs/ConfirmStopSharingDialog"
import CreateTextFileDialog from "./components/Dialogs/CreateTextFileDialog"
import DeleteAccountTwoFactorDialog from "./components/Dialogs/DeleteAccountTwoFactorDialog"
import FullscreenLoadingModal from "./components/Modals/FullscreenLoadingModal"
import useDarkMode from "./lib/hooks/useDarkMode"
import useIsLoggedIn from "./lib/hooks/useIsLoggedIn"
import useLang from "./lib/hooks/useLang"
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake"
import SelectMediaScreen from "./screens/SelectMediaScreen"
import { Asset } from "./screens/SelectMediaScreen/SelectMediaScreen"
import { getAssetURI, getLastModified, convertHeicToJPGIOS, compressImage, compressableImageExts } from "./lib/services/cameraUpload"
import { queueFileUpload } from "./lib/services/upload"
import * as fs from "./lib/fs"
import mimeTypes from "mime-types"
import { showFullScreenLoadingModal, hideFullScreenLoadingModal } from "./components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { getCfg, ChatConversation } from "./lib/api"
import { ICFG, ShareMenuItems } from "./types"
import Announcements from "./components/Announcements"
import { SheetProvider } from "react-native-actions-sheet"
import notifee, { EventType } from "@notifee/react-native"
import ContactsScreen from "./screens/ContactsScreen"
import NotesScreen from "./screens/NotesScreen"
import ChatsScreen from "./screens/ChatsScreen"
import NoteScreen from "./screens/NotesScreen/NoteScreen"
import CreateNoteActionSheet from "./components/ActionSheets/CreateNoteActionSheet"
import NoteActionSheet from "./components/ActionSheets/NoteActionSheet"
import NoteChangeTypeActionSheet from "./components/ActionSheets/NoteChangeTypeActionSheet"
import NoteParticipantsScreen from "./screens/NotesScreen/ParticipantsScreen"
import NoteParticipantsActionSheet from "./components/ActionSheets/NoteParticipantsActionSheet"
import SelectContactScreen from "./screens/ContactsScreen/SelectContactScreen"
import NoteTitleDialog from "./components/Dialogs/NoteTitleDialog"
import NoteTagsActionSheet from "./components/ActionSheets/NoteTagsActionSheet"
import NotesCreateTagDialog from "./components/Dialogs/NotesCreateTagDialog"
import NoteTagDialog from "./components/Dialogs/NoteTagDialog"
import NoteHistoryScreen from "./screens/NotesScreen/NoteHistoryScreen"
import ChatScreen from "./screens/ChatsScreen/ChatScreen"
import ChatMessageActionSheet from "./components/ActionSheets/ChatMessageActionSheet"
import ChatParticipantsScreen from "./screens/ChatsScreen/ChatParticipantsScreen"
import ChatParticipantActionSheet from "./components/ActionSheets/ChatParticipantActionSheet"
import ChatConversationActionSheet from "./components/ActionSheets/ChatConversationActionSheet"
import ChatConversationNameDialog from "./components/Dialogs/ChatConversationNameDialog"
import ContactActionSheet from "./components/ActionSheets/ContactActionSheet"
import AddContactDialog from "./components/Dialogs/AddContactDialog"
import TransfersActionSheet from "./components/ActionSheets/TransfersActionSheet"
import { dbFs } from "./lib/db"
import ConfirmDeleteNoteTagDialog from "./components/Dialogs/ConfirmDeleteNoteTagDialog"
import ConfirmDeleteNotePermanentlyDialog from "./components/Dialogs/ConfirmDeleteNotePermanentlyDialog"
import ConfirmDeleteChatDialog from "./components/Dialogs/ConfirmDeleteChatDialog"
import ConfirmDeleteChatMessageDialog from "./components/Dialogs/ConfirmDeleteChatMessageDialog"
import ConfirmLeaveChatDialog from "./components/Dialogs/ConfirmLeaveChatDialog"
import ConfirmLeaveNoteDialog from "./components/Dialogs/ConfirmLeaveNoteDialog"
import ConfirmRemoveContactDialog from "./components/Dialogs/ConfirmRemoveContactDialog"
import ConfirmRemoveChatParticipantDialog from "./components/Dialogs/ConfirmRemoveChatParticipantDialog"
import ConfirmRemoveNoteParticipantDialog from "./components/Dialogs/ConfirmRemoveNoteParticipantDialog"

enableScreens(true)

if (!__DEV__) {
	Sentry.init({
		dsn: "https://1aa0cbb262634a27a5887e91381e4251@o4504039703314432.ingest.sentry.io/4504039705804800",
		enableNative: true,
		enabled: true,
		enableAppHangTracking: true,
		enableNativeCrashHandling: true
	})
}

const Stack = createNativeStackNavigator()
const navigationRef = createNavigationContainerRef()

const Instance = memo(() => {
	const isLoggedIn = useIsLoggedIn()
	const darkMode = useDarkMode()
	const [currentScreenName, setCurrentScreenName] = useState<string>("MainScreen")
	const setCurrentRoutes = useStore(state => state.setCurrentRoutes)
	const toastBottomOffset = useStore(state => state.toastBottomOffset)
	const toastTopOffset = useStore(state => state.toastTopOffset)
	const scrolledToBottom = useStore(state => state.scrolledToBottom)
	const setScrolledToBottom = useStore(state => state.setScrolledToBottom)
	const showNavigationAnimation = useStore(state => state.showNavigationAnimation)
	const [userId] = useMMKVNumber("userId", storage)
	const setBiometricAuthScreenState = useStore(state => state.setBiometricAuthScreenState)
	const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
	const setAppState = useStore(state => state.setAppState)
	const lang = useLang()
	const setContentHeight = useStore(state => state.setContentHeight)
	const [startOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
	const [setupDone, setSetupDone] = useMMKVBoolean("setupDone", storage)
	const [keepAppAwake] = useMMKVBoolean("keepAppAwake", storage)
	const [cfg, setCFG] = useState<ICFG | undefined>(undefined)
	const [fetchedInitialNotification, setFetchedInitialNotification] = useState<boolean>(false)

	const waitForSetupDone = useCallback(() => {
		return new Promise<void>(resolve => {
			if (setupDone) {
				resolve()

				return
			}

			const wait = setInterval(() => {
				if (setupDone) {
					clearInterval(wait)
					resolve()

					return
				}
			}, 100)
		})
	}, [setupDone])

	const getInitialNotification = useCallback(async () => {
		if (!storage.getBoolean("isLoggedIn")) {
			return
		}

		try {
			const initNotification = await notifee.getInitialNotification()

			if (initNotification) {
				if (Platform.OS === "android") {
					if (
						initNotification.notification &&
						initNotification.notification.android &&
						initNotification.notification.android.pressAction &&
						initNotification.notification.android.pressAction.id
					) {
						const ex = initNotification.notification.android.pressAction.id.split(":")
						const type = ex[0]
						const data = ex[1]

						if (type === "openChats") {
							await Promise.all([waitForSetupDone(), isNavReady(navigationRef), navigationAnimation({ enable: true })])

							navigationRef.dispatch(
								CommonActions.reset({
									index: 0,
									routes: [
										{
											name: "ChatsScreen"
										}
									]
								})
							)
						}

						if (type === "openChat" && data) {
							const cache = await dbFs.get<ChatConversation[]>("chatConversations")
							const hasCache = cache && Array.isArray(cache)

							if (hasCache) {
								const conversations = cache.filter(convo => convo.uuid === data)

								if (conversations.length > 0) {
									navigationRef.dispatch(
										CommonActions.reset({
											index: 1,
											routes: [
												{
													name: "ChatsScreen"
												},
												{
													name: "ChatScreen",
													params: {
														conversation: conversations[0]
													}
												}
											]
										})
									)
								}
							}
						}

						if (type === "openContacts") {
							await Promise.all([waitForSetupDone(), isNavReady(navigationRef), navigationAnimation({ enable: true })])

							navigationRef.dispatch(
								CommonActions.reset({
									index: 1,
									routes: [
										{
											name: "SettingsScreen"
										},
										{
											name: "ContactsScreen"
										}
									]
								})
							)
						}
					}
				}
			}
		} catch (e) {
			console.error(e)
		} finally {
			setFetchedInitialNotification(true)
		}
	}, [navigationRef, setupDone])

	const handleShare = useCallback(async (items: ShareMenuItems) => {
		if (!items || !items.data) {
			return
		}

		await new Promise(resolve => {
			const wait = setInterval(() => {
				if (
					isNavReady(navigationRef) &&
					!isRouteInStack(navigationRef, [
						"SetupScreen",
						"BiometricAuthScreen",
						"LoginScreen",
						"SelectMediaScreen",
						"RegisterScreen",
						"ResendConfirmationScreen"
					]) &&
					storage.getBoolean("isLoggedIn")
				) {
					clearInterval(wait)

					return resolve(true)
				}
			}, 100)
		})

		setCurrentShareItems(items)
		showToast({ type: "upload" })
	}, [])

	const setAppearance = useCallback((timeout: number = 1000) => {
		setTimeout(() => {
			if (!storage.getBoolean("dontFollowSystemTheme")) {
				storage.set("darkMode", Appearance.getColorScheme() === "dark")

				setStatusBarStyle(Appearance.getColorScheme() === "dark")
			} else {
				storage.set("darkMode", storage.getString("userSelectedTheme") === "dark")

				setStatusBarStyle(storage.getString("userSelectedTheme") === "dark")
			}
		}, timeout) // We use a timeout due to the RN appearance event listener firing both "dark" and "light" on app resume which causes the screen to flash for a second
	}, [])

	useEffect(() => {
		if (keepAppAwake) {
			activateKeepAwakeAsync().catch(console.error)
		} else {
			deactivateKeepAwake()
		}
	}, [keepAppAwake])

	useEffect(() => {
		const nav = async () => {
			await getInitialNotification().catch(console.error)

			let lockAppAfter = storage.getNumber("lockAppAfter:" + userId)

			if (lockAppAfter === 0) {
				lockAppAfter = 300
			}

			lockAppAfter = Math.floor(lockAppAfter * 1000)

			if (
				storage.getBoolean("biometricPinAuth:" + userId) &&
				Date.now() >= storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter &&
				isNavReady(navigationRef) &&
				!isRouteInStack(navigationRef, ["BiometricAuthScreen"])
			) {
				setBiometricAuthScreenState("auth")

				navigationRef.current?.dispatch(StackActions.push("BiometricAuthScreen"))
			} else {
				navigationRef.current?.dispatch(
					CommonActions.reset({
						index: 0,
						routes: [
							{
								name: "MainScreen",
								params: {
									parent: startOnCloudScreen
										? storage.getBoolean("defaultDriveOnly:" + userId)
											? storage.getString("defaultDriveUUID:" + userId)
											: "base"
										: storage.getBoolean("hideRecents:" + userId)
										? "shared-in"
										: "recents"
								}
							}
						]
					})
				)
			}

			setSetupDone(true)
		}

		const offlineSetup = () => {
			try {
				if (
					typeof storage.getString("masterKeys") === "string" &&
					typeof storage.getString("apiKey") === "string" &&
					typeof storage.getString("privateKey") === "string" &&
					typeof storage.getString("publicKey") === "string" &&
					typeof storage.getNumber("userId") === "number"
				) {
					if (
						storage.getString("masterKeys").length > 16 &&
						storage.getString("apiKey").length > 16 &&
						storage.getString("privateKey").length > 16 &&
						storage.getString("publicKey").length > 16 &&
						storage.getNumber("userId") !== 0
					) {
						nav()
					} else {
						setSetupDone(false)

						showToast({ message: i18n(lang, "appSetupNotPossible") })
					}
				} else {
					setSetupDone(false)

					showToast({ message: i18n(lang, "appSetupNotPossible") })
				}
			} catch (e) {
				console.error(e)

				setSetupDone(false)

				showToast({ message: i18n(lang, "appSetupNotPossible") })
			}
		}

		if (isLoggedIn) {
			setSetupDone(false)

			isNavReady(navigationRef).then(() => {
				if (storage.getBoolean("setupDone")) {
					nav()

					return
				}

				setup({ navigation: navigationRef })
					.then(() => nav())
					.catch(err => {
						console.error(err)

						offlineSetup()
					})
			})
		}
	}, [isLoggedIn])

	useEffect(() => {
		const appStateListener = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
			setAppState(nextAppState)

			if (nextAppState === "background") {
				if (isNavReady(navigationRef) && !isRouteInStack(navigationRef, ["BiometricAuthScreen"])) {
					let lockAppAfter = storage.getNumber("lockAppAfter:" + userId)

					if (lockAppAfter === 0) {
						lockAppAfter = 300
					}

					lockAppAfter = Math.floor(lockAppAfter * 1000)

					if (
						Date.now() >= storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter &&
						storage.getBoolean("biometricPinAuth:" + userId)
					) {
						setBiometricAuthScreenState("auth")

						navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
					}
				}
			} else if (nextAppState === "active") {
				getInitialNotification().catch(console.error)
			}
		})

		const navigationRefListener = navigationRef.addListener("state", event => {
			if (event.data && event.data.state && Array.isArray(event.data.state.routes)) {
				setCurrentScreenName(event.data.state.routes[event.data.state.routes.length - 1].name)
				setCurrentRoutes(event.data.state.routes)
				setScrolledToBottom(false)
			}
		})

		ShareMenu.getInitialShare(handleShare)

		const shareMenuListener = ShareMenu.addNewShareListener(handleShare)

		getCfg().then(setCFG).catch(console.error)
		setAppearance(1)

		const appearanceListener = Appearance.addChangeListener(() => setAppearance(1000))

		storage.set("setupDone", false)
		storage.set("cameraUploadUploaded", 0)
		storage.set("cameraUploadTotal", 0)

		const openSelectMediaScreenListener = DeviceEventEmitter.addListener("openSelectMediaScreen", async () => {
			await navigationAnimation({ enable: true })

			if (navigationRef && navigationRef.current && typeof navigationRef.current.dispatch === "function") {
				const currentNavState = navigationRef.current.getState()

				navigationRef.current.dispatch(
					StackActions.push("SelectMediaScreen", {
						prevNavigationState: currentNavState,
						album: undefined
					})
				)
			}
		})

		const selectMediaScreenUploadListener = DeviceEventEmitter.addListener(
			"selectMediaScreenUpload",
			async ({ assets, parent }: { assets: Asset[]; parent: string }) => {
				await new Promise(resolve => setTimeout(resolve, 500))

				showFullScreenLoadingModal()

				try {
					const cameraUploadEnableHeic = storage.getBoolean("cameraUploadEnableHeic:" + storage.getNumber("userId"))
					const cameraUploadCompressImages = storage.getBoolean("cameraUploadCompressImages:" + storage.getNumber("userId"))

					for (let i = 0; i < assets.length; i++) {
						const assetURI = await getAssetURI(assets[i].asset)
						const tmp = (await fs.getDownloadPath({ type: "temp" })).slice(0, -1)
						const tmpPath = tmp + "/" + (await generateRandomString(16)) + assets[i].asset.filename

						await fs.copy(assetURI, tmpPath)

						const stat = await fs.stat(tmpPath)
						const lastModified = await getLastModified(
							tmpPath,
							assets[i].asset.filename,
							convertTimestampToMs(assets[i].asset.creationTime || assets[i].asset.modificationTime || Date.now())
						)

						if (stat.exists && stat.size) {
							let filePath = tmpPath
							let fileName = assets[i].asset.filename

							if (
								Platform.OS == "ios" &&
								!cameraUploadEnableHeic &&
								filePath.toLowerCase().endsWith(".heic") &&
								assets[i].asset.mediaType == "photo" &&
								filePath.toLowerCase().indexOf("fullsizerender") == -1
							) {
								const convertedPath = await convertHeicToJPGIOS(filePath)
								const newName =
									fileName.indexOf(".") !== -1 ? fileName.substring(0, fileName.lastIndexOf(".")) + ".JPG" : fileName

								filePath = convertedPath
								fileName = newName
							}

							if (cameraUploadCompressImages && compressableImageExts.includes(getFileExt(filePath))) {
								const compressed = await compressImage(filePath)
								const assetFilenameWithoutEx =
									fileName.indexOf(".") !== -1 ? fileName.substring(0, fileName.lastIndexOf(".")) : fileName

								filePath = compressed
								fileName = assetFilenameWithoutEx + ".JPG"
							}

							queueFileUpload({
								file: {
									path: filePath,
									name: fileName,
									size: stat.size,
									mime: mimeTypes.lookup(fileName) || "",
									lastModified
								},
								parent
							}).catch(console.error)
						}
					}
				} catch (e: any) {
					console.error(e)

					showToast({ message: e.toString() })
				}

				hideFullScreenLoadingModal()
			}
		)

		const notifeeOnForegroundListener = notifee.onForegroundEvent(async event => {
			if (event.type === EventType.PRESS && event.detail && event.detail.notification) {
				if (
					event.detail.notification.data &&
					event.detail.notification.data.type &&
					event.detail.notification.data.type === "foregroundService" &&
					navigationRef &&
					navigationRef.current &&
					typeof navigationRef.current.dispatch === "function"
				) {
					await navigationAnimation({ enable: true })

					navigationRef.current.dispatch(StackActions.push("TransfersScreen"))
				}
			}
		})

		return () => {
			shareMenuListener.remove()
			appStateListener.remove()
			appearanceListener.remove()
			openSelectMediaScreenListener.remove()
			selectMediaScreenUploadListener.remove()

			notifeeOnForegroundListener()
			navigationRefListener()
		}
	}, [])

	return (
		<GestureHandlerRootView
			style={{
				flex: 1
			}}
		>
			<NavigationContainer
				ref={navigationRef}
				theme={darkMode ? DarkTheme : undefined}
			>
				<Fragment>
					<SafeAreaProvider
						style={{
							backgroundColor: getColor(darkMode, "backgroundPrimary")
						}}
					>
						<SafeAreaView
							mode="padding"
							style={{
								backgroundColor:
									currentScreenName === "ImageViewerScreen" ? "black" : getColor(darkMode, "backgroundPrimary"),
								paddingTop: 0,
								height: "100%",
								width: "100%"
							}}
						>
							<SheetProvider>
								<View
									style={{
										width: "100%",
										height: "100%",
										backgroundColor: getColor(darkMode, "backgroundPrimary")
									}}
									onLayout={e => setContentHeight(e.nativeEvent.layout.height)}
								>
									<Stack.Navigator
										initialRouteName={
											isLoggedIn
												? setupDone && fetchedInitialNotification
													? "MainScreen"
													: "SetupScreen"
												: "LoginScreen"
										}
										screenOptions={{
											animation: showNavigationAnimation ? "default" : "none",
											headerShown: false
										}}
									>
										<Stack.Screen
											name="SetupScreen"
											component={SetupScreen}
											options={{
												title: "SetupScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="LoginScreen"
											options={{
												title: "LoginScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										>
											{props => (
												<LoginScreen
													{...props}
													setSetupDone={setSetupDone}
												/>
											)}
										</Stack.Screen>
										<Stack.Screen
											name="RegisterScreen"
											component={RegisterScreen}
											options={{
												title: "RegisterScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="ResendConfirmationScreen"
											component={ResendConfirmationScreen}
											options={{
												title: "ResendConfirmationScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="MainScreen"
											initialParams={{
												parent: startOnCloudScreen
													? storage.getBoolean("defaultDriveOnly:" + userId)
														? storage.getString("defaultDriveUUID:" + userId)
														: "base"
													: storage.getBoolean("hideRecents:" + userId)
													? "shared-in"
													: "recents"
											}}
											component={MainScreen}
											options={{
												title: "MainScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="SettingsScreen"
											component={SettingsScreen}
											options={{
												title: "SettingsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="TransfersScreen"
											component={TransfersScreen}
											options={{
												title: "TransfersScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="CameraUploadScreen"
											component={CameraUploadScreen}
											options={{
												title: "CameraUploadScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="CameraUploadAlbumsScreen"
											component={CameraUploadAlbumsScreen}
											options={{
												title: "CameraUploadAlbumsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="BiometricAuthScreen"
											component={BiometricAuthScreen}
											options={{
												title: "BiometricAuthScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="LanguageScreen"
											component={LanguageScreen}
											options={{
												title: "LanguageScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="SettingsAdvancedScreen"
											component={SettingsAdvancedScreen}
											options={{
												title: "SettingsAdvancedScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="SettingsAccountScreen"
											component={SettingsAccountScreen}
											options={{
												title: "SettingsAccountScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="EventsScreen"
											component={EventsScreen}
											options={{
												title: "EventsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="EventsInfoScreen"
											component={EventsInfoScreen}
											options={{
												title: "EventsInfoScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="GDPRScreen"
											component={GDPRScreen}
											options={{
												title: "GDPRScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="InviteScreen"
											component={InviteScreen}
											options={{
												title: "InviteScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="TextEditorScreen"
											component={TextEditorScreen}
											options={{
												title: "TextEditorScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="ImageViewerScreen"
											component={ImageViewerScreen}
											options={{
												title: "ImageViewerScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="SelectMediaScreen"
											component={SelectMediaScreen}
											options={{
												title: "SelectMediaScreen",
												animation: showNavigationAnimation ? "default" : "none",
												presentation: Platform.OS == "ios" ? "modal" : undefined
											}}
										/>
										<Stack.Screen
											name="ContactsScreen"
											component={ContactsScreen}
											options={{
												title: "ContactsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="NotesScreen"
											component={NotesScreen}
											options={{
												title: "NotesScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="ChatsScreen"
											component={ChatsScreen}
											options={{
												title: "ChatsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="NoteScreen"
											component={NoteScreen}
											options={{
												title: "NoteScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="NoteParticipantsScreen"
											component={NoteParticipantsScreen}
											options={{
												title: "NoteParticipantsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="SelectContactScreen"
											component={SelectContactScreen}
											options={{
												title: "SelectContactScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="NoteHistoryScreen"
											component={NoteHistoryScreen}
											options={{
												title: "NoteHistoryScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="ChatScreen"
											component={ChatScreen}
											options={{
												title: "ChatScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
										<Stack.Screen
											name="ChatParticipantsScreen"
											component={ChatParticipantsScreen}
											options={{
												title: "ChatParticipantsScreen",
												animation: showNavigationAnimation ? "default" : "none"
											}}
										/>
									</Stack.Navigator>
									{typeof cfg !== "undefined" &&
										setupDone &&
										fetchedInitialNotification &&
										isLoggedIn &&
										["MainScreen", "SettingsScreen"].includes(currentScreenName) && <Announcements cfg={cfg} />}
									{setupDone &&
										fetchedInitialNotification &&
										isLoggedIn &&
										[
											"MainScreen",
											"SettingsScreen",
											"TransfersScreen",
											"CameraUploadScreen",
											"CameraUploadAlbumsScreen",
											"EventsScreen",
											"EventsInfoScreen",
											"SettingsAdvancedScreen",
											"SettingsAccountScreen",
											"LanguageScreen",
											"GDPRScreen",
											"InviteScreen",
											"TwoFactorScreen",
											"ChangeEmailPasswordScreen",
											"ChatsScreen",
											"NotesScreen",
											"ContactsScreen",
											"NoteScreen",
											"NoteParticipantsScreen",
											"SelectContactScreen",
											"NoteHistoryScreen",
											"ChatParticipantsScreen",
											...(Platform.OS === "ios" ? ["SelectMediaScreen"] : [])
										].includes(currentScreenName) && (
											<View
												style={{
													position: currentScreenName === "ChatsScreen" ? "absolute" : "relative",
													width: "100%",
													bottom: 0,
													height: 50,
													backgroundColor: getColor(darkMode, "backgroundPrimary")
												}}
											>
												<BottomBar navigation={navigationRef} />
											</View>
										)}
									<TransfersIndicator navigation={navigationRef} />
									<TopBarActionSheet navigation={navigationRef} />
									<BottomBarAddActionSheet />
									<ItemActionSheet navigation={navigationRef} />
									<FolderColorActionSheet />
									<PublicLinkActionSheet />
									<ShareActionSheet />
									<FileVersionsActionSheet />
									<ProfilePictureActionSheet />
									<SortByActionSheet />
									<LockAppAfterActionSheet />
									<CreateNoteActionSheet navigation={navigationRef} />
									<NoteActionSheet navigation={navigationRef} />
									<NoteChangeTypeActionSheet />
									<NoteParticipantsActionSheet />
									<NoteTagsActionSheet />
									<ChatMessageActionSheet />
									<ChatParticipantActionSheet />
									<ChatConversationActionSheet />
									<ContactActionSheet />
									<TransfersActionSheet />
								</View>
							</SheetProvider>
						</SafeAreaView>
					</SafeAreaProvider>
					<DeleteAccountTwoFactorDialog navigation={navigationRef} />
					<ConfirmStopSharingDialog />
					<ConfirmRemoveFromSharedInDialog />
					<ConfirmPermanentDeleteDialog />
					<RenameDialog />
					<CreateFolderDialog />
					<CreateTextFileDialog navigation={navigationRef} />
					<FullscreenLoadingModal />
					<NoteTitleDialog />
					<NotesCreateTagDialog />
					<NoteTagDialog />
					<ChatConversationNameDialog />
					<AddContactDialog />
					<ConfirmDeleteNoteTagDialog />
					<ConfirmDeleteNotePermanentlyDialog navigation={navigationRef} />
					<ConfirmDeleteChatDialog />
					<ConfirmDeleteChatMessageDialog />
					<ConfirmLeaveChatDialog />
					<ConfirmLeaveNoteDialog />
					<ConfirmRemoveContactDialog />
					<ConfirmRemoveChatParticipantDialog />
					<ConfirmRemoveNoteParticipantDialog />
				</Fragment>
			</NavigationContainer>
			<Toast
				ref={ref => (global.toast = ref)}
				offsetBottom={scrolledToBottom ? 130 : toastBottomOffset}
				offsetTop={toastTopOffset}
				swipeEnabled={true}
			/>
		</GestureHandlerRootView>
	)
})

export const App = !__DEV__ ? Sentry.wrap(Instance) : Instance
