import React, { useEffect, useCallback, useState, useRef, memo } from "react"
import { View, Text, TouchableOpacity, Dimensions, Animated, AppState } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { useStore } from "../lib/state"
import { navigationAnimation } from "../lib/state"
import ReactNativeBiometrics from "react-native-biometrics"
import { CommonActions } from "@react-navigation/native"

const window = Dimensions.get("window")
let canGoBack = false

export const PINCodeRow = memo(({ numbers, updatePinCode, promptBiometrics }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const biometricAuthScreenState = useStore(state => state.biometricAuthScreenState)

    const buttonWidthHeight = 70
    const buttonFontSize = 22
    const buttonColor = darkMode ? "#333333" : "lightgray"
    const buttonFontColor = darkMode ? "white" : "black"

    return (
        <View style={{
            width: 270,
            height: "auto",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 15
        }}>
            {
                typeof numbers !== "undefined" ? numbers.map((num) => {
                    return (
                        <TouchableOpacity key={num} style={{
                            height: buttonWidthHeight,
                            width: buttonWidthHeight,
                            borderRadius: buttonWidthHeight,
                            backgroundColor: buttonColor,
                            justifyContent: "center",
                            alignItems: "center"
                        }} onPress={() => {
                            updatePinCode(num)
                        }}>
                            <Text style={{
                                fontSize: buttonFontSize,
                                color: buttonFontColor
                            }}>
                                {num}
                            </Text>
                        </TouchableOpacity>
                    )
                }) : (
                    <>
                        <TouchableOpacity style={{
                            height: buttonWidthHeight,
                            width: buttonWidthHeight,
                            borderRadius: buttonWidthHeight,
                            backgroundColor: buttonColor,
                            justifyContent: "center",
                            alignItems: "center"
                        }} onPress={() => promptBiometrics()}>
                            <Text style={{
                                fontSize: buttonFontSize
                            }}>
                                <Ionicon name="finger-print-outline" size={buttonFontSize} color={buttonFontColor} />
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            height: buttonWidthHeight,
                            width: buttonWidthHeight,
                            borderRadius: buttonWidthHeight,
                            backgroundColor: buttonColor,
                            justifyContent: "center",
                            alignItems: "center"
                        }} onPress={() => {
                            updatePinCode(0)
                        }}>
                            <Text style={{
                                fontSize: buttonFontSize,
                                color: buttonFontColor
                            }}>
                                0
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            height: buttonWidthHeight,
                            width: buttonWidthHeight,
                            borderRadius: buttonWidthHeight,
                            backgroundColor: buttonColor,
                            justifyContent: "center",
                            alignItems: "center"
                        }} onPress={() => {
                            updatePinCode(-1)
                        }}>
                            <Text style={{
                                fontSize: buttonFontSize
                            }}>
                                <Ionicon name="backspace-outline" size={buttonFontSize} color={buttonFontColor} />
                            </Text>
                        </TouchableOpacity>
                    </>
                )
            }
        </View>
    )
})

export const BiometricAuthScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [userId, setUserId] = useMMKVNumber("userId", storage)
    const biometricAuthScreenState = useStore(state => state.biometricAuthScreenState)
    const [pinCode, setPinCode] = useState("")
    const [confirmPinCode, setConfirmPinCode] = useState("")
    const [confirmPinCodeVisible, setConfirmPinCodeVisible] = useState(false)
    const headerTextColor = darkMode ? "white" : "gray"
    const [dotColor, setDotColor] = useState(headerTextColor)
    const [showingBiometrics, setShowingBiometrics] = useState(false)
    const [shakeAnimation, setShakeAnimation] = useState(new Animated.Value(0))
    const setIsAuthing = useStore(state => state.setIsAuthing)
    const appState = useRef(AppState.currentState)

    const startShake = useCallback(() => {
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
    })

    const authed = useCallback(() => {
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

            if(wasSetupScreen){
                navigationAnimation({ enable: true }).then(() => {
                    navigation.dispatch(CommonActions.reset({
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
                })
            }
            else{
                navigation.goBack()
            }
        })
    })

    const updatePinCode = useCallback((num) => {
        setDotColor(headerTextColor)

        if(num == -1){
            if(pinCode.length > 0){
                return setPinCode(code => code.substring(0, (code.length - 1)))
            }
            else{
                return false
            }
        }

        const newCode = pinCode + "" + num.toString()

        if(newCode.length <= 4){
            setPinCode(newCode)
        }

        if(newCode.length >= 4){
            if(confirmPinCodeVisible){
                if(newCode == confirmPinCode){
                    try{
                        storage.set("pinCode:" + userId, confirmPinCode)
                        storage.set("biometricPinAuth:" + userId, true)
                    }
                    catch(e){
                        console.log(e)
                    }

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
                    try{
                        var storedPinCode = storage.getString("pinCode:" + userId) || "1234567890"
                    }
                    catch(e){
                        console.log(e)
                    }

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
    })

    const promptBiometrics = useCallback(async () => {
        if(biometricAuthScreenState == "setup"){
            return false
        }

        if(showingBiometrics){
            return false
        }

        await new Promise((resolve) => {
            const wait = setInterval(() => {
                if(appState.current == "active"){
                    clearInterval(wait)

                    return resolve()
                }
            }, 100)
        })

        ReactNativeBiometrics.isSensorAvailable().then((result) => {
            const { available } = result

            if(available){
                setShowingBiometrics(true)

                ReactNativeBiometrics.simplePrompt({
                    promptMessage: i18n(lang, "biometricAuthPrompt"),
                    cancelButtonText: i18n(lang, "cancel")
                }).then((res) => {
                    const { success } = res

                    setShowingBiometrics(false)
                
                    if(success){
                        authed()
                    }
                    else{
                        console.log('user cancelled biometric prompt')
                    }
                }).catch((err) => {
                    setShowingBiometrics(false)

                    console.log(err)
                })
            }
            else{
                console.log("Biometrics not available")
            }
        }).catch((err) => {
            console.log(err)
        })
    })

    useEffect(() => {
        setIsAuthing(true)

        canGoBack = false

        const removeListener = navigation.addListener("beforeRemove", (e) => {
            if(!canGoBack){
                e.preventDefault()
            }

            return false
        })

        const appStateListener = AppState.addEventListener("change", (nextAppState) => {
            appState.current = nextAppState
        })

        setTimeout(promptBiometrics, 100)

        return () => {
            removeListener()
            appStateListener.remove()
        }
    }, [])

    return (
        <View style={{
            height: window.height,
            width: "100%",
            backgroundColor: darkMode ? "black" : "white",
            justifyContent: "center",
            alignItems: "center"
        }}>
            <View style={{
                marginBottom: 100
            }}>
                {
                    biometricAuthScreenState == "setup" ? (
                        <Text style={{
                            color: headerTextColor,
                            fontSize: 19
                        }}>
                            {confirmPinCodeVisible ? i18n(lang, "confirmPinCode") : i18n(lang, "setupPinCode")}
                        </Text>
                    ) : (
                        <Text style={{
                            color: headerTextColor,
                            fontSize: 19
                        }}>
                            {i18n(lang, "enterPinCode")}
                        </Text>
                    )
                }
                <Animated.View style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    marginTop: 35,
                    transform: [
                        {
                            translateX: shakeAnimation
                        }
                    ]
                }}>
                    {
                        Array.from(Array(4).keys()).map((key) => {
                            return (
                                <Ionicon key={key} name={pinCode.charAt(key).length > 0 ? "radio-button-on-outline" : "radio-button-off-outline"} size={22} color={dotColor} style={{
                                    marginLeft: 5
                                }} />
                            )
                        })
                    }
                </Animated.View>
            </View>
            <PINCodeRow numbers={[1, 2, 3]} updatePinCode={updatePinCode} promptBiometrics={promptBiometrics} />
            <PINCodeRow numbers={[4, 5, 6]} updatePinCode={updatePinCode} promptBiometrics={promptBiometrics} />
            <PINCodeRow numbers={[7, 8, 9]} updatePinCode={updatePinCode} promptBiometrics={promptBiometrics} />
            <PINCodeRow updatePinCode={updatePinCode} promptBiometrics={promptBiometrics} />
        </View>
    )
})