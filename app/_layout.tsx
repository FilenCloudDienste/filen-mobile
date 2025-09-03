import "@/lib/global"

import { Stack } from "expo-router"
import { useEffect, useState, Fragment, useMemo } from "react"
import { StatusBar } from "expo-status-bar"
import { ThemeProvider as NavThemeProvider } from "@react-navigation/native"
import { useColorScheme } from "@/lib/useColorScheme"
import { NAV_THEME } from "@/theme"
import useIsAuthed from "@/hooks/useIsAuthed"
import authService from "@/services/auth.service"
import { PortalHost } from "@rn-primitives/portal"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { QueryClientProvider } from "@tanstack/react-query"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import queryClient, { restoreQueries } from "@/queries/client"
import InputPrompt from "@/components/prompts/inputPrompt"
import ColorPickerSheet from "@/components/sheets/colorPickerSheet"
import ItemInfoSheet from "@/components/sheets/itemInfoSheet"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import AuthedListeners from "@/components/authedListeners"
import Listeners from "@/components/listeners"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import AlertPrompt from "@/components/prompts/alertPrompt"
import ShareIntentProvider from "@/providers/shareIntentProvider"
import GalleryModal from "@/components/gallery/modal"
import SocketEvents from "@/components/socketEvents"
import { NotifierWrapper } from "react-native-notifier"
import Biometric from "@/components/biometric"
import * as SplashScreen from "expo-splash-screen"
import { SCREEN_OPTIONS } from "@/lib/constants"
import alerts from "@/lib/alerts"
import Reminders from "@/components/reminders"
import { useAppStateStore } from "@/stores/appState.store"
import { useKeepAwake } from "expo-keep-awake"

SplashScreen.setOptions({
	duration: 400,
	fade: true
})

SplashScreen.preventAutoHideAsync().catch(console.error)

export default function RootLayout() {
	useKeepAwake()

	const { colorScheme, colors } = useColorScheme()
	const [isAuthed] = useIsAuthed()
	const [setupDone, setSetupDone] = useState<boolean>(false)

	const statusBarStyle = useMemo(() => {
		return colorScheme === "dark" ? "light" : "auto"
	}, [colorScheme])

	const statusBarKey = useMemo(() => {
		return `root-status-bar-${colorScheme}`
	}, [colorScheme])

	const gestureHandlerRootViewStyle = useMemo(() => {
		return {
			flex: 1,
			backgroundColor: colors.background
		}
	}, [colors.background])

	const initialRouteName = useMemo(() => {
		return isAuthed ? "(app)" : "(auth)"
	}, [isAuthed])

	useEffect(() => {
		useAppStateStore.getState().setSetupDone(setupDone)
	}, [setupDone])

	useEffect(() => {
		Promise.all([authService.setup(), restoreQueries()])
			.then(() => {
				setSetupDone(true)

				SplashScreen.hideAsync().catch(console.error)
			})
			.catch(err => {
				console.error(err)

				if (err instanceof Error) {
					alerts.error(err.message)
				}
			})
	}, [])

	return (
		<Fragment>
			<StatusBar
				key={statusBarKey}
				style={statusBarStyle}
			/>
			<GestureHandlerRootView style={gestureHandlerRootViewStyle}>
				<KeyboardProvider>
					<QueryClientProvider client={queryClient}>
						<ActionSheetProvider>
							<BottomSheetModalProvider>
								<NavThemeProvider value={NAV_THEME[colorScheme]}>
									<NotifierWrapper>
										{setupDone && (
											<ShareIntentProvider>
												<Stack
													initialRouteName={initialRouteName}
													screenOptions={SCREEN_OPTIONS.base}
												>
													<Stack.Screen
														name="(app)"
														options={SCREEN_OPTIONS.base}
													/>
													<Stack.Screen
														name="(auth)"
														options={SCREEN_OPTIONS.base}
													/>
													<Stack.Screen
														name="selectContacts"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="selectDriveItems"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="editPublicLink"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="fileVersionHistory"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="noteHistory"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="noteParticipants"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="textEditor"
														options={SCREEN_OPTIONS.base}
													/>
													<Stack.Screen
														name="pdfPreview"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="docxPreview"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="transfers"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="shareIntent"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="chat/[uuid]"
														options={SCREEN_OPTIONS.base}
													/>
													<Stack.Screen
														name="trackPlayer"
														options={SCREEN_OPTIONS.modal}
													/>
													<Stack.Screen
														name="selectTrackPlayerPlaylists"
														options={SCREEN_OPTIONS.modal}
													/>
												</Stack>
												<Listeners />
												{isAuthed && (
													<Fragment>
														<ItemInfoSheet />
														<AuthedListeners />
														<SocketEvents />
														<Biometric />
														<Reminders />
													</Fragment>
												)}
												<InputPrompt />
												<AlertPrompt />
												<ColorPickerSheet />
												<GalleryModal />
												<PortalHost />
											</ShareIntentProvider>
										)}
										<FullScreenLoadingModal />
									</NotifierWrapper>
								</NavThemeProvider>
							</BottomSheetModalProvider>
						</ActionSheetProvider>
					</QueryClientProvider>
				</KeyboardProvider>
			</GestureHandlerRootView>
		</Fragment>
	)
}
