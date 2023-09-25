import React, { useState, useEffect, Fragment, memo, useCallback } from "react"
import { View, Platform, DeviceEventEmitter, Appearance, AppState, AppStateStatus, LogBox } from "react-native"
import { setup } from "./lib/services/setup"
import storage from "./lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
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
import { getDownloadPath } from "./lib/services/download"
import mimeTypes from "mime-types"
import { showFullScreenLoadingModal, hideFullScreenLoadingModal } from "./components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import { getCfg } from "./lib/api"
import { ICFG } from "./types"
import Announcements from "./components/Announcements"
import { SheetProvider } from "react-native-actions-sheet"
import notifee, { EventType, InitialNotification } from "@notifee/react-native"

LogBox.ignoreLogs(["new NativeEventEmitter", "Module AssetExporter", "DEPRECATED"])

enableScreens(true)

if (!__DEV__) {
	Sentry.init({
		dsn: "https://1aa0cbb262634a27a5887e91381e4251@o4504039703314432.ingest.sentry.io/4504039705804800",
		enableNative: true,
		enabled: true,
		enableAppHangTracking: true,
		enableNativeCrashHandling: true,
		enableOutOfMemoryTracking: true,
		enableAutoPerformanceTracking: false
	})
}

const Stack = createNativeStackNavigator()
const navigationRef = createNavigationContainerRef()

export const App = Sentry.wrap(
	memo(() => {
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
		const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)
		const [setupDone, setSetupDone] = useMMKVBoolean("setupDone", storage)
		const [keepAppAwake] = useMMKVBoolean("keepAppAwake", storage)
		const [cfg, setCFG] = useState<ICFG | undefined>(undefined)
		const [fetchedInitialNotification, setFetchedInitialNotification] = useState<boolean>(false)
		const [initialNotification, setInitialNotification] = useState<InitialNotification | null>(null)

		const handleShare = useCallback(async (items: any) => {
			if (!items) {
				return false
			}

			if (typeof items !== "undefined") {
				if (typeof items.data !== "undefined") {
					if (items.data !== null) {
						if (items.data.length > 0) {
							await new Promise(resolve => {
								const wait = setInterval(() => {
									if (
										!isRouteInStack(navigationRef, [
											"SetupScreen",
											"BiometricAuthScreen",
											"LoginScreen",
											"SelectMediaScreen"
										]) &&
										storage.getBoolean("isLoggedIn")
									) {
										clearInterval(wait)

										return resolve(true)
									}
								}, 250)
							})

							let containsValidItems = true

							if (Platform.OS == "android") {
								if (Array.isArray(items.data)) {
									for (let i = 0; i < items.data.length; i++) {
										if (items.data[i].indexOf("file://") == -1 && items.data[i].indexOf("content://") == -1) {
											containsValidItems = false
										}
									}
								} else {
									if (items.data.indexOf("file://") == -1 && items.data.indexOf("content://") == -1) {
										containsValidItems = false
									}
								}
							} else {
								for (let i = 0; i < items.data.length; i++) {
									if (items.data[i].data.indexOf("file://") == -1 && items.data[i].data.indexOf("content://") == -1) {
										containsValidItems = false
									}
								}
							}

							if (containsValidItems) {
								setCurrentShareItems(items)

								showToast({ type: "upload" })
							} else {
								showToast({ message: i18n(lang, "shareMenuInvalidType") })
							}
						}
					}
				}
			}
		}, [])

		const setAppearance = useCallback(() => {
			setTimeout(() => {
				if (typeof userSelectedTheme === "string" && userSelectedTheme.length > 1 && storage.getBoolean("dontFollowSystemTheme")) {
					if (userSelectedTheme === "dark") {
						storage.set("darkMode", true)

						setUserSelectedTheme("dark")
						setStatusBarStyle(true)
					} else {
						storage.set("darkMode", false)

						setUserSelectedTheme("light")
						setStatusBarStyle(false)
					}
				} else {
					if (Appearance.getColorScheme() === "dark") {
						storage.set("darkMode", true)

						setUserSelectedTheme("dark")
						setStatusBarStyle(true)
					} else {
						storage.set("darkMode", false)

						setUserSelectedTheme("light")
						setStatusBarStyle(false)
					}
				}
			}, 1000) // We use a timeout due to the RN appearance event listener firing both "dark" and "light" on app resume which causes the screen to flash for a second
		}, [userSelectedTheme])

		useEffect(() => {
			if (keepAppAwake) {
				activateKeepAwakeAsync().catch(console.error)
			} else {
				deactivateKeepAwake()
			}
		}, [keepAppAwake])

		useEffect(() => {
			const nav = async () => {
				try {
					const initNotification = await notifee.getInitialNotification()

					if (initNotification) {
						setInitialNotification(initNotification)
					}
				} catch (e) {
					console.error(e)
				}

				setFetchedInitialNotification(true)

				let lockAppAfter = storage.getNumber("lockAppAfter:" + userId)

				if (lockAppAfter === 0) {
					lockAppAfter = 300
				}

				lockAppAfter = Math.floor(lockAppAfter * 1000)

				if (
					storage.getBoolean("biometricPinAuth:" + userId) &&
					Date.now() >= storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter &&
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
						typeof storage.getString("masterKeys") == "string" &&
						typeof storage.getString("apiKey") == "string" &&
						typeof storage.getString("privateKey") == "string" &&
						typeof storage.getString("publicKey") == "string" &&
						typeof storage.getNumber("userId") == "number"
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
							console.log(err)

							offlineSetup()
						})
				})
			}
		}, [isLoggedIn])

		useEffect(() => {
			const appStateListener = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
				setAppState(nextAppState)

				await isNavReady(navigationRef)

				if (nextAppState === "background") {
					if (!isRouteInStack(navigationRef, ["BiometricAuthScreen"])) {
						let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

						if (lockAppAfter == 0) {
							lockAppAfter = 300
						}

						lockAppAfter = Math.floor(lockAppAfter * 1000)

						if (
							Date.now() >= storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter &&
							storage.getBoolean("biometricPinAuth:" + userId)
						) {
							setBiometricAuthScreenState("auth")

							if (navigationRef && navigationRef.current && typeof navigationRef.current.dispatch == "function") {
								navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
							}
						}
					}
				}
			})

			const navigationRefListener = (event: any) => {
				if (event.data && event.data.state && Array.isArray(event.data.state.routes)) {
					setCurrentScreenName(event.data.state.routes[event.data.state.routes.length - 1].name)
					setCurrentRoutes(event.data.state.routes)
					setScrolledToBottom(false)
				}
			}

			navigationRef.addListener("state", navigationRefListener)

			ShareMenu.getInitialShare(handleShare)

			const shareMenuListener = ShareMenu.addNewShareListener(handleShare)

			setAppearance()
			getCfg().then(setCFG).catch(console.error)

			const appearanceListener = Appearance.addChangeListener(setAppearance)

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
							const tmp = (await getDownloadPath({ type: "temp" })).slice(0, -1)
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
				navigationRef.removeListener("state", navigationRefListener)
				appStateListener.remove()
				appearanceListener.remove()
				openSelectMediaScreenListener.remove()
				selectMediaScreenUploadListener.remove()

				notifeeOnForegroundListener()
			}
		}, [])

		return (
			<>
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
									paddingTop: 5,
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
												...(Platform.OS === "ios" ? ["SelectMediaScreen"] : [])
											].includes(currentScreenName) && (
												<View
													style={{
														position: "relative",
														width: "100%",
														bottom: 0,
														height: 50
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
					</Fragment>
				</NavigationContainer>
				<Toast
					ref={ref => (global.toast = ref)}
					offsetBottom={scrolledToBottom ? 135 : toastBottomOffset}
					offsetTop={toastTopOffset}
				/>
			</>
		)
	})
)
