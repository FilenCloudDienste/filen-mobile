import "@/lib/global"

import { Stack } from "expo-router"
import { useEffect, useState, Fragment } from "react"
import { StatusBar } from "expo-status-bar"
import { ThemeProvider as NavThemeProvider } from "@react-navigation/native"
import { useColorScheme } from "@/lib/useColorScheme"
import { NAV_THEME } from "@/theme"
import useIsAuthed from "@/hooks/useIsAuthed"
import setup from "@/lib/setup"
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
import Background from "@/components/background"
import SocketEvents from "@/components/socketEvents"
import { NotifierWrapper } from "react-native-notifier"
import Biometric from "@/components/biometric"
import * as SplashScreen from "expo-splash-screen"

SplashScreen.setOptions({
	duration: 400,
	fade: true
})

SplashScreen.preventAutoHideAsync().catch(console.error)

export default function RootLayout() {
	const { colorScheme, colors } = useColorScheme()
	const [isAuthed] = useIsAuthed()
	const [setupDone, setSetupDone] = useState<boolean>(false)

	useEffect(() => {
		Promise.all([setup(), restoreQueries()])
			.then(() => {
				setSetupDone(true)

				setTimeout(() => {
					SplashScreen.hideAsync().catch(console.error)
				}, 1000)
			})
			.catch(console.error)
	}, [])

	return (
		<Fragment>
			<StatusBar
				key={`root-status-bar-${colorScheme}`}
				style={colorScheme === "dark" ? "light" : "auto"}
			/>
			<GestureHandlerRootView
				style={{
					flex: 1,
					backgroundColor: colors.background
				}}
			>
				<KeyboardProvider>
					<QueryClientProvider client={queryClient}>
						<ActionSheetProvider>
							<BottomSheetModalProvider>
								<NavThemeProvider value={NAV_THEME[colorScheme]}>
									<NotifierWrapper useRNScreensOverlay={true}>
										{setupDone && (
											<ShareIntentProvider>
												<Stack
													initialRouteName={isAuthed ? "(app)" : "(auth)"}
													screenOptions={{
														headerShown: false,
														headerBlurEffect: "systemChromeMaterial"
													}}
												>
													<Stack.Screen
														name="(app)"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial"
														}}
													/>
													<Stack.Screen
														name="(auth)"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial"
														}}
													/>
													<Stack.Screen
														name="selectContacts"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="selectDriveItems"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="editPublicLink"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="fileVersionHistory"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="textEditor"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial"
														}}
													/>
													<Stack.Screen
														name="pdfPreview"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="docxPreview"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="transfers"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="shareIntent"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="chat"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial"
														}}
													/>
													<Stack.Screen
														name="trackPlayer"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
													<Stack.Screen
														name="selectTrackPlayerPlaylists"
														options={{
															headerShown: false,
															headerBlurEffect: "systemChromeMaterial",
															presentation: "modal",
															animation: "slide_from_bottom"
														}}
													/>
												</Stack>
												<Listeners />
												{isAuthed && (
													<Fragment>
														<ItemInfoSheet />
														<AuthedListeners />
														<SocketEvents />
														<Background />
														<Biometric />
													</Fragment>
												)}
												<InputPrompt />
												<AlertPrompt />
												<ColorPickerSheet />
												<GalleryModal />
												<PortalHost />
												<FullScreenLoadingModal />
											</ShareIntentProvider>
										)}
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
