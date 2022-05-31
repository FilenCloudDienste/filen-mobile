import "../lib/globals"
import "../lib/node"
import React, { useState, useEffect, Fragment, useCallback, memo } from "react"
import { Dimensions, View, Platform, DeviceEventEmitter, LogBox, Appearance, AppState, Text, Alert } from "react-native"
import { setup } from "../lib/setup"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { NavigationContainer, createNavigationContainerRef, StackActions } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainScreen } from "./MainScreen"
import { LoginScreen } from "./LoginScreen"
import ShareMenu from "react-native-share-menu"
import { setStatusBarStyle } from "../lib/statusbar"
import { SetupScreen } from "./SetupScreen"
import { BottomBar } from "./BottomBar"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { SettingsScreen } from "./SettingsScreen"
import { ItemActionSheet, TopBarActionSheet, BottomBarAddActionSheet, FolderColorActionSheet, PublicLinkActionSheet, ShareActionSheet, FileVersionsActionSheet, ProfilePictureActionSheet, SortByActionSheet } from "./ActionSheets"
import { useStore } from "../lib/state"
import { FullscreenLoadingModal } from "./Modals"
import { enableScreens } from "react-native-screens"
import { generateItemThumbnail, checkItemThumbnail } from "../lib/services/items"
import { TransfersIndicator } from "./TransfersIndicator"
import { TransfersScreen } from "./TransfersScreen"
import { RenameDialog, CreateFolderDialog, ConfirmPermanentDeleteDialog, ConfirmRemoveFromSharedInDialog, ConfirmStopSharingDialog, CreateTextFileDialog, RedeemCodeDialog, DeleteAccountTwoFactorDialog, Disable2FATwoFactorDialog, BulkShareDialog } from "./Dialogs"
import Toast from "react-native-toast-notifications"
import NetInfo from "@react-native-community/netinfo"
import { CameraUploadScreen } from "./CameraUploadScreen"
import { runCameraUpload } from "../lib/services/cameraUpload"
import { BiometricAuthScreen } from "./BiometricAuthScreen"
import { LanguageScreen } from "./LanguageScreen"
import { SettingsAdvancedScreen } from "./SettingsAdvancedScreen"
import { SettingsAccountScreen } from "./SettingsAccountScreen"
import { EventsScreen, EventsInfoScreen } from "./EventsScreen"
import { CommonActions } from "@react-navigation/native"
import { showToast } from "./Toasts"
import { i18n } from "../i18n/i18n"
import { RegisterScreen } from "./RegisterScreen"
import { ForgotPasswordScreen } from "./ForgotPasswordScreen"
import { ResendConfirmationScreen } from "./ResendConfirmationScreen"
import BackgroundFetch from "react-native-background-fetch"
import Ionicon from "react-native-vector-icons/Ionicons"
import { GDPRScreen } from "./GDPRScreen"
import { InviteScreen } from "./InviteScreen"
import { TwoFactorScreen } from "./TwoFactorScreen"
import { ChangeEmailPasswordScreen } from "./ChangeEmailPasswordScreen"
import { TextEditorScreen } from "./TextEditorScreen"
import checkAppVersion from "../lib/services/versionCheck"
import { UpdateScreen } from "./UpdateScreen"
import BackgroundTimer from "react-native-background-timer"
import { setJSExceptionHandler, setNativeExceptionHandler } from "react-native-exception-handler"
import { reportError } from "../lib/api"
import ImageViewerScreen from "./ImageViewerScreen"
import RNBootSplash from "react-native-bootsplash"

setJSExceptionHandler((err, isFatal) => {
    reportError(err)

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

export const App = memo(() => {
    const [isLoggedIn, setIsLoggedIn] = useMMKVBoolean("isLoggedIn", storage)
    const setDimensions = useStore(useCallback(state => state.setDimensions))
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [setupDone, setSetupDone] = useState(false)
    const [currentScreenName, setCurrentScreenName] = useState("MainScreen")
    const setCurrentRoutes = useStore(useCallback(state => state.setCurrentRoutes))
    const toastBottomOffset = useStore(useCallback(state => state.toastBottomOffset))
    const toastTopOffset = useStore(useCallback(state => state.toastTopOffset))
    const setNetInfo = useStore(useCallback(state => state.setNetInfo))
    const showNavigationAnimation = useStore(useCallback(state => state.showNavigationAnimation))
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
    const setBiometricAuthScreenState = useStore(useCallback(state => state.setBiometricAuthScreenState))
    const setCurrentShareItems = useStore(useCallback(state => state.setCurrentShareItems))
    const setAppState = useStore(useCallback(state => state.setAppState))
    const [lang, setLang] = useMMKVString("lang", storage)
    const [nodeJSAlive, setNodeJSAlive] = useState(true)
    const setContentHeight = useStore(useCallback(state => state.setContentHeight))
    const isDeviceReady = useStore(useCallback(state => state.isDeviceReady))
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
    const [userSelectedTheme, setUserSelectedTheme] = useMMKVString("userSelectedTheme", storage)
    const [currentDimensions, setCurrentDimensions] = useState({ window: Dimensions.get("window"), screen: Dimensions.get("screen") })

    const handleShare = useCallback(async (items) => {
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
                                            if(navState.routes.filter(route => route.name == "SetupScreen" || route.name == "BiometricAuthScreen" || route.name == "LoginScreen").length == 0){
                                                if(storage.getBoolean("isLoggedIn")){
                                                    BackgroundTimer.clearInterval(wait)
    
                                                    return resolve()
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
    })

    const initBackgroundFetch = useCallback(() => {
        BackgroundFetch.configure({
            minimumFetchInterval: 15,
            requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
            stopOnTerminate: false,
            startOnBoot: true,
            enableHeadless: false
        }, (taskId) => {
            console.log("[" + Platform.OS + "] BG fetch running:", taskId)

            const waitForInit = (callback) => {
                const timeout = (+new Date() + 15000)

                const wait = BackgroundTimer.setInterval(() => {
                    if(timeout > (+new Date())){
                        if(isLoggedIn && cameraUploadEnabled && setupDone && isDeviceReady){
                            BackgroundTimer.clearInterval(wait)

                            return callback(false)
                        }
                    }
                    else{
                        BackgroundTimer.clearInterval(wait)

                        return callback(true)
                    }
                }, 10)
            }

            waitForInit((timedOut) => {
                if(timedOut){
                    console.log("[" + Platform.OS + "] BG fetch timed out:", taskId)

                    BackgroundFetch.finish(taskId)
                }
                else{
                    runCameraUpload({
                        runOnce: true,
                        maxQueue: 1,
                        callback: () => {
                            console.log("[" + Platform.OS + "] BG fetch done:", taskId)
    
                            BackgroundFetch.finish(taskId)
                        }
                    })
                }
            })
        }, (taskId) => {
            console.log("[" + Platform.OS + "] BG fetch timeout:", taskId)

            BackgroundFetch.finish(taskId)
        }).then((status) => {
            console.log("[" + Platform.OS + "] BG fetch init status:", status)
        }).catch((err) => {
            console.log("[" + Platform.OS + "] BG fetch init error:", err)
        })
    })

    const setAppearance = useCallback(() => {
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
    })

    useEffect(() => {
        if(isLoggedIn && cameraUploadEnabled && setupDone){
            runCameraUpload({
                maxQueue: 10,
                runOnce: false,
                callback: undefined
            })
        }
    }, [isLoggedIn, cameraUploadEnabled, setupDone])

    useEffect(() => {
        initBackgroundFetch()

        //global.nodeThread.pingPong(() => {
        //    setNodeJSAlive(false)
        //})

        NetInfo.fetch().then((state) => {
            setNetInfo(state)
        }).catch((err) => {
            console.log(err)
        })

        BackgroundTimer.setTimeout(() => RNBootSplash.hide({ fade: true }), 1000)
        
        //BackgroundTimer.start()

        const appStateListener = AppState.addEventListener("change", (nextAppState) => {
            setAppState(nextAppState)

            if(nextAppState == "background"){
                if(Math.floor(+new Date()) > storage.getNumber("biometricPinAuthTimeout:" + userId) && storage.getBoolean("biometricPinAuth:" + userId)){
                    setBiometricAuthScreenState("auth")

                    storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + 500000))
                    
                    navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
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

        const navigationRefListener = navigationRef.addListener("state", (event) => {
            if(typeof event.data !== "undefined"){
                if(typeof event.data.state !== "undefined"){
                    if(typeof event.data.state.routes !== "undefined"){
                        //console.log("Current Screen:", event.data.state.routes[event.data.state.routes.length - 1].name, event.data.state.routes[event.data.state.routes.length - 1].params)

                        setCurrentScreenName(event.data.state.routes[event.data.state.routes.length - 1].name)
                        setCurrentRoutes(event.data.state.routes)
                    }
                }
            }
        })

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

                    storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + 500000))
                    
                    navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
                }
                else{
                    navigationRef.current.dispatch(CommonActions.reset({
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
                    if(storage.getString("masterKeys").length > 16 && storage.getString("apiKey").length > 16 && storage.getString("privateKey").length > 16 && storage.getString("publicKey").length > 16 && storage.getNumber("userId") !== 0){
                        setSetupDone(true)

                        if(storage.getBoolean("biometricPinAuth:" + userId)){
                            setBiometricAuthScreenState("auth")

                            storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + 500000))
                            
                            navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
                        }
                        else{
                            navigationRef.current.dispatch(CommonActions.reset({
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

        // Reset on app launch
        storage.set("cameraUploadRunning", false)

        return () => {
            dimensionsListener.remove()
            shareMenuListener.remove()
            navigationRef.removeListener(navigationRefListener)
            navigationRefListener()
            appearanceListener.remove()
            netInfoListener()
            appStateListener.remove()
        }
    }, [])

  	return (
        <>
            <NavigationContainer ref={navigationRef}>
                <Fragment>
                    <SafeAreaProvider style={{
                        backgroundColor: darkMode ? "black" : "white",
                    }}>
                        <SafeAreaView mode="padding" style={{
                            backgroundColor: currentScreenName == "ImageViewerScreen" ? "black" : (darkMode ? "black" : "white"),
                            paddingTop: Platform.OS == "android" ? 5 : 5,
                            height: "100%",
                            width: "100%"
                        }}>
                            <View style={{
                                width: currentScreenName == "ImageViewerScreen" ? currentDimensions.screen.width : "100%",
                                height: currentScreenName == "ImageViewerScreen" ? currentDimensions.screen.height : "100%",
                                backgroundColor: darkMode ? "black" : "white"
                            }} onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
                                {
                                    nodeJSAlive ? (
                                        <>
                                            <Stack.Navigator initialRouteName={isLoggedIn ? (setupDone ? "MainScreen" : "SetupScreen") : "LoginScreen"} screenOptions={{
                                                contentStyle: {
                                                    backgroundColor: darkMode ? "black" : "white"
                                                },
                                                headerStyle: {
                                                    backgroundColor: darkMode ? "black" : "white"
                                                },
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}>
                                                <Stack.Screen name="SetupScreen" component={SetupScreen} options={{
                                                    title: "SetupScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="LoginScreen" options={{
                                                    title: "LoginScreen"
                                                }}>{(props) => <LoginScreen {...props} setSetupDone={setSetupDone} />}</Stack.Screen>
                                                <Stack.Screen name="RegisterScreen" component={RegisterScreen} options={{
                                                    title: "RegisterScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{
                                                    title: "ForgotPasswordScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="ResendConfirmationScreen" component={ResendConfirmationScreen} options={{
                                                    title: "ResendConfirmationScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="MainScreen" initialParams={{ parent: startOnCloudScreen ? (storage.getBoolean("defaultDriveOnly:" + userId) ? storage.getString("defaultDriveUUID:" + userId) : "base") : "recents" }} component={MainScreen} options={{
                                                    title: "MainScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{
                                                    title: "SettingsScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="TransfersScreen" component={TransfersScreen} options={{
                                                    title: "TransfersScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="CameraUploadScreen" component={CameraUploadScreen} options={{
                                                    title: "CameraUploadScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="BiometricAuthScreen" component={BiometricAuthScreen} options={{
                                                    title: "BiometricAuthScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="LanguageScreen" component={LanguageScreen} options={{
                                                    title: "LanguageScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="SettingsAdvancedScreen" component={SettingsAdvancedScreen} options={{
                                                    title: "SettingsAdvancedScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="SettingsAccountScreen" component={SettingsAccountScreen} options={{
                                                    title: "SettingsAccountScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="EventsScreen" component={EventsScreen} options={{
                                                    title: "EventsScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="EventsInfoScreen" component={EventsInfoScreen} options={{
                                                    title: "EventsInfoScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="GDPRScreen" component={GDPRScreen} options={{
                                                    title: "GDPRScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="InviteScreen" component={InviteScreen} options={{
                                                    title: "InviteScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="TwoFactorScreen" component={TwoFactorScreen} options={{
                                                    title: "TwoFactorScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="ChangeEmailPasswordScreen" component={ChangeEmailPasswordScreen} options={{
                                                    title: "ChangeEmailPasswordScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="TextEditorScreen" component={TextEditorScreen} options={{
                                                    title: "TextEditorScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="UpdateScreen" component={UpdateScreen} options={{
                                                    title: "UpdateScreen"
                                                }}></Stack.Screen>
                                                <Stack.Screen name="ImageViewerScreen" component={ImageViewerScreen} options={{
                                                    title: "ImageViewerScreen",
                                                    presentation: "fullScreenModal"
                                                }}></Stack.Screen>
                                            </Stack.Navigator>
                                            <>
                                                {
                                                    setupDone && isLoggedIn && ["MainScreen", "SettingsScreen", "TransfersScreen", "CameraUploadScreen", "EventsScreen", "EventsInfoScreen", "SettingsAdvancedScreen", "SettingsAccountScreen", "LanguageScreen", "GDPRScreen", "InviteScreen", "TwoFactorScreen", "ChangeEmailPasswordScreen"].includes(currentScreenName) && (
                                                        <View style={{
                                                            position: "relative",
                                                            width: "100%",
                                                            bottom: 0,
                                                            height: 50
                                                        }}>
                                                            <BottomBar navigation={navigationRef} currentScreenName={currentScreenName} />
                                                        </View>
                                                    )
                                                }
                                            </>
                                        </>
                                    ) : (
                                        <View style={{
                                            width: "100%",
                                            height: "100%",
                                            justifyContent: "center",
                                            alignItems: "center"
                                        }}>
                                            <Ionicon name="information-circle-outline" size={70} color={darkMode ? "white" : "black"} />
                                            <Text style={{
                                                color: darkMode ? "white" : "black",
                                                marginTop: 5,
                                                width: "70%",
                                                textAlign: "center"
                                            }}>
                                                {i18n(lang, "nodeJSProcessDied")}
                                            </Text>
                                        </View>
                                    )
                                }
                                {
                                    nodeJSAlive && (
                                        <>
                                            <TransfersIndicator navigation={navigationRef} />
                                            <TopBarActionSheet navigation={navigationRef} />
                                            <BottomBarAddActionSheet navigation={navigationRef} />
                                            <ItemActionSheet navigation={navigationRef} />
                                            <FolderColorActionSheet navigation={navigationRef} />
                                            <PublicLinkActionSheet navigation={navigationRef} />
                                            <ShareActionSheet navigation={navigationRef} />
                                            <FileVersionsActionSheet navigation={navigationRef} />
                                            <ProfilePictureActionSheet navigation={navigationRef} />
                                            <SortByActionSheet navigation={navigationRef} />
                                        </>
                                    )
                                }
                            </View>
                        </SafeAreaView>
                    </SafeAreaProvider>
                    {
                        nodeJSAlive && (
                            <>
                                <Disable2FATwoFactorDialog navigation={navigationRef} />
                                <DeleteAccountTwoFactorDialog navigation={navigationRef} />
                                <RedeemCodeDialog navigation={navigationRef} />
                                <ConfirmStopSharingDialog navigation={navigationRef} />
                                <ConfirmRemoveFromSharedInDialog navigation={navigationRef} />
                                <ConfirmPermanentDeleteDialog navigation={navigationRef} />
                                <RenameDialog navigation={navigationRef} />
                                <CreateFolderDialog navigation={navigationRef} />
                                <CreateTextFileDialog navigation={navigationRef} />
                                <BulkShareDialog navigation={navigationRef} />
                                <FullscreenLoadingModal navigation={navigationRef} />
                            </>
                        )
                    }
                </Fragment>
            </NavigationContainer>
            <Toast
                ref={(ref) => global.toast = ref}
                offsetBottom={toastBottomOffset}
                offsetTop={toastTopOffset}
                pointerEvents="box-none"
                style={{
                    zIndex: 99999
                }}
            />
        </>
    )
})