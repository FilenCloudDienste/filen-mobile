import { apiRequest } from "../api"
import { storage } from "../storage"
import { setup } from "../setup"
import { logout } from "./logout"
import { i18n } from "../../i18n/i18n"
import { showToast } from "../../components/Toasts"
import { useStore } from "../state"
import { navigationAnimation } from "../state"
import { Keyboard } from "react-native"

const CryptoJS = require("crypto-js")

export const login = async ({ email, password, twoFactorKey, setEmail, setPassword, setTwoFactorKey, setShowTwoFactorField, navigation, setSetupDone }) => {
    useStore.setState({ fullscreenLoadingModalVisible: true })

    Keyboard.dismiss()

    setTwoFactorKey("")
    setShowTwoFactorField(false)

    email = email.trim()
    password = password.trim()
    twoFactorKey = twoFactorKey.trim()

    if(!email || !password){
        setEmail("")
        setPassword("")
        setTwoFactorKey("")

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
    }

    if(twoFactorKey.length == 0){
        twoFactorKey = "XXXXXX"
    }

    try{
        var authInfo = await apiRequest({
            method: "POST",
            endpoint: "/v1/auth/info",
            data: {
                email
            }
        })
    }
    catch(e){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    if(!authInfo.status){
        useStore.setState({ fullscreenLoadingModalVisible: false })

        if(authInfo.message == "Invalid email."){
            setEmail("")
            setPassword("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
        }
        else if(authInfo.message == "Invalid password."){
            setPassword("")
            setEmail("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
        }

        return showToast({ message: authInfo.message })
    }

    let passwordToSend = ""
    let masterKey = ""
    let salt = authInfo.data.salt
    let authVersion = authInfo.data.authVersion

    if(authVersion == 1){
        try{
            passwordToSend = await global.nodeThread.hashPassword({ password })
            masterKey = await global.nodeThread.hashFn({ string: password })
        }
        catch(e){
            console.log(e)

            useStore.setState({ fullscreenLoadingModalVisible: false })

            return showToast({ message: e.toString() })
        }
    }
    else if(authVersion == 2){
        try{
            let derivedKey = await global.nodeThread.deriveKeyFromPassword({
                password,
                salt,
                iterations: 200000,
                hash: "SHA-512",
                bitLength: 512,
                returnHex: true
            })

            masterKey = derivedKey.substring(0, (derivedKey.length / 2))
            passwordToSend = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
            passwordToSend = CryptoJS.SHA512(passwordToSend).toString()
        }
        catch(e){
            console.log(e)

            useStore.setState({ fullscreenLoadingModalVisible: false })

            return showToast({ message: e.toString() })
        }
    }
    else{
        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: "Invalid auth version" })
    }

    try{
        var res = await apiRequest({
            method: "POST",
            endpoint: "/v1/login",
            data: {
                email,
                password: passwordToSend,
                twoFactorKey,
                authInfo
            }
        })
    }
    catch(e){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    if(!res.status){
        useStore.setState({ fullscreenLoadingModalVisible: false })

        if(res.message == "Please enter your Two Factor Authentication code."){
            setTwoFactorKey("")
            setShowTwoFactorField(true)

            return showToast({ message: i18n(storage.getString("lang"), "loginEnter2FA") })
        }
        else if(res.message == "Invalid email."){
            setEmail("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
        }
        else if(res.message == "Invalid password."){
            setPassword("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
        }
        else if(res.message == "Account not yet activated."){
            setPassword("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginAccountNotYetActivated") })
        }
        else if(res.message == "Account not found."){
            setPassword("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginWrongEmailOrPassword") })
        }
        else if(res.message == "Email address or password wrong."){
            setPassword("")
            setTwoFactorKey("")

            return showToast({ message: i18n(storage.getString("lang"), "loginWrongEmailOrPassword") })
        }
        else{
            return showToast({ message: res.message })
        }
    }

    try{
        storage.set("apiKey", res.data.apiKey)
        storage.set("email", email),
        storage.set("masterKeys", JSON.stringify([masterKey]))
        storage.set("authVersion", authVersion)
        storage.set("isLoggedIn", true)
    }
    catch(e){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    useStore.setState({ fullscreenLoadingModalVisible: false })

    navigationAnimation({ enable: true }).then(() => {
        navigation.replace("SetupScreen")

        setTimeout(() => {
            setup({ navigation }).then(() => {
                setSetupDone(true)
                
                navigation.replace("MainScreen")
            }).catch((err) => {
                console.log(err)

                setSetupDone(false)

                logout({ navigation })
            })
        }, 1000)
    })
}