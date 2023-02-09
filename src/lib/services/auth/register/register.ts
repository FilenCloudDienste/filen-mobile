import { apiRequest } from "../../../api"
import storage from "../../../storage"
import { i18n } from "../../../../i18n/i18n"
import { showToast } from "../../../../components/Toasts"
import { useStore } from "../../../state"
import { Keyboard } from "react-native"

const CryptoJS = require("crypto-js")

export interface Register {
    email: string,
    password: string,
    confirmPassword: string,
    setEmail: React.Dispatch<React.SetStateAction<string>>,
    setPassword: React.Dispatch<React.SetStateAction<string>>,
    setConfirmPassword: React.Dispatch<React.SetStateAction<string>>,
    navigation: any
}

export const register = async ({ email, password, confirmPassword, setEmail, setPassword, setConfirmPassword, navigation }: Register) => {
    const lang = storage.getString("lang")

    useStore.setState({ fullscreenLoadingModalVisible: true })

    Keyboard.dismiss()

    email = email.trim()
    password = password.trim()
    confirmPassword = confirmPassword.trim()

    if(!email || !password || !confirmPassword){
        setEmail("")
        setPassword("")
        setConfirmPassword("")

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: i18n(storage.getString("lang"), "loginInvalidEmailOrPassword") })
    }

    if(password.length < 10){
        setPassword("")
        setConfirmPassword("")

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: i18n(storage.getString("lang"), "registerWeakPassword", true, ["__MIN__"], [10]) })
    }

    if(password !== confirmPassword){
        setPassword("")
        setConfirmPassword("")

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: i18n(storage.getString("lang"), "registerPasswordsNotMatching") })
    }

    try{
        var salt = await global.nodeThread.generateRandomString({ charLength: 256 })
        var derivedKey = await global.nodeThread.deriveKeyFromPassword({
            password,
            salt,
            iterations: 200000,
            hash: "SHA-512",
            bitLength: 512,
            returnHex: true
        })

        password = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
        password = CryptoJS.SHA512(password).toString()
        confirmPassword = password
    }
    catch(e: any){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    try{
        var res = await apiRequest({
            method: "POST",
            endpoint: "/v1/register",
            data: {
                email,
                password,
                passwordRepeat: confirmPassword,
                salt,
                authVersion: 2
            }
        })
    }
    catch(e: any){
        console.log(e)

        useStore.setState({ fullscreenLoadingModalVisible: false })

        return showToast({ message: e.toString() })
    }

    if(!res.status){
        useStore.setState({ fullscreenLoadingModalVisible: false })

        if(res.message.toLowerCase().indexOf("invalid email") !== -1 || res.message.toLowerCase().indexOf("invalid password") !== -1 || res.message.toLowerCase().indexOf("invalid email") !== -1){
            setEmail("")
            setPassword("")
            setConfirmPassword("")
            
            return showToast({ message: i18n(lang, "loginInvalidEmailOrPassword") })
        }
        else if(res.message.toLowerCase().indexOf("your password needs to be at least 10 characters long") !== -1){
            setPassword("")
            setConfirmPassword("")

            return showToast({ message: i18n(lang, "registerWeakPassword") })
        }
        else if(res.message.toLowerCase().indexOf("passwords do not match") !== -1){
            setPassword("")
            setConfirmPassword("")

            return showToast({ message: i18n(lang, "registerPasswordsNotMatching") })
        }
        else if(res.message.toLowerCase().indexOf("invalid email") !== -1){
            setEmail("")
            setPassword("")
            setConfirmPassword("")

            return showToast({ message: i18n(lang, "loginInvalidEmailOrPassword") })
        }
        else if(res.message.toLowerCase().indexOf("database error") !== -1){
            return showToast({ message: i18n(lang, "apiError") })
        }
        else if(res.message.toLowerCase().indexOf("self email is already registered") !== -1){
            setEmail("")
            setPassword("")
            setConfirmPassword("")

            return showToast({ message: i18n(lang, "registerEmailAlreadyRegistered") })
        }
        else if(res.message.toLowerCase().indexOf("we could not send an email at self time, please try again later") !== -1){
            setEmail("")
            setPassword("")
            setConfirmPassword("")

            return showToast({ message: i18n(lang, "registerCouldNotSendEmail") })
        }

        return showToast({ message: res.message })
    }

    useStore.setState({ fullscreenLoadingModalVisible: false })

    showToast({ message: i18n(lang, "registerSuccess") })

    Keyboard.dismiss()

    navigation.goBack()
}