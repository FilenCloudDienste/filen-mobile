import { apiRequest } from "../api"
import storage from "../storage"
import { setup } from "../setup"
import { logout } from "./logout"
import { i18n } from "../../i18n/i18n"
import { showToast } from "../../components/Toasts"
import { useStore } from "../state"
import { navigationAnimation } from "../state"
import { Keyboard } from "react-native"

const CryptoJS = require("crypto-js")

export const generatePasswordAndMasterKeysBasedOnAuthVersion = ({ rawPassword, authVersion, salt }) => {
    return new Promise(async (resolve, reject) => {
        let derivedPassword = ""
        let derivedMasterKeys = undefined

        if(authVersion == 1){
            try{
                derivedPassword = await global.nodeThread.hashPassword({ password: rawPassword })
                derivedMasterKeys = await global.nodeThread.hashFn({ string: rawPassword })
            }
            catch(e){
                return reject(e.toString())
            }
        }
        else if(authVersion == 2){
            try{
                const derivedKey = await global.nodeThread.deriveKeyFromPassword({
                    password: rawPassword,
                    salt,
                    iterations: 200000,
                    hash: "SHA-512",
                    bitLength: 512,
                    returnHex: true
                })
    
                derivedMasterKeys = derivedKey.substring(0, (derivedKey.length / 2))
                derivedPassword = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
                derivedPassword = CryptoJS.SHA512(derivedPassword).toString()
            }
            catch(e){
                console.log(e)
    
                useStore.setState({ fullscreenLoadingModalVisible: false })
    
                return reject(e.toString())
            }
        }
        else{
            return reject("Invalid auth version")
        }

        return resolve({
            derivedMasterKeys,
            derivedPassword
        })
    })
}

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

    try{
        const { derivedPassword, derivedMasterKeys } = await generatePasswordAndMasterKeysBasedOnAuthVersion({ rawPassword: password, authVersion, salt })

        masterKey = derivedMasterKeys
        passwordToSend = derivedPassword
    }
    catch(e){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    try{
        var res = await apiRequest({
            method: "POST",
            endpoint: "/v1/login",
            data: {
                email,
                password: passwordToSend,
                twoFactorKey,
                authVersion
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
        else if(res.message == "Invalid Two Factor Authentication code." || res.message == "Invalid 2fa key"){
            setTwoFactorKey("")
            setShowTwoFactorField(true)

            return showToast({ message: i18n(storage.getString("lang"), "invalidTwoFactorKey") })
        }
        else{
            return showToast({ message: res.message })
        }
    }

    try{
        var userInfo = await new Promise((resolve, reject) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/info",
                data: {
                    apiKey: res.data.apiKey
                }
            }).then((response) => {
                if(!response.status){
                    return reject(response.message)
                }
    
                return resolve(response.data)
            }).catch((err) => {
                return reject(err)
            })
        })
    }
    catch(e){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    try{
        storage.set("apiKey", res.data.apiKey)
        storage.set("email", email)
        storage.set("userId", userInfo.id)
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

    Keyboard.dismiss()

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