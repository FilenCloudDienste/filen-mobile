import React, { useState, useEffect, Fragment, memo, useCallback } from "react"
import { View, Platform, DeviceEventEmitter, Appearance, AppState, AppStateStatus } from "react-native"
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
import { useStore } from "./lib/state"
import { enableScreens } from "react-native-screens"
import { generateItemThumbnail, checkItemThumbnail } from "./lib/services/items"
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
import { isRouteInStack, isNavReady } from "./lib/helpers"
import * as Sentry from "@sentry/react-native"
import { runNetworkCheck } from "./lib/services/isOnline"
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
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake"
import ImagePickerScreen from "./screens/ImagePickerScreen"

enableScreens(true)

if(!__DEV__){
    Sentry.init({
        dsn: "https://1aa0cbb262634a27a5887e91381e4251@o4504039703314432.ingest.sentry.io/4504039705804800",
        enableNative: true,
        enabled: true,
        enableAppHangTracking: false,
        enableNativeCrashHandling: true,
        enableOutOfMemoryTracking: true,
        enableAutoPerformanceTracking: false
    })
}

const Stack = createNativeStackNavigator()
const navigationRef = createNavigationContainerRef()

DeviceEventEmitter.addListener("event", (data) => {
    if(data.type == "generate-thumbnail"){
        void generateItemThumbnail({ item: data.item })
    }
    else if(data.type == "check-thumbnail"){
        void checkItemThumbnail({ item: data.item })
    }
})

export const App = Sentry.wrap(memo(() => {
    const isLoggedIn = useIsLoggedIn()
    const darkMode = useDarkMode()
    const [currentScreenName, setCurrentScreenName] = useState<string>("MainScreen")
    const setCurrentRoutes = useStore(state => state.setCurrentRoutes)
    const toastBottomOffset = useStore(state => state.toastBottomOffset)
    const toastTopOffset = useStore(state => state.toastTopOffset)
    const scrolledToBottom = useStore(state => state.scrolledToBottom)
    const setScrolledToBottom = useStore(state => state.setScrolledToBottom)
    const showNavigationAnimation = useStore(state => state.showNavigationAnimation)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const setBiometricAuthScreenState = useStore(state => state.setBiometricAuthScreenState)
    const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
    const setAppState = useStore(state => state.setAppState)
    const lang = useLang()
    const setContentHeight = useStore(state => state.setContentHeight)
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
    const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)
    const [setupDone, setSetupDone] = useMMKVBoolean("setupDone", storage)
    const [keepAppAwake, setKeepAppAwake] = useMMKVBoolean("keepAppAwake", storage)

    const handleShare = useCallback(async (items: any) => {
        if(!items){
            return false
        }

        if(typeof items !== "undefined"){
            if(typeof items.data !== "undefined"){
                if(items.data !== null){
                    if(items.data.length > 0){
                        await new Promise((resolve) => {
                            const wait = setInterval(() => {
                                if(!isRouteInStack(navigationRef, ["SetupScreen", "BiometricAuthScreen", "LoginScreen"]) && storage.getBoolean("isLoggedIn")){
                                    clearInterval(wait)
        
                                    return resolve(true)
                                }
                            }, 250)
                        })

                        let containsValidItems = true

                        if(Platform.OS == "android"){
                            if(Array.isArray(items.data)){
                                for(let i = 0; i < items.data.length; i++){
                                    if(items.data[i].indexOf("file://") == -1 && items.data[i].indexOf("content://") == -1){
                                        containsValidItems = false
                                    }
                                }
                            }
                            else{
                                if(items.data.indexOf("file://") == -1 && items.data.indexOf("content://") == -1){
                                    containsValidItems = false
                                }
                            }
                        }
                        else{
                            for(let i = 0; i < items.data.length; i++){
                                if(items.data[i].data.indexOf("file://") == -1 && items.data[i].data.indexOf("content://") == -1){
                                    containsValidItems = false
                                }
                            }
                        }

                        if(containsValidItems){
                            setCurrentShareItems(items)

                            showToast({ type: "upload" })
                        }
                        else{
                            showToast({ message: i18n(lang, "shareMenuInvalidType") })
                        }
                    }
                }
            }
        }
    }, [])

    const setAppearance = useCallback((isInit: boolean = false) => {
        setTimeout(() => {
            if(typeof userSelectedTheme == "string" && userSelectedTheme.length > 1 && isInit){
                if(userSelectedTheme == "dark"){
                    storage.set("darkMode", true)
                    
                    setUserSelectedTheme("dark")
                    setStatusBarStyle(true)
                }
                else{
                    storage.set("darkMode", false)

                    setUserSelectedTheme("light")
                    setStatusBarStyle(false)
                }
            }
            else{
                if(Appearance.getColorScheme() == "dark"){
                    storage.set("darkMode", true)

                    setUserSelectedTheme("dark")
                    setStatusBarStyle(true)
                }
                else{
                    storage.set("darkMode", false)
                    
                    setUserSelectedTheme("light")
                    setStatusBarStyle(false)
                }
            }
        }, 1000) // We use a timeout due to the RN appearance event listener firing both "dark" and "light" on app resume which causes the screen to flash for a second
    }, [userSelectedTheme])

    useEffect(() => {
        if(keepAppAwake){
            activateKeepAwake()
        }
        else{
            deactivateKeepAwake()
        }
    }, [keepAppAwake])

    useEffect(() => {
        const nav = () => {
            let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

            if(lockAppAfter == 0){
                lockAppAfter = 300
            }

            lockAppAfter = Math.floor(lockAppAfter * 1000)

            if(
                storage.getBoolean("biometricPinAuth:" + userId)
                && new Date().getTime() >= (storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter)
                && !isRouteInStack(navigationRef, ["BiometricAuthScreen"])
            ){
                setBiometricAuthScreenState("auth")
                
                navigationRef.current?.dispatch(StackActions.push("BiometricAuthScreen"))
            }
            else{
                navigationRef.current?.dispatch(CommonActions.reset({
                    index: 0,
                    routes: [
                        {
                            name: "MainScreen",
                            params: {
                                parent: startOnCloudScreen ? (storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base") : "recents"
                            }
                        }
                    ]
                }))
            }

            setSetupDone(true)
        }

        const offlineSetup = () => {
            try{
                if(
                    typeof storage.getString("masterKeys") == "string"
                    && typeof storage.getString("apiKey") == "string"
                    && typeof storage.getString("privateKey") == "string"
                    && typeof storage.getString("publicKey") == "string"
                    && typeof storage.getNumber("userId") == "number"
                ){
                    // @ts-ignore
                    if(storage.getString("masterKeys").length > 16 && storage.getString("apiKey").length > 16 && storage.getString("privateKey").length > 16 && storage.getString("publicKey").length > 16 && storage.getNumber("userId") !== 0){
                        nav()
                    }
                    else{
                        setSetupDone(false)
    
                        showToast({ message: i18n(lang, "appSetupNotPossible") })
                    }
                }
                else{
                    setSetupDone(false)
    
                    showToast({ message: i18n(lang, "appSetupNotPossible") })
                }
            }
            catch(e){
                console.error(e)

                setSetupDone(false)
    
                showToast({ message: i18n(lang, "appSetupNotPossible") })
            }
        }

        if(isLoggedIn){
            setSetupDone(false)

            isNavReady(navigationRef).then(() => {
                if(storage.getBoolean("setupDone")){
                    nav()

                    return
                }
                
                setup({ navigation: navigationRef }).then(() => nav()).catch((err) => {
                    console.log(err)

                    offlineSetup()
                })
            })
        }
    }, [isLoggedIn])

    useEffect(() => {
        runNetworkCheck(true)

        const appStateListener = async (nextAppState: AppStateStatus) => {
            setAppState(nextAppState)

            await isNavReady(navigationRef)

            if(nextAppState == "background"){
                if(!isRouteInStack(navigationRef, ["BiometricAuthScreen"])){
                    let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

                    if(lockAppAfter == 0){
                        lockAppAfter = 300
                    }

                    lockAppAfter = Math.floor(lockAppAfter * 1000)

                    if(new Date().getTime() >= (storage.getNumber("lastBiometricScreen:" + userId) + lockAppAfter) && storage.getBoolean("biometricPinAuth:" + userId)){
                        setBiometricAuthScreenState("auth")
                        
                        if(navigationRef && navigationRef.current && typeof navigationRef.current.dispatch == "function"){
                            navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
                        }
                    }
                }
            }

            if(nextAppState == "active"){
                runNetworkCheck(true)
            }
        }

        AppState.addEventListener("change", appStateListener)

        const navigationRefListener = (event: any) => {
            if(typeof event.data !== "undefined"){
                if(typeof event.data.state !== "undefined"){
                    if(typeof event.data.state.routes !== "undefined"){
                        if(event.data.state.routes && Array.isArray(event.data.state.routes)){
                            setCurrentScreenName(event.data.state.routes[event.data.state.routes.length - 1].name)
                            setCurrentRoutes(event.data.state.routes)
                            setScrolledToBottom(false)
                        }
                    }
                }
            }
        }

        navigationRef.addListener("state", navigationRefListener)

        ShareMenu.getInitialShare(handleShare)

        const shareMenuListener = ShareMenu.addNewShareListener(handleShare)

        setAppearance(true)

        const appearanceListener = () => setAppearance(false)

        Appearance.addChangeListener(appearanceListener)

        storage.set("setupDone", false)
        storage.set("cameraUploadUploaded", 0)
        storage.set("cameraUploadTotal", 0)
        storage.set("cameraUploadLastRemoteAssets:" + userId, JSON.stringify({}))
        storage.set("cameraUploadFetchRemoteAssetsTimeout:" + userId, (new Date().getTime() - 5000))
        storage.set("cameraUploadRemoteHashes:" + userId, JSON.stringify({}))
        storage.set("cameraUploadUploadedHashes:" + userId, JSON.stringify({}))
        storage.set("cameraUploadUploadedIds", JSON.stringify({}))

        return () => {
            shareMenuListener.remove()
            navigationRef.removeListener("state", navigationRefListener)
            AppState.removeEventListener("change", appStateListener)
            Appearance.removeChangeListener(appearanceListener)
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
                            backgroundColor: getColor(darkMode, "backgroundPrimary"),
                        }}
                    >
                        <SafeAreaView
                            mode="padding"
                            style={{
                                backgroundColor: currentScreenName == "ImageViewerScreen" ? "black" : getColor(darkMode, "backgroundPrimary"),
                                paddingTop: 5,
                                height: "100%",
                                width: "100%"
                            }}
                        >
                            <View
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    backgroundColor: getColor(darkMode, "backgroundPrimary")
                                }}
                                onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
                            >
                                <Stack.Navigator
                                    initialRouteName={isLoggedIn ? (setupDone ? "MainScreen" : "SetupScreen") : "LoginScreen"}
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
                                        {(props) => <LoginScreen {...props} setSetupDone={setSetupDone} />}
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
                                        initialParams={{ parent: startOnCloudScreen ? (storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base") : "recents" }}
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
                                        name="ImagePickerScreen"
                                        component={ImagePickerScreen}
                                        options={{
                                            title: "ImagePickerScreen",
                                            animation: showNavigationAnimation ? "default" : "none",
                                            presentation: "modal"
                                        }}
                                    />
                                </Stack.Navigator>
                                <>
                                    {
                                        setupDone
                                        && isLoggedIn
                                        && [
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
                                            "SetupScreen"
                                        ].includes(currentScreenName)
                                        && (
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
                                        )
                                    }
                                </>
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
                ref={(ref) => global.toast = ref}
                offsetBottom={scrolledToBottom ? 135 : toastBottomOffset}
                offsetTop={toastTopOffset}
            />
        </>
    )
}))