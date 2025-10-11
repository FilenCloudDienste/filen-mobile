import "@/lib/global"

import { Stack } from "expo-router"
import { useState, Fragment, useMemo } from "react"
import { StatusBar } from "expo-status-bar"
import { ThemeProvider as NavThemeProvider } from "@react-navigation/native"
import { useColorScheme } from "@/lib/useColorScheme"
import { NAV_THEME } from "@/theme"
import { PortalHost } from "@rn-primitives/portal"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { ActionSheetProvider } from "@expo/react-native-action-sheet"
import { queryClientPersister, queryClient, shouldPersistQuery, QUERY_CLIENT_CACHE_TIME } from "@/queries/client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
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
import { SCREEN_OPTIONS } from "@/lib/constants"
import Reminders from "@/components/reminders"
import { useKeepAwake } from "expo-keep-awake"
import { AuthContextProvider, useAuthContext } from "@/components/authContextProvider"
import { SplashScreenController } from "@/components/splashScreenController"

export default function RootLayout() {
	useKeepAwake()

	const { colorScheme, colors } = useColorScheme()
	const [restoredQueries, setRestoredQueries] = useState<boolean>(false)

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

	return (
		<AuthContextProvider>
			<SplashScreenController />
			<StatusBar
				key={statusBarKey}
				style={statusBarStyle}
			/>
			<GestureHandlerRootView style={gestureHandlerRootViewStyle}>
				<KeyboardProvider>
					<PersistQueryClientProvider
						client={queryClient}
						persistOptions={{
							persister: queryClientPersister,
							maxAge: QUERY_CLIENT_CACHE_TIME,
							buster: "v1",
							dehydrateOptions: {
								shouldDehydrateQuery: shouldPersistQuery
							}
						}}
						onError={console.error}
						onSuccess={() => setRestoredQueries(true)}
					>
						<ActionSheetProvider>
							<BottomSheetModalProvider>
								<NavThemeProvider value={NAV_THEME[colorScheme]}>
									<NotifierWrapper useRNScreensOverlay={true}>
										{restoredQueries && <RootNavigator />}
										<FullScreenLoadingModal />
									</NotifierWrapper>
								</NavThemeProvider>
							</BottomSheetModalProvider>
						</ActionSheetProvider>
					</PersistQueryClientProvider>
				</KeyboardProvider>
			</GestureHandlerRootView>
		</AuthContextProvider>
	)
}

function RootNavigator() {
	const { isAuthed, setupDone } = useAuthContext()

	if (!setupDone) {
		return null
	}
	return (
		<ShareIntentProvider>
			<Stack screenOptions={SCREEN_OPTIONS.base}>
				<Stack.Protected guard={!!isAuthed}>
					<Stack.Screen
						name="(app)"
						options={SCREEN_OPTIONS.base}
					/>
				</Stack.Protected>

				<Stack.Protected guard={!isAuthed}>
					<Stack.Screen
						name="(auth)"
						options={SCREEN_OPTIONS.base}
					/>
				</Stack.Protected>

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
	)
}
