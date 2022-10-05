import React, { useEffect, useState, useRef, memo } from "react"
import { View, Text, TouchableOpacity, Dimensions, Animated, AppState, ScaledSize } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { useStore } from "../../lib/state"
import { navigationAnimation } from "../../lib/state"
import { CommonActions } from "@react-navigation/native"
import { SheetManager } from "react-native-actions-sheet"
import * as LocalAuthentication from "expo-local-authentication"

const window: ScaledSize = Dimensions.get("window")
let canGoBack: boolean = false

export interface PINCodeRowProps {
    numbers?: number[],
    updatePinCode: (number: number) => void,
    promptBiometrics: () => void
}

export const PINCodeRow = memo(({ numbers, updatePinCode, promptBiometrics }: PINCodeRowProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    const buttonWidthHeight: number = 70
    const buttonFontSize: number = 22
    const buttonColor: string = darkMode ? "#333333" : "lightgray"
    const buttonFontColor: string = darkMode ? "white" : "black"

    return (
        <View
            style={{
                width: 270,
                height: "auto",
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 15
            }}
        >
            {
                typeof numbers !== "undefined" ? numbers.map((num) => {
                    return (
                        <TouchableOpacity
                            key={num}
                            style={{
                                height: buttonWidthHeight,
                                width: buttonWidthHeight,
                                borderRadius: buttonWidthHeight,
                                backgroundColor: buttonColor,
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                            onPress={() => updatePinCode(num)}
                        >
                            <Text
                                style={{
                                    fontSize: buttonFontSize,
                                    color: buttonFontColor
                                }}
                            >
                                {num}
                            </Text>
                        </TouchableOpacity>
                    )
                }) : (
                    <>
                        <TouchableOpacity
                            style={{
                                height: buttonWidthHeight,
                                width: buttonWidthHeight,
                                borderRadius: buttonWidthHeight,
                                backgroundColor: buttonColor,
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                            onPress={() => promptBiometrics()}
                        >
                            <Text
                                style={{
                                    fontSize: buttonFontSize
                                }}
                            >
                                <Ionicon
                                    name="finger-print-outline"
                                    size={buttonFontSize}
                                    color={buttonFontColor}
                                />
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                height: buttonWidthHeight,
                                width: buttonWidthHeight,
                                borderRadius: buttonWidthHeight,
                                backgroundColor: buttonColor,
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                            onPress={() => updatePinCode(0)}
                        >
                            <Text
                                style={{
                                    fontSize: buttonFontSize,
                                    color: buttonFontColor
                                }}
                            >
                                0
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                height: buttonWidthHeight,
                                width: buttonWidthHeight,
                                borderRadius: buttonWidthHeight,
                                backgroundColor: buttonColor,
                                justifyContent: "center",
                                alignItems: "center"
                            }}
                            onPress={() => updatePinCode(-1)}
                        >
                            <Text
                                style={{
                                    fontSize: buttonFontSize
                                }}
                            >
                                <Ionicon
                                    name="backspace-outline"
                                    size={buttonFontSize}
                                    color={buttonFontColor} 
                                />
                            </Text>
                        </TouchableOpacity>
                    </>
                )
            }
        </View>
    )
})

export interface BiometricAuthScreenProps {
    navigation: any
}

export const BiometricAuthScreen = memo(({ navigation }: BiometricAuthScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const biometricAuthScreenState = useStore(state => state.biometricAuthScreenState)
    const [pinCode, setPinCode] = useState<string>("")
    const [confirmPinCode, setConfirmPinCode] = useState<string>("")
    const [confirmPinCodeVisible, setConfirmPinCodeVisible] = useState<boolean>(false)
    const headerTextColor: string = darkMode ? "white" : "gray"
    const [dotColor, setDotColor] = useState<string>(headerTextColor)
    const [showingBiometrics, setShowingBiometrics] = useState<boolean>(false)
    const [shakeAnimation, setShakeAnimation] = useState<Animated.Value>(new Animated.Value(0))
    const setIsAuthing = useStore(state => state.setIsAuthing)
    const appState = useRef(AppState.currentState)
    const setBiometricAuthScreenVisible = useStore(state => state.setBiometricAuthScreenVisible)
    const [startOnCloudScreen, setStartOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)

    const startShake = (): void => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
        ]).start()

        setTimeout(() => {
            setDotColor(headerTextColor)
        }, 700)
    }

    const authed = (): void => {
        setConfirmPinCode("")
        setPinCode("")
        setConfirmPinCodeVisible(false)
        setShowingBiometrics(false)

        canGoBack = true

        navigationAnimation({ enable: false }).then(() => {
            let wasSetupScreen = false

            const routes = navigation.getState().routes

            for(let i = 0; i < routes.length; i++){
                if(routes[i].name == "SetupScreen"){
                    wasSetupScreen = true
                }
            }

            setIsAuthing(false)

            let lockAppAfter: number = storage.getNumber("lockAppAfter:" + userId)

            if(lockAppAfter == 0){
                lockAppAfter = 300
            }

            storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (lockAppAfter * 1000)))

            if(wasSetupScreen){
                navigationAnimation({ enable: true }).then(() => {
                    navigation.dispatch(CommonActions.reset({
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
                })
            }
            else{
                navigation.goBack()
            }
        })
    }

    const updatePinCode = (num: number): void => {
        setDotColor(headerTextColor)

        if(num == -1){
            if(pinCode.length > 0){
                setPinCode(code => code.substring(0, (code.length - 1)))
            }
            
            return
        }

        const newCode = pinCode + "" + num.toString()

        if(newCode.length <= 4){
            setPinCode(newCode)
        }

        if(newCode.length >= 4){
            if(confirmPinCodeVisible){
                if(newCode == confirmPinCode){
                    storage.set("pinCode:" + userId, confirmPinCode)
                    storage.set("biometricPinAuth:" + userId, true)

                    authed()
                }
                else{
                    startShake()
                    setDotColor("red")
                    setConfirmPinCode("")
                    setPinCode("")
                    setConfirmPinCodeVisible(false)
                }
            }
            else{
                if(biometricAuthScreenState == "setup"){
                    setConfirmPinCode(newCode)
                    setPinCode("")
                    setConfirmPinCodeVisible(true)
                }
                else{
                    const storedPinCode = storage.getString("pinCode:" + userId) || "1234567890"

                    if(newCode == storedPinCode){
                        authed()
                    }
                    else{
                        setPinCode("")
                        setDotColor("red")
                        startShake()
                    }
                }
            }
        }
    }

    const promptBiometrics = async (): Promise<void> => {
        if(biometricAuthScreenState == "setup"){
            return
        }

        if(showingBiometrics){
            return
        }

        if(storage.getBoolean("onlyUsePINCode:" + storage.getNumber("userId"))){
            return
        }

        await new Promise((resolve) => {
            const wait = setInterval(() => {
                if(appState.current == "active"){
                    clearInterval(wait)

                    return resolve(true)
                }
            }, 100)
        })

        LocalAuthentication.hasHardwareAsync().then((available) => {
            if(!available){
                console.log("Biometrics not available")

                return
            }

            LocalAuthentication.authenticateAsync({
                cancelLabel: i18n(lang, "cancel"),
                promptMessage: i18n(lang, "biometricAuthPrompt")
            }).then((res) => {
                setShowingBiometrics(false)
                    
                if(!res.success){
                    console.log("User canceled auth prompt")

                    return
                }

                authed()
            }).catch(console.log)
        }).catch(console.log)
    }

    useEffect(() => {
        setIsAuthing(true)
        setBiometricAuthScreenVisible(true)

        canGoBack = false

        SheetManager.hideAll()

        useStore.setState({
            renameDialogVisible: false,
            createFolderDialogVisible: false,
            confirmPermanentDeleteDialogVisible: false,
            removeFromSharedInDialogVisible: false,
            stopSharingDialogVisible: false,
            createTextFileDialogVisible: false,
            redeemCodeDialogVisible: false,
            deleteAccountTwoFactorDialogVisible: false,
            disable2FATwoFactorDialogVisible: false,
            bulkShareDialogVisible: false
        })

        const removeListener = (e: any): void => {
            if(!canGoBack){
                e.preventDefault()
            }
        }

        navigation.addListener("beforeRemove", removeListener)

        const appStateListener = AppState.addEventListener("change", (nextAppState) => {
            appState.current = nextAppState
        })

        setTimeout(promptBiometrics, 250)

        return () => {
            navigation.removeListener("beforeRemove", removeListener)

            appStateListener.remove()

            setBiometricAuthScreenVisible(false)
        }
    }, [])

    return (
        <View
            style={{
                height: window.height,
                width: "100%",
                backgroundColor: darkMode ? "black" : "white",
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            <View
                style={{
                    marginBottom: 100
                }}
            >
                {
                    biometricAuthScreenState == "setup" ? (
                        <Text
                            style={{
                                color: headerTextColor,
                                fontSize: 19
                            }}
                        >
                            {confirmPinCodeVisible ? i18n(lang, "confirmPinCode") : i18n(lang, "setupPinCode")}
                        </Text>
                    ) : (
                        <Text
                            style={{
                                color: headerTextColor,
                                fontSize: 19
                            }}
                        >
                            {i18n(lang, "enterPinCode")}
                        </Text>
                    )
                }
                <Animated.View
                    style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        marginTop: 35,
                        transform: [
                            {
                                translateX: shakeAnimation
                            }
                        ]
                    }}
                >
                    {
                        Array.from(Array(4).keys()).map((key) => {
                            return (
                                <Ionicon
                                    key={key}
                                    name={pinCode.charAt(key).length > 0 ? "radio-button-on-outline" : "radio-button-off-outline"}
                                    size={22}
                                    color={dotColor}
                                    style={{
                                        marginLeft: 5
                                    }}
                                />
                            )
                        })
                    }
                </Animated.View>
            </View>
            <PINCodeRow
                numbers={[1, 2, 3]}
                updatePinCode={updatePinCode}
                promptBiometrics={promptBiometrics}
            />
            <PINCodeRow
                numbers={[4, 5, 6]}
                updatePinCode={updatePinCode}
                promptBiometrics={promptBiometrics} 
            />
            <PINCodeRow 
                numbers={[7, 8, 9]} 
                updatePinCode={updatePinCode} 
                promptBiometrics={promptBiometrics} 
            />
            <PINCodeRow 
                updatePinCode={updatePinCode} 
                promptBiometrics={promptBiometrics} 
            />
        </View>
    )
})