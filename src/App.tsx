import "./lib/globals"
import "./lib/node"
import React, { useState, useEffect, Fragment, memo } from "react"
import { Dimensions, View, Platform, DeviceEventEmitter, LogBox, Appearance, AppState, Alert } from "react-native"
import { setup } from "./lib/services/setup/setup"
import storage from "./lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { NavigationContainer, createNavigationContainerRef, StackActions, CommonActions } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainScreen } from "./screens/MainScreen/MainScreen"
import { LoginScreen } from "./screens/LoginScreen/LoginScreen"
import ShareMenu from "react-native-share-menu"
import { setStatusBarStyle } from "./lib/statusbar"
import { SetupScreen } from "./screens/SetupScreen/SetupScreen"
import { BottomBar } from "./components/BottomBar"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { SettingsScreen } from "./screens/SettingsScreen/SettingsScreen"
import { ItemActionSheet, TopBarActionSheet, BottomBarAddActionSheet, LockAppAfterActionSheet, FolderColorActionSheet, PublicLinkActionSheet, ShareActionSheet, FileVersionsActionSheet, ProfilePictureActionSheet, SortByActionSheet } from "./components/ActionSheets"
import { useStore } from "./lib/state"
import { FullscreenLoadingModal } from "./components/Modals"
import { enableScreens } from "react-native-screens"
import { generateItemThumbnail, checkItemThumbnail } from "./lib/services/items"
import { TransfersIndicator } from "./components/TransfersIndicator"
import { TransfersScreen } from "./screens/TransfersScreen/TransfersScreen"
import { RenameDialog, CreateFolderDialog, ConfirmPermanentDeleteDialog, ConfirmRemoveFromSharedInDialog, ConfirmStopSharingDialog, CreateTextFileDialog, RedeemCodeDialog, DeleteAccountTwoFactorDialog, Disable2FATwoFactorDialog, BulkShareDialog } from "./components/Dialogs"
import Toast from "react-native-toast-notifications"
import NetInfo from "@react-native-community/netinfo"
import { CameraUploadScreen } from "./screens/CameraUploadScreen/CameraUploadScreen"
import { BiometricAuthScreen } from "./screens/BiometricAuthScreen/BiometricAuthScreen"
import { LanguageScreen } from "./screens/LanguageScreen/LanguageScreen"
import { SettingsAdvancedScreen } from "./screens/SettingsAdvancedScreen/SettingsAdvancedScreen"
import { SettingsAccountScreen } from "./screens/SettingsAccountScreen/SettingsAccountScreen"
import { EventsScreen, EventsInfoScreen } from "./screens/EventsScreen/EventsScreen"
import { showToast } from "./components/Toasts"
import { i18n } from "./i18n"
import { RegisterScreen } from "./screens/RegisterScreen/RegisterScreen"
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen/ForgotPasswordScreen"
import { ResendConfirmationScreen } from "./screens/ResendConfirmationScreen/ResendConfirmationScreen"
import { GDPRScreen } from "./screens/GDPRScreen/GDPRScreen"
import { InviteScreen } from "./screens/InviteScreen/InviteScreen"
import { TwoFactorScreen } from "./screens/TwoFactorScreen/TwoFactorScreen"
import { ChangeEmailPasswordScreen } from "./screens/ChangeEmailPasswordScreen/ChangeEmailPasswordScreen"
import { TextEditorScreen } from "./screens/TextEditorScreen/TextEditorScreen"
import { checkAppVersion } from "./lib/services/versionCheck"
import { UpdateScreen } from "./screens/UpdateScreen/UpdateScreen"
import BackgroundTimer from "react-native-background-timer"
import { setJSExceptionHandler, setNativeExceptionHandler } from "react-native-exception-handler"
import { reportError } from "./lib/api"
import ImageViewerScreen from "./screens/ImageViewerScreen/ImageViewerScreen"
import { CameraUploadAlbumsScreen } from "./screens/CameraUploadAlbumsScreen/CameraUploadAlbumsScreen"

setJSExceptionHandler((err) => {
    reportError(err.toString())

    Alert.alert("Unexpected error occured",
        `
        Error: ${err.name} ${err.message}

        The error has been automatically reported to us. Please restart the app if it does not continue to work!
        `,
        [
            {
                text: "Close",
                onPress: () => {
                    return false
                }
            }
        ]
    )
}, true)

setNativeExceptionHandler((err) => {
    reportError(err)
}, false)

NetInfo.configure({
    reachabilityUrl: "https://api.filen.io",
    reachabilityTest: async (response) => response.status === 200,
    reachabilityLongTimeout: 60 * 1000,
    reachabilityShortTimeout: 5 * 1000,
    reachabilityRequestTimeout: 15 * 1000,
    reachabilityShouldRun: () => true,
    shouldFetchWiFiSSID: false
})

LogBox.ignoreLogs(["new NativeEventEmitter"])

enableScreens(true)

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

storage.set("cameraUploadUploaded", 0)
storage.set("cameraUploadTotal", 0)

export const App = memo(() => {
    const [isLoggedIn, setIsLoggedIn] = useMMKVBoolean("isLoggedIn", storage)
    const setDimensions = useStore(state => state.setDimensions)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [setupDone, setSetupDone] = useState<boolean>(false)
    const [currentScreenName, setCurrentScreenName] = useState("MainScreen")
    const setCurrentRoutes = useStore(state => state.setCurrentRoutes)
    const toastBottomOffset = useStore(state => state.toastBottomOffset)
    const toastTopOffset = useStore(state => state.toastTopOffset)
    const setNetInfo = useStore(state => state.setNetInfo)
    const showNavigationAnimation = useStore(state => state.showNavigationAnimation)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const setBiometricAuthScreenState = useStore(state => state.setBiometricAuthScreenState)
    const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
    const setAppState = useStore(state => state.setAppState)
    const [lang, setLang] = useMMKVString("lang", storage)
    const setContentHeight = useStore(state => state.setContentHeight)
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
    const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)
    const [currentDimensions, setCurrentDimensions] = useState({ window: Dimensions.get("window"), screen: Dimensions.get("screen") })

    const handleShare = async (items: any) => {
        if(!items){
            return false
        }

        if(typeof items !== "undefined"){
            if(typeof items.data !== "undefined"){
                if(items.data !== null){
                    if(items.data.length > 0){
                        await new Promise((resolve) => {
                            const wait = BackgroundTimer.setInterval(() => {
                                if(typeof navigationRef !== "undefined"){
                                    const navState = navigationRef.getState()

                                    if(typeof navState !== "undefined"){
                                        if(typeof navState.routes !== "undefined"){
                                            if(Array.isArray(navState.routes)){
                                                if(navState.routes.filter(route => route.name == "SetupScreen" || route.name == "BiometricAuthScreen" || route.name == "LoginScreen").length == 0){
                                                    if(storage.getBoolean("isLoggedIn")){
                                                        BackgroundTimer.clearInterval(wait)
        
                                                        return resolve(true)
                                                    }
                                                }
                                            }
                                        }
                                    }
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
    }

    const setAppearance = () => {
        BackgroundTimer.setTimeout(() => {
            if(typeof userSelectedTheme == "string" && userSelectedTheme.length > 1){
                if(userSelectedTheme == "dark"){
                    setDarkMode(true)
                    setStatusBarStyle(true)
                }
                else{
                    setDarkMode(false)
                    setStatusBarStyle(false)
                }
            }
            else{
                if(Appearance.getColorScheme() == "dark"){
                    setDarkMode(true)
                    setStatusBarStyle(true)
                }
                else{
                    setDarkMode(false)
                    setStatusBarStyle(false)
                }
            }
        }, 1000) // We use a timeout due to the RN appearance event listener firing both "dark" and "light" on app resume which causes the screen to flash for a second
    }

    useEffect(() => {
        NetInfo.fetch().then((state) => {
            setNetInfo(state)
        }).catch((err) => {
            console.log(err)
        })

        const appStateListener = AppState.addEventListener("change", (nextAppState) => {
            setAppState(nextAppState)

            if(nextAppState == "background"){
                let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

                if(lockAppAfter == 0){
                    lockAppAfter = 300
                }

                if(Math.floor(+new Date()) > storage.getNumber("biometricPinAuthTimeout:" + userId) && storage.getBoolean("biometricPinAuth:" + userId)){
                    setBiometricAuthScreenState("auth")

                    storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (lockAppAfter * 1000)))
                    
                    navigationRef.current?.dispatch(StackActions.push("BiometricAuthScreen"))
                }
            }

            if(nextAppState == "active"){
                checkAppVersion({ navigation: navigationRef })
            }
        })

        const netInfoListener = NetInfo.addEventListener((state) => {
            setNetInfo(state)
        })

        const dimensionsListener = Dimensions.addEventListener("change", ({ window, screen }) => {
            setDimensions({ window, screen })
            setCurrentDimensions({ window, screen })
        })

        const navigationRefListener = (event: any) => {
            if(typeof event.data !== "undefined"){
                if(typeof event.data.state !== "undefined"){
                    if(typeof event.data.state.routes !== "undefined"){
                        //console.log("Current Screen:", event.data.state.routes[event.data.state.routes.length - 1].name, event.data.state.routes[event.data.state.routes.length - 1].params)

                        setCurrentScreenName(event.data.state.routes[event.data.state.routes.length - 1].name)
                        setCurrentRoutes(event.data.state.routes)
                    }
                }
            }
        }

        navigationRef.addListener("state", navigationRefListener)

        ShareMenu.getInitialShare(handleShare)

        const shareMenuListener = ShareMenu.addNewShareListener(handleShare)

        setAppearance()

        const appearanceListener = Appearance.addChangeListener(() => {
            setAppearance()
        })

        if(isLoggedIn && !setupDone){
            setup({ navigation: navigationRef }).then(() => {
                setSetupDone(true)

                if(storage.getBoolean("biometricPinAuth:" + userId)){
                    setBiometricAuthScreenState("auth")

                    let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

                    if(lockAppAfter == 0){
                        lockAppAfter = 300
                    }

                    storage.set("biometricPinAuthTimeout:" + userId, (new Date().getTime() + (lockAppAfter * 1000)))
                    
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
            }).catch((err) => {
                console.log(err)
    
                if(typeof storage.getString("masterKeys") == "string" && typeof storage.getString("apiKey") == "string" && typeof storage.getString("privateKey") == "string" && typeof storage.getString("publicKey") == "string" && typeof storage.getNumber("userId") == "number"){
                    // @ts-ignore
                    if(storage.getString("masterKeys").length > 16 && storage.getString("apiKey").length > 16 && storage.getString("privateKey").length > 16 && storage.getString("publicKey").length > 16 && storage.getNumber("userId") !== 0){
                        setSetupDone(true)

                        if(storage.getBoolean("biometricPinAuth:" + userId)){
                            setBiometricAuthScreenState("auth")

                            let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

                            if(lockAppAfter == 0){
                                lockAppAfter = 300
                            }

                            storage.set("biometricPinAuthTimeout:" + userId, (new Date().getTime() + (lockAppAfter * 1000)))
                            
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
            })
        }

        storage.set("cameraUploadFetchRemoteAssetsTimeout:" + userId, (new Date().getTime() - 5000))

        return () => {
            dimensionsListener.remove()
            shareMenuListener.remove()
            navigationRef.removeListener("state", navigationRefListener)
            appearanceListener.remove()
            appStateListener.remove()

            netInfoListener()
        }
    }, [])

  	return (
        <>
            <NavigationContainer ref={navigationRef}>
                <Fragment>
                    <SafeAreaProvider
                        style={{
                            backgroundColor: darkMode ? "black" : "white",
                        }}
                    >
                        <SafeAreaView
                            mode="padding"
                            style={{
                                backgroundColor: currentScreenName == "ImageViewerScreen" ? "black" : (darkMode ? "black" : "white"),
                                paddingTop: Platform.OS == "android" ? 5 : 5,
                                height: "100%",
                                width: "100%"
                            }}
                        >
                            <View
                                style={{
                                    width: currentScreenName == "ImageViewerScreen" ? currentDimensions.screen.width : "100%",
                                    height: currentScreenName == "ImageViewerScreen" ? currentDimensions.screen.height : "100%",
                                    backgroundColor: darkMode ? "black" : "white"
                                }}
                                onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
                            >
                                <Stack.Navigator
                                    initialRouteName={isLoggedIn ? (setupDone ? "MainScreen" : "SetupScreen") : "LoginScreen"}
                                    screenOptions={{
                                        contentStyle: {
                                            backgroundColor: darkMode ? "black" : "white"
                                        },
                                        headerStyle: {
                                            backgroundColor: darkMode ? "black" : "white"
                                        },
                                        headerShown: false,
                                        animation: showNavigationAnimation ? "default" : "none"
                                    }}
                                >
                                    <Stack.Screen
                                        name="SetupScreen"
                                        component={SetupScreen}
                                        options={{
                                            title: "SetupScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="LoginScreen"
                                        options={{
                                            title: "LoginScreen"
                                        }}
                                    >
                                        {(props) => <LoginScreen {...props} setSetupDone={setSetupDone} />}
                                    </Stack.Screen>
                                    <Stack.Screen
                                        name="RegisterScreen"
                                        component={RegisterScreen}
                                        options={{
                                            title: "RegisterScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="ForgotPasswordScreen"
                                        component={ForgotPasswordScreen}
                                        options={{
                                            title: "ForgotPasswordScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="ResendConfirmationScreen"
                                        component={ResendConfirmationScreen}
                                        options={{
                                            title: "ResendConfirmationScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="MainScreen"
                                        initialParams={{ parent: startOnCloudScreen ? (storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base") : "recents" }}
                                        component={MainScreen}
                                        options={{
                                            title: "MainScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="SettingsScreen"
                                        component={SettingsScreen}
                                        options={{
                                            title: "SettingsScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="TransfersScreen"
                                        component={TransfersScreen}
                                        options={{
                                            title: "TransfersScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="CameraUploadScreen"
                                        component={CameraUploadScreen} 
                                        options={{
                                            title: "CameraUploadScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="CameraUploadAlbumsScreen"
                                        component={CameraUploadAlbumsScreen} 
                                        options={{
                                            title: "CameraUploadAlbumsScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="BiometricAuthScreen"
                                        component={BiometricAuthScreen}
                                        options={{
                                            title: "BiometricAuthScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="LanguageScreen"
                                        component={LanguageScreen}
                                        options={{
                                            title: "LanguageScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="SettingsAdvancedScreen"
                                        component={SettingsAdvancedScreen}
                                        options={{
                                            title: "SettingsAdvancedScreen"
                                        }}    
                                    />
                                    <Stack.Screen
                                        name="SettingsAccountScreen"
                                        component={SettingsAccountScreen}
                                        options={{
                                            title: "SettingsAccountScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="EventsScreen"
                                        component={EventsScreen}
                                        options={{
                                            title: "EventsScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="EventsInfoScreen"
                                        component={EventsInfoScreen}
                                        options={{
                                            title: "EventsInfoScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="GDPRScreen"
                                        component={GDPRScreen}
                                        options={{
                                            title: "GDPRScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="InviteScreen"
                                        component={InviteScreen}
                                        options={{
                                            title: "InviteScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="TwoFactorScreen"
                                        component={TwoFactorScreen}
                                        options={{
                                            title: "TwoFactorScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="ChangeEmailPasswordScreen"
                                        component={ChangeEmailPasswordScreen}
                                        options={{
                                            title: "ChangeEmailPasswordScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="TextEditorScreen"
                                        component={TextEditorScreen}
                                        options={{
                                            title: "TextEditorScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="UpdateScreen"
                                        component={UpdateScreen}
                                        options={{
                                            title: "UpdateScreen"
                                        }}
                                    />
                                    <Stack.Screen
                                        name="ImageViewerScreen"
                                        component={ImageViewerScreen}
                                        options={{
                                            title: "ImageViewerScreen",
                                            presentation: "fullScreenModal"
                                        }}
                                    />
                                </Stack.Navigator>
                                <>
                                    {
                                        setupDone && isLoggedIn && ["MainScreen", "SettingsScreen", "TransfersScreen", "CameraUploadScreen", "CameraUploadAlbumsScreen", "EventsScreen", "EventsInfoScreen", "SettingsAdvancedScreen", "SettingsAccountScreen", "LanguageScreen", "GDPRScreen", "InviteScreen", "TwoFactorScreen", "ChangeEmailPasswordScreen"].includes(currentScreenName) && (
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
                                <FileVersionsActionSheet navigation={navigationRef} />
                                <ProfilePictureActionSheet />
                                <SortByActionSheet />
                                <LockAppAfterActionSheet />
                            </View>
                        </SafeAreaView>
                    </SafeAreaProvider>
                    <Disable2FATwoFactorDialog navigation={navigationRef} />
                    <DeleteAccountTwoFactorDialog navigation={navigationRef} />
                    <RedeemCodeDialog />
                    <ConfirmStopSharingDialog />
                    <ConfirmRemoveFromSharedInDialog />
                    <ConfirmPermanentDeleteDialog />
                    <RenameDialog />
                    <CreateFolderDialog />
                    <CreateTextFileDialog navigation={navigationRef} />
                    <BulkShareDialog />
                    <FullscreenLoadingModal />
                </Fragment>
            </NavigationContainer>
            <Toast
                ref={(ref) => global.toast = ref}
                offsetBottom={toastBottomOffset}
                offsetTop={toastTopOffset}
                style={{
                    zIndex: 99999
                }}
            />
        </>
    )
})