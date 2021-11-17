import { Plugins, StatusBarStyle, Capacitor } from "@capacitor/core"
import { modalController, popoverController, actionSheetController, loadingController, alertController } from "@ionic/core"
import * as language from "../utils/language"
import BackgroundFetch from "cordova-plugin-background-fetch";

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

                if(window.customVariables.isGettingPreviewData){
                    window.customVariables.stopGettingPreviewData = true
                }
            }

            if(this.state.selectedItems > 0 && this.state.isLoggedIn){
                this.clearSelectedItems()

                goBackHistory = false
            }

            let isAlertActive = await alertController.getTop()

            if(isAlertActive && this.state.isLoggedIn){
                window.customFunctions.dismissAlert()

                goBackHistory = false
            }

            let origin = window.location.origin

            if(window.location.href == origin 
            || window.location.href == origin + "/" 
            || window.location.href == origin + "/#" 
            || window.location.href == origin + "/#!" 
            || window.location.href == origin + "/#/"
            || window.location.href == origin + "/index.html"
            || window.location.href == origin + "/index.html#!/"
            || window.location.href == origin + "/index.html#!"
            || window.location.href == origin + "/index.html#"
            || window.location.href == origin + "/#!/base" 
            || window.location.href == origin + "/index.html#!/base"
            || window.location.href == origin + "/#!/shared-in"
            || window.location.href == origin + "/index.html#!/shared-in"
            || window.location.href == origin + "/#!/shared-out"
            || window.location.href == origin + "/index.html#!/shared-out"
            || window.location.href == origin + "/#!/trash"
            || window.location.href == origin + "/index.html#!/trash"
            || window.location.href == origin + "/#!/favorites"
            || window.location.href == origin + "/index.html#!/favorites"
            || window.location.href == origin + "/#!/links"
            || window.location.href == origin + "/index.html#!/links"){
                goBackHistory = false
            }

            if(goBackHistory){
                window.history.back()
            }
        })
    }
}

export async function setupStatusbar(type = "normal"){
    if(Capacitor.isNative){
        if(type == "normal"){
            if(this.state.darkMode){
                Plugins.StatusBar.setBackgroundColor({
                    color: "#121212"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Dark
                })

                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#1F1F1F", false)
                }
            }
            else{
                Plugins.StatusBar.setBackgroundColor({
                    color: "#ffffff"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Light
                })

                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#F0F0F0", true)
                }
            }
        }
        else if(type == "modal"){
            if(this.state.darkMode){
                Plugins.StatusBar.setBackgroundColor({
                    color: "#1E1E1E"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Dark
                })
    
                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#1E1E1E", false)
                }
            }
            else{
                Plugins.StatusBar.setBackgroundColor({
                    color: "#ffffff"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Light
                })

                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#ffffff", true)
                }
            }
        }
        else if(type == "image/video"){
            Plugins.StatusBar.setBackgroundColor({
                color: "#000000"
            })
            
            Plugins.StatusBar.setStyle({
                style: StatusBarStyle.Dark
            })

            if(Capacitor.platform == "android"){
                window.NavigationBar.backgroundColorByHexString("#000000", false)
            }
        }
        else if(type == "login/register"){
            if(this.state.darkMode){
                Plugins.StatusBar.setBackgroundColor({
                    color: "#121212"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Dark
                })

                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#121212", false)
                }
            }
            else{
                Plugins.StatusBar.setBackgroundColor({
                    color: "#ffffff"
                })
                
                Plugins.StatusBar.setStyle({
                    style: StatusBarStyle.Light
                })

                if(Capacitor.platform == "android"){
                    window.NavigationBar.backgroundColorByHexString("#ffffff", true)
                }
            }
        }

        Plugins.StatusBar.setOverlaysWebView({
            overlay: false
        })
    }
}

export async function doSetup(){
    try{
        var networkStatus = await Plugins.Network.getStatus()
    }
    catch(e){
        return console.log(e)
    }

    try{
        var getLang = await Plugins.Storage.get({ key: "lang" })
        var getDarkMode = await Plugins.Storage.get({ key: "darkMode" })
        var getIsLoggedIn = await Plugins.Storage.get({ key: "isLoggedIn" })
        var getUserAPIKey = await Plugins.Storage.get({ key: "userAPIKey" })
        var getUserEmail = await Plugins.Storage.get({ key: "userEmail" })
        var getUserMasterKeys = await Plugins.Storage.get({ key: "userMasterKeys" })
        var getUserPublicKey = await Plugins.Storage.get({ key: "userPublicKey" })
        var getUserPrivateKey = await Plugins.Storage.get({ key: "userPrivateKey" })
        var getOfflineSavedFiles = await Plugins.Storage.get({ key: "offlineSavedFiles" })
        var getAPICache = await Plugins.Storage.get({ key: "apiCache" })
        var getSettings = await Plugins.Storage.get({ key: "settings" })
        var getCachedFiles = await Plugins.Storage.get({ key: "cachedFiles" })
        var getCachedFolders = await Plugins.Storage.get({ key: "cachedFolders" })
        var getCachedMetadata = await Plugins.Storage.get({ key: "cachedMetadata" })
        var getThumbnailCache = await Plugins.Storage.get({ key: "thumbnailCache" })
        var getGetThumbnailErrors = await Plugins.Storage.get({ key: "getThumbnailErrors" })
        var getCachedAPIItemListRequests = await Plugins.Storage.get({ key: "cachedAPIItemListRequests" })
        var getItemsCache = await Plugins.Storage.get({ key: "itemsCache" })
    }
    catch(e){
        return console.log(e)
    }

    if(getLang.value){
        this.setState({
            lang: getLang.value,
            mainToolbarTitle: language.get(getLang.value, "cloudDrives")
        }, () => {
            this.forceUpdate()
        })

        window.customVariables.lang = getLang.value
    }
    else{
        let deviceLang = await Plugins.Device.getLanguageCode()
        let defaultLang = "en"

        if(language.isAvailable(deviceLang.value)){
            defaultLang = deviceLang.value
        }

        this.setState({
            lang: defaultLang,
            mainToolbarTitle: language.get(defaultLang, "cloudDrives")
        }, () => {
            this.forceUpdate()
        })

        window.customVariables.lang = defaultLang
    }

    if(getDarkMode.value == null){
        document.body.classList.toggle("dark", true)

        this.setState({
            darkMode: true
        }, () => {
            this.forceUpdate()
        })
    }
    else{
        if(getDarkMode.value == "true"){
            document.body.classList.toggle("dark", true)

            this.setState({
                darkMode: true
            }, () => {
                this.forceUpdate()
            })
        }
        else{
            document.body.classList.toggle("dark", false)

            this.setState({
                darkMode: false
            }, () => {
                this.forceUpdate()
            })
        }
    }

    this.setupStatusbar()

    if(getIsLoggedIn.value == null){
        return this.showLogin()
    }
    else{
        if(getIsLoggedIn.value == "true"){
            let settings = {
                onlyWifi: false,
                showThumbnails: true,
                gridModeEnabled: false,
                biometricPINCode: ""
            }

            if(typeof getSettings.value == "string"){
                settings = JSON.parse(getSettings.value)
            }

            this.setState({
                userAPIKey: getUserAPIKey.value,
                userEmail: getUserEmail.value,
                userMasterKeys: JSON.parse(getUserMasterKeys.value),
                userPublicKey: getUserPublicKey.value,
                userPrivateKey: getUserPrivateKey.value,
                isLoggedIn: true,
                settings: settings
            }, () => {
                this.forceUpdate()
            })

            window.customVariables.userMasterKeys = JSON.parse(getUserMasterKeys.value)

            if(getOfflineSavedFiles.value == null){
                window.customVariables.offlineSavedFiles = {}
            }
            else{
                window.customVariables.offlineSavedFiles = JSON.parse(getOfflineSavedFiles.value)
            }

            if(getCachedFiles.value == null){
                window.customVariables.cachedFiles = {}
            }
            else{
                window.customVariables.cachedFiles = JSON.parse(getCachedFiles.value)
            }

            if(getCachedFolders.value == null){
                window.customVariables.cachedFolders = {}
            }
            else{
                window.customVariables.cachedFolders = JSON.parse(getCachedFolders.value)
            }

            if(getCachedMetadata.value == null){
                window.customVariables.cachedMetadata = {}
            }
            else{
                window.customVariables.cachedMetadata = JSON.parse(getCachedMetadata.value)
            }

            if(getThumbnailCache.value == null){
                window.customVariables.thumbnailCache = {}
            }
            else{
                window.customVariables.thumbnailCache = JSON.parse(getThumbnailCache.value)
            }

            if(getGetThumbnailErrors.value == null){
                window.customVariables.getThumbnailErrors = {}
            }
            else{
                window.customVariables.getThumbnailErrors = JSON.parse(getGetThumbnailErrors.value)
            }

            /*if(getAPICache.value == null){
                window.customVariables.apiCache = {}
            }
            else{
                window.customVariables.apiCache = JSON.parse(getAPICache.value)
            }*/

            /*if(getCachedAPIItemListRequests.value == null){
                window.customVariables.cachedAPIItemListRequests = {}
            }
            else{
                window.customVariables.cachedAPIItemListRequests = JSON.parse(getCachedAPIItemListRequests.value)
            }*/

            if(getItemsCache.value == null){
                window.customVariables.itemsCache = {}
            }
            else{
                window.customVariables.itemsCache = JSON.parse(getItemsCache.value)
            }
        }
        else{
            return this.showLogin()
        }
    }

    window.customVariables.apiKey = getUserAPIKey.value

    if(networkStatus.connected){
        await window.customFunctions.fetchUserInfo()

        await new Promise((resolve) => {
            this.updateUserKeys(() => {
                resolve()
            })
        })
    }

    if(typeof this.state.userMasterKeys[this.state.userMasterKeys.length - 1] !== "string"){
		return window.customFunctions.logoutUser()
	}

	if(typeof this.state.userMasterKeys[this.state.userMasterKeys.length - 1].length <= 16){
		return window.customFunctions.logoutUser()
	}

    this.updateUserUsage()

    /*clearInterval(window.customVariables.keyUpdateInterval)

    window.customVariables.keyUpdateInterval = setInterval(() => {
        this.updateUserKeys()
    }, 60000)*/

    clearInterval(window.customVariables.usageUpdateInterval)

    window.customVariables.usageUpdateInterval = setInterval(() => {
        this.updateUserUsage()
    }, 30000)

    clearInterval(window.customVariables.getNetworkInfoInterval)

    window.customFunctions.getNetworkInfo()

    window.customVariables.getNetworkInfoInterval = setInterval(() => {
        window.customFunctions.getNetworkInfo()
    }, 60000)

    Plugins.Network.addListener("networkStatusChange", (status) => {
        let old = window.customVariables.networkStatus

        window.customVariables.networkStatus = status

        if(old.connected !== window.customVariables.networkStatus.connected){
            this.setState({
                networkStatus: window.customVariables.networkStatus,
                isDeviceOnline: window.customVariables.networkStatus.connected
            }, () => {
                this.forceUpdate()
            })
        }
    })

    if(networkStatus.connected){
        this.initSocket()
    
        window.customFunctions.checkVersion()
    }

    window.customFunctions.triggerBiometricAuth()
    //window.customFunctions.isIndexEmpty()

    try{
        await BackgroundFetch.configure({
            minimumFetchInterval: 15
        }, (taskId) => {
            console.log("[BackgroundFetch] taskId: ", taskId)
    
            BackgroundFetch.finish(taskId)
          }, (taskId) => {
    
            console.log('[BackgroundFetch] TIMEOUT taskId: ', taskId)
    
            BackgroundFetch.finish(taskId)
        })
    }
    catch(e){
        console.log(e)
    }

    setTimeout(() => {
        if(Capacitor.isNative){
            Plugins.SplashScreen.hide()
        }
    }, 1000)

    return this.routeTo("/base")
}