import { Plugins, StatusBarStyle, Capacitor } from "@capacitor/core"
import { modalController, popoverController, actionSheetController, loadingController } from "@ionic/core"
import * as language from "../utils/language"

export function setupListeners(){
    if(Capacitor.isNative){
        Plugins.App.addListener("backButton", async (e) => {
            let goBackHistory = true

            if(this.state.searchbarOpen){
                this.hideMainSearchbar(false)

                goBackHistory = false
            }

            let isModalActive = await modalController.getTop()

            if(isModalActive && this.state.isLoggedIn){
                window.customFunctions.dismissModal()

                goBackHistory = false
            }

            let isPopoverActive = await popoverController.getTop()

            if(isPopoverActive && this.state.isLoggedIn){
                window.customFunctions.dismissPopover()

                goBackHistory = false
            }

            let isActionSheetActive = await actionSheetController.getTop()

            if(isActionSheetActive && this.state.isLoggedIn){
                window.customFunctions.dismissActionSheet()

                goBackHistory = false
            }

            let isLoadingActive = await loadingController.getTop()

            if(isLoadingActive){
                goBackHistory = false
            }

            if(goBackHistory){
                window.history.back()
            }
        })
    }
}

export async function setupStatusbar(){
    if(Capacitor.isNative){
        if(this.state.darkMode){
            Plugins.StatusBar.setBackgroundColor({
                color: "#1F1F1F"
            })
            
            Plugins.StatusBar.setStyle({
                style: StatusBarStyle.Dark
            })
        }
        else{
            Plugins.StatusBar.setBackgroundColor({
                color: "#ffffff"
            })
            
            Plugins.StatusBar.setStyle({
                style: StatusBarStyle.Light
            })
        }
        
        Plugins.StatusBar.setOverlaysWebView({
            overlay: false
        })
    }
}

export async function doSetup(){
    let getLang = await Plugins.Storage.get({ key: "lang" })
    let getDarkMode = await Plugins.Storage.get({ key: "darkMode" })
    let getIsLoggedIn = await Plugins.Storage.get({ key: "isLoggedIn" })
    let getUserAPIKey = await Plugins.Storage.get({ key: "userAPIKey" })
    let getUserEmail = await Plugins.Storage.get({ key: "userEmail" })
    let getUserMasterKeys = await Plugins.Storage.get({ key: "userMasterKeys" })
    let getUserPublicKey = await Plugins.Storage.get({ key: "userPublicKey" })
    let getUserPrivateKey = await Plugins.Storage.get({ key: "userPrivateKey" })
    let getOfflineSavedFiles = await Plugins.Storage.get({ key: "offlineSavedFiles" })
    let getAPICache = await Plugins.Storage.get({ key: "apiCache" })

    if(getLang.value){
        this.setState({
            lang: getLang.value,
            mainToolbarTitle: language.get(getLang.value, "myCloud")
        })

        window.customVariables.lang = getLang.value
    }
    else{
        //window.Capacitor.Plugins.Device.getLanguageCode() instead of "en"

        this.setState({
            lang: "en",
            mainToolbarTitle: language.get("en", "myCloud")
        })

        window.customVariables.lang = "en"
    }

    if(getDarkMode.value == null){
        document.body.classList.toggle("dark", true)

        this.setState({
            darkMode: true
        })
    }
    else{
        if(getDarkMode.value == "true"){
            document.body.classList.toggle("dark", true)

            this.setState({
                darkMode: true
            })
        }
        else{
            document.body.classList.toggle("dark", false)

            this.setState({
                darkMode: false
            })
        }
    }

    this.setupStatusbar()

    if(getIsLoggedIn.value == null){
        return this.showLogin()
    }
    else{
        if(getIsLoggedIn.value == "true"){
            this.setState({
                userAPIKey: getUserAPIKey.value,
                userEmail: getUserEmail.value,
                userMasterKeys: JSON.parse(getUserMasterKeys.value),
                userPublicKey: getUserPublicKey.value,
                userPrivateKey: getUserPrivateKey.value,
                isLoggedIn: true
            })

            if(getOfflineSavedFiles.value == null){
                window.customVariables.offlineSavedFiles = {}
            }
            else{
                window.customVariables.offlineSavedFiles = JSON.parse(getOfflineSavedFiles.value)
            }

            if(getAPICache.value == null){
                window.customVariables.apiCache = {}
            }
            else{
                window.customVariables.apiCache = JSON.parse(getAPICache.value)
            }
        }
        else{
            return this.showLogin()
        }
    }

    if(Capacitor.isNative){
        setTimeout(() => {
            Plugins.SplashScreen.hide()
        }, 1000)
    }

    window.customVariables.apiKey = getUserAPIKey.value

    this.updateUserKeys()
    this.updateUserUsage()

    clearInterval(window.customVariables.keyUpdateInterval)

    window.customVariables.keyUpdateInterval = setInterval(() => {
        this.updateUserKeys()
    }, 60000)

    clearInterval(window.customVariables.usageUpdateInterval)

    window.customVariables.usageUpdateInterval = setInterval(() => {
        this.updateUserUsage()
    }, 60000)

    return this.routeTo("/base")
}