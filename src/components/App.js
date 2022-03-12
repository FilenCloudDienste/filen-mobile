import "../lib/globals"
import "../lib/node"
import React, { useState, useEffect, Fragment, useCallback } from "react"
import { Dimensions, SafeAreaView, View, Platform, DeviceEventEmitter, LogBox, Appearance, AppState, Text } from "react-native"
import { setup } from "../lib/setup"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { NavigationContainer, createNavigationContainerRef, StackActions } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { MainScreen } from "./MainScreen"
import { LoginScreen } from "./LoginScreen"
import ShareMenu from "react-native-share-menu"
import { setStatusBarStyle } from "../lib/statusbar"
import { SetupScreen } from "./SetupScreen"
import { BottomBar } from "./BottomBar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { SettingsScreen } from "./SettingsScreen"
import { ItemActionSheet, TopBarActionSheet, BottomBarAddActionSheet, FolderColorActionSheet, PublicLinkActionSheet, ShareActionSheet, FileVersionsActionSheet } from "./ActionSheets"
import { useStore } from "../lib/state"
import { FullscreenLoadingModal } from "./Modals"
import { enableScreens } from "react-native-screens"
import { generateItemThumbnail } from "../lib/services/items"
import { TransfersIndicator } from "./TransfersIndicator"
import { TransfersScreen } from "./TransfersScreen"
import { RenameDialog, CreateFolderDialog, ConfirmPermanentDeleteDialog, ConfirmRemoveFromSharedInDialog, ConfirmStopSharingDialog, CreateTextFileDialog, RedeemCodeDialog, DeleteAccountTwoFactorDialog, Disable2FATwoFactorDialog } from "./Dialogs"
import Toast from "react-native-toast-notifications"
import { startBackgroundTimer, stopBackgroundTimer } from "../lib/background"
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
import SplashScreen from "react-native-splash-screen"
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

enableScreens(false)

const Stack = createNativeStackNavigator()
const navigationRef = createNavigationContainerRef()

DeviceEventEmitter.addListener("event", (data) => {
    if(data.type == "generate-thumbnail"){
        void generateItemThumbnail({ item: data.item })
    }
})

export const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useMMKVBoolean("isLoggedIn", storage)
    const setDimensions = useStore(state => state.setDimensions)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [setupDone, setSetupDone] = useState(false)
    const [currentScreenName, setCurrentScreenName] = useState("MainScreen")
    const setCurrentRoutes = useStore(state => state.setCurrentRoutes)
    const toastBottomOffset = useStore(state => state.toastBottomOffset)
    const toastTopOffset = useStore(state => state.toastTopOffset)
    const uploadsCount = useStore(state => Object.keys(state.uploads).length)
    const downloadsCount = useStore(state => Object.keys(state.downloads).length)
    const setNetInfo = useStore(state => state.setNetInfo)
    const showNavigationAnimation = useStore(state => state.showNavigationAnimation)
    const [email, setEmail] = useMMKVString("email", storage)
    const [cameraUploadEnabled, setCameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + email, storage)
    const setBiometricAuthScreenState = useStore(state => state.setBiometricAuthScreenState)
    const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
    const setAppState = useStore(state => state.setAppState)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [nodeJSAlive, setNodeJSAlive] = useState(true)
    const setContentHeight = useStore(state => state.setContentHeight)

    useEffect(() => {
        SplashScreen.hide()
    }, [])

    const handleShare = useCallback(async (items) => {
        if(!items){
            return false
        }

        if(typeof items !== "undefined"){
            if(typeof items.data !== "undefined"){
                if(items.data !== null){
                    if(items.data.length > 0){
                        await new Promise((resolve) => {
                            const wait = setInterval(() => {
                                if(typeof navigationRef !== "undefined"){
                                    const navState = navigationRef.getState()

                                    if(typeof navState.routes !== "undefined"){
                                        if(navState.routes.filter(route => route.name == "SetupScreen" || route.name == "BiometricAuthScreen" || route.name == "LoginScreen").length == 0){
                                            if(storage.getBoolean("isLoggedIn")){
                                                clearInterval(wait)

                                                return resolve()
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
            requiresBatteryNotLow: true,
            stopOnTerminate: false,
            startOnBoot: true,
            enableHeadless: true
        }, (taskId) => {
            console.log("BG fetch running:", taskId)

            runCameraUpload({
                runOnce: true,
                maxQueue: 1,
                callback: () => {
                    BackgroundFetch.finish(taskId)
                }
            })
        }, (taskId) => {
            console.log("BG fetch timeout:", taskId)

            BackgroundFetch.finish(taskId)
        }).then((status) => {
            console.log("BG fetch init status:", status)
        }).catch((err) => {
            console.log("BG fetch init error:", err)
        })
    })

    const setAppearance = useCallback(() => {
        setTimeout(() => {
            if(Appearance.getColorScheme() == "dark"){
                setDarkMode(true)
                setStatusBarStyle(true)
            }
            else{
                setDarkMode(false)
                setStatusBarStyle(false)
            }
        }, 1000) // We use a timeout due to the RN appearance event listener firing both "dark" and "light" on app resume which causes the screen to flash for a second
    })

    useEffect(() => {
        if((uploadsCount + downloadsCount) > 0){
            startBackgroundTimer()
        }
        else{
            stopBackgroundTimer()
        }
    }, [uploadsCount, downloadsCount])

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

        global.nodeThread.pingPong(() => {
            setNodeJSAlive(false)
        })

        NetInfo.fetch().then((state) => {
            setNetInfo(state)
        }).catch((err) => {
            console.log(err)
        })

        const appStateListener = AppState.addEventListener("change", (nextAppState) => {
            setAppState(nextAppState)

            if(nextAppState == "background"){
                if(storage.getBoolean("cameraUploadEnabled:" + email)){
                    startBackgroundTimer()
                }

                if(Math.floor(+new Date()) > storage.getNumber("biometricPinAuthTimeout:" + email) && storage.getBoolean("biometricPinAuth:" + email)){
                    setBiometricAuthScreenState("auth")

                    storage.set("biometricPinAuthTimeout:" + email, (Math.floor(+new Date()) + 500000))
                    
                    navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
                }
            }
        })

        const netInfoListener = NetInfo.addEventListener((state) => {
            setNetInfo(state)
        })

        const dimensionsListener = Dimensions.addEventListener("change", ({ window, screen }) => {
            setDimensions({ window, screen })
        })

        const navigationRefListener = navigationRef.addListener("state", (event) => {
            if(typeof event.data !== "undefined"){
                if(typeof event.data.state !== "undefined"){
                    if(typeof event.data.state.routes !== "undefined"){
                        console.log("Current Screen:", event.data.state.routes[event.data.state.routes.length - 1].name, event.data.state.routes[event.data.state.routes.length - 1].params)

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

                if(storage.getBoolean("biometricPinAuth:" + email)){
                    setBiometricAuthScreenState("auth")

                    storage.set("biometricPinAuthTimeout:" + email, (Math.floor(+new Date()) + 500000))
                    
                    navigationRef.current.dispatch(StackActions.push("BiometricAuthScreen"))
                }
                else{
                    navigationRef.current.dispatch(CommonActions.reset({
                        index: 0,
                        routes: [
                            {
                                name: "MainScreen",
                                params: {
                                    parent: "recents"
                                }
                            }
                        ]
                    }))
                }
            }).catch((err) => {
                console.log(err)
    
                setSetupDone(false)
            })
        }

        try{
            storage.set("cameraUploadRunning", false) // Reset on app launch
        }
        catch(e){
            console.log(e)
        }

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
                    <SafeAreaProvider>
                        <SafeAreaView style={{
                            backgroundColor: darkMode ? "black" : "white",
                            paddingTop: Platform.OS == "android" ? 15 : 15,
                            height: "100%",
                            width: "100%"
                        }}>
                            <View style={{
                                width: "100%",
                                height: "100%"
                            }} onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
                                {
                                    nodeJSAlive ? (
                                        <>
                                            <Stack.Navigator initialRouteName={isLoggedIn ? (setupDone ? "MainScreen" : "SetupScreen") : "LoginScreen"} ini>
                                            <Stack.Screen name="SetupScreen" component={SetupScreen} options={{
                                                title: "SetupScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="LoginScreen" options={{
                                                title: "LoginScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}>{(props) => <LoginScreen {...props} setSetupDone={setSetupDone} />}</Stack.Screen>
                                            <Stack.Screen name="RegisterScreen" component={RegisterScreen} options={{
                                                title: "RegisterScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{
                                                title: "ForgotPasswordScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="ResendConfirmationScreen" component={ResendConfirmationScreen} options={{
                                                title: "ResendConfirmationScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="MainScreen" initialParams={{ parent: "recents" }} component={MainScreen} options={{
                                                title: "MainScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{
                                                title: "SettingsScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="TransfersScreen" component={TransfersScreen} options={{
                                                title: "TransfersScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="CameraUploadScreen" component={CameraUploadScreen} options={{
                                                title: "CameraUploadScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="BiometricAuthScreen" component={BiometricAuthScreen} options={{
                                                title: "BiometricAuthScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none",
                                                gestureEnabled: false
                                            }}></Stack.Screen>
                                            <Stack.Screen name="LanguageScreen" component={LanguageScreen} options={{
                                                title: "LanguageScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="SettingsAdvancedScreen" component={SettingsAdvancedScreen} options={{
                                                title: "SettingsAdvancedScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="SettingsAccountScreen" component={SettingsAccountScreen} options={{
                                                title: "SettingsAccountScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="EventsScreen" component={EventsScreen} options={{
                                                title: "EventsScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="EventsInfoScreen" component={EventsInfoScreen} options={{
                                                title: "EventsInfoScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="GDPRScreen" component={GDPRScreen} options={{
                                                title: "GDPRScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="InviteScreen" component={InviteScreen} options={{
                                                title: "InviteScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="TwoFactorScreen" component={TwoFactorScreen} options={{
                                                title: "TwoFactorScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="ChangeEmailPasswordScreen" component={ChangeEmailPasswordScreen} options={{
                                                title: "ChangeEmailPasswordScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
                                            }}></Stack.Screen>
                                            <Stack.Screen name="TextEditorScreen" component={TextEditorScreen} options={{
                                                title: "TextEditorScreen",
                                                headerShown: false,
                                                animation: showNavigationAnimation ? "default" : "none"
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
                                <FullscreenLoadingModal navigation={navigationRef} />
                                <CreateTextFileDialog navigation={navigationRef} />
                            </>
                        )
                    }
                </Fragment>
            </NavigationContainer>
            <Toast ref={(ref) => global.toast = ref} offsetBottom={toastBottomOffset} offsetTop={toastTopOffset} pointerEvents="box-none" style={{
                zIndex: 99999
            }} />
        </>
    )
}