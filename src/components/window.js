import { Capacitor, Plugins, FilesystemDirectory } from "@capacitor/core"
import { modalController, popoverController, menuController, alertController, loadingController, actionSheetController } from "@ionic/core"
import * as language from "../utils/language"
import * as Ionicons from 'ionicons/icons'
import { isPlatform, getPlatforms } from "@ionic/react"

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')

export function windowRouter(){
    window.onhashchange = async () => {
        if(window.currentHref !== window.location.href){
            window.currentHref = window.location.href

            this.setState({
                currentHref: window.currentHref
            })

            let routeEx = window.location.hash.split("/")

            if(this.state.isLoggedIn){
                if(routeEx[1] == "base" || routeEx[1] == "shared-in" || routeEx[1] == "shared-out" || routeEx[1] == "trash" || routeEx[1] == "links" || routeEx[1] == "recent"){
                    await this.updateItemList()
    
                    let foldersInRoute = routeEx.slice(2)
    
                    if(foldersInRoute.length > 0){
                        let lastFolderInRoute = foldersInRoute[foldersInRoute.length - 1]
    
                        if(window.customVariables.cachedFolders[lastFolderInRoute]){
                            this.setState({
                                mainToolbarTitle: window.customVariables.cachedFolders[lastFolderInRoute].name,
                                showMainToolbarBackButton: true
                            })
                        }
                        else{
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "myCloud"),
                                showMainToolbarBackButton: false
                            })
                        }
                    }
                    else{
                        if(routeEx[1] == "shared-in"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "sharedInTitle"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else if(routeEx[1] == "shared-out"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "sharedOutTitle"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else if(routeEx[1] == "trash"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "trashTitle"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else if(routeEx[1] == "links"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "linksTitle"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else if(routeEx[1] == "recent"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "recent"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else if(routeEx[1] == "events"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "events"),
                                showMainToolbarBackButton: false
                            })
                        }
                        else{
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "myCloud"),
                                showMainToolbarBackButton: false
                            })
                        }
                    }
                }
            }
        }
    }
}

export function setupWindowFunctions(){
    window.$ = undefined

    let jQueryScript = document.createElement("script")

    jQueryScript.type = "text/javascript"
    jQueryScript.src = "assets/jquery.js"

    document.getElementsByTagName("head")[0].appendChild(jQueryScript)

    let pdfJsScript = document.createElement("script")

    pdfJsScript.type = "text/javascript"
    pdfJsScript.src = "assets/pdf/build/pdf.js"

    document.getElementsByTagName("head")[0].appendChild(pdfJsScript)

    let qrCodeScript = document.createElement("script")

    qrCodeScript.type = "text/javascript"
    qrCodeScript.src = "assets/qr/qrcode.min.js"

    document.getElementsByTagName("head")[0].appendChild(qrCodeScript)

    window.customFunctions = {}
    window.customVariables = {}

    window.customVariables.socket = undefined
    window.customVariables.socketPingInterval = undefined
    window.customVariables.itemList = []
    window.customVariables.lang = this.state.lang
    window.customVariables.cachedFolders = {}
    window.customVariables.cachedFiles = {}
    window.customVariables.cachedMetadata = {}
    window.customVariables.keyUpdateInterval = undefined
    window.customVariables.usageUpdateInterval = undefined
    window.customVariables.apiKey = ""
    window.customVariables.uploadSemaphore = new utils.Semaphore(3)
    window.customVariables.uploadChunkSemaphore = new utils.Semaphore(5)
    window.customVariables.downloadSemaphore = new utils.Semaphore(5)
    window.customVariables.downloadChunkSemaphore = new utils.Semaphore(30)
    window.customVariables.shareItemSemaphore = new utils.Semaphore(4)
    window.customVariables.decryptShareItemSemaphore = new utils.Semaphore(128)
    window.customVariables.uploads = {}
    window.customVariables.downloads = {}
    window.customVariables.reloadContentAfterUploadTimeout = undefined
    window.customVariables.offlineSavedFiles = {}
    window.customVariables.urlCreator = window.URL || window.webkitURL
    window.customVariables.currentPreviewURL = undefined
    window.customVariables.reloadAfterActionTimeout = undefined
    window.customVariables.nextNativeToastAllowed = Math.floor((+new Date()) / 1000)
    window.customVariables.apiCache = {}
    window.customVariables.selectLangInterval = undefined
    window.customVariables.stoppedUploads = {}
    window.customVariables.stoppedDownloads = {}
    window.customVariables.stoppedUploadsDone = {}
    window.customVariables.stoppedDownloadsDone = {}
    window.customVariables.lastCachedItemsLength = undefined
    window.customVariables.lastAPICacheLength = undefined
    window.customVariables.thumbnailCache = {}
    window.customVariables.thumbnailBlobCache = {}
    window.customVariables.currentThumbnailURL = undefined
    window.customVariables.lastThumbnailCacheLength = undefined
    window.customVariables.thumbnailSemaphore = new utils.Semaphore(2)
    window.customVariables.updateItemsSemaphore = new utils.Semaphore(1)
    window.customVariables.getNetworkInfoInterval = undefined
    window.customVariables.networkStatus = undefined
    window.customVariables.orderBy = "nameAsc"
    window.customVariables.getThumbnailErrors = {}
    window.customVariables.lastGetThumbnailErrorsLength = undefined
    window.customVariables.scrollToIndex = {}
    window.customVariables.mainSearchbarTimeout = undefined
    window.customVariables.mainSearchbarInterval = undefined
    window.customVariables.lastMainSearchbarTerm = ""
    window.customVariables.userMasterKeys = []
    window.customVariables.isGettingPreviewData = false
    window.customVariables.stopGettingPreviewData = false
    window.customVariables.cachedAPIItemListRequests = {}
    window.customVariables.deviceHeightAndWidthInterval = undefined
    window.customVariables.itemsCache = {}
    window.customVariables.lastSettingsRes = undefined
    window.customVariables.isDocumentReady = false
    window.customVariables.isGettingThumbnail = {}
    window.customVariables.lastItemsCacheLength = undefined

    window.addEventListener("load", () => {
        window.customVariables.isDocumentReady = true

        if(Capacitor.isNative && window.customVariables.isDocumentReady){
            Plugins.SplashScreen.hide()
        }
    })

    clearInterval(window.customVariables.mainSearchbarInterval)

    window.customVariables.mainSearchbarInterval = setInterval(() => {
        if(document.getElementById("main-searchbar") !== null){
            let term = document.getElementById("main-searchbar").value.trim()

            if(typeof term == "string"){
                if(term.length > 0){
                    if(term !== window.customVariables.lastMainSearchbarTerm){
                        window.customVariables.lastMainSearchbarTerm = term

                        clearTimeout(window.customVariables.mainSearchbarTimeout)
    
                        window.customVariables.mainSearchbarTimeout = setTimeout(() => {
                            this.setMainSearchTerm(term)
                        }, 250)
                    }
                }
                else{
                    clearTimeout(window.customVariables.mainSearchbarTimeout)

                    this.setMainSearchTerm("")
                }
            }
            else{
                clearTimeout(window.customVariables.mainSearchbarTimeout)

                this.setMainSearchTerm("")
            }
        }
        else{
            clearTimeout(window.customVariables.mainSearchbarTimeout)
        }
    }, 100)

    const updateHeightAndWidthState = () => {
        this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth
        })
    }

    clearInterval(window.customVariables.deviceHeightAndWidthInterval)

    window.customVariables.deviceHeightAndWidthInterval = setInterval(() => {
        updateHeightAndWidthState()
    }, 250)

    window.addEventListener("orientationchange", () => {
        updateHeightAndWidthState()
    }, false)

    window.addEventListener("resize", function() {
        updateHeightAndWidthState()
    }, false)

    document.onclick = (e) => {
        return window.customFunctions.togglePreviewHeader(e)
    }

    window.customFunctions.isPlatform = isPlatform
    window.customFunctions.safeAreaInsets = safeAreaInsets

    window.customFunctions.setupErrorReporter = () => {
        window.addEventListener("error", async (e) => {
            try{
                let errObj = {
                    message: e.message,
                    file: e.filename,
                    line: e.lineno,
                    column: e.colno,
                    stack: {
                        message: e.error.message || "none",
                        trace: e.error.stack || "none"
                    },
                    cancelable: e.cancelable,
                    timestamp: e.timeStamp,
                    type: e.type,
                    isTrusted: e.isTrusted,
                    url: window.location.href || "none"
                }

                await utils.apiRequest("POST", "/v1/error/report", {
                    apiKey: this.state.userAPIKey || "none",
                    error: JSON.stringify(errObj),
                    platform: "mobile"
                })
            }
            catch(e){  }
        })
    }

    window.customFunctions.togglePreviewHeader = (e) => {
        if(typeof e.target == "undefined"){
            return
        }

        if(e.target.innerHTML.indexOf("<ion-icon") !== -1){
            return false
        }

        if(document.getElementsByClassName("preview-header-hidden").length > 0){
            let header = document.getElementsByClassName("preview-header-hidden")[0]

            if(header.style.display == "none"){
                header.style.display = "block"
            }
            else{
                header.style.display = "none"
            }
        }
    }

    window.customFunctions.getNetworkInfo = async () => {
        try{
            window.customVariables.networkStatus = await Plugins.Network.getStatus()
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveItemsCache = async () => {
        if(typeof window.customVariables.lastItemsCacheLength !== "undefined"){
            let length = JSON.stringify(window.customVariables.itemsCache)

            length = length.length

            if(length == window.customVariables.lastItemsCacheLength){
                return false
            }
            else{
                window.customVariables.lastItemsCacheLength = length
            }
        }

        try{
            await Plugins.Storage.set({
                key: "itemsCache",
                value: JSON.stringify(window.customVariables.itemsCache)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveOfflineSavedFiles = async () => {
        try{
            await Plugins.Storage.set({
                key: "offlineSavedFiles",
                value: JSON.stringify(window.customVariables.offlineSavedFiles)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveGetThumbnailErrors = async () => {
        if(typeof window.customVariables.lastGetThumbnailErrorsLength !== "undefined"){
            let length = JSON.stringify(window.customVariables.getThumbnailErrors)

            length = length.length

            if(length == window.customVariables.lastGetThumbnailErrorsLength){
                return false
            }
            else{
                window.customVariables.lastGetThumbnailErrorsLength = length
            }
        }

        try{
            await Plugins.Storage.set({
                key: "getThumbnailErrors",
                value: JSON.stringify(window.customVariables.getThumbnailErrors)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveAPICache = async () => {
        if(typeof window.customVariables.lastAPICacheLength !== "undefined"){
            let length = JSON.stringify(window.customVariables.apiCache)

            length = length.length

            if(length == window.customVariables.lastAPICacheLength){
                return false
            }
            else{
                window.customVariables.lastAPICacheLength = length
            }
        }

        try{
            await Plugins.Storage.set({
                key: "apiCache",
                value: JSON.stringify(window.customVariables.apiCache)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveThumbnailCache = async (skipLengthCheck = false) => {
        if(!skipLengthCheck){
            if(typeof window.customVariables.lastThumbnailCacheLength !== "undefined"){
                let length = JSON.stringify(window.customVariables.thumbnailCache)
    
                length = length.length
    
                if(length == window.customVariables.lastThumbnailCacheLength){
                    return false
                }
                else{
                    window.customVariables.lastThumbnailCacheLength = length
                }
            }
        }

        try{
            await Plugins.Storage.set({
                key: "thumbnailCache",
                value: JSON.stringify(window.customVariables.thumbnailCache)
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        return true
    }

    window.customFunctions.saveCachedItems = async () => {
        if(typeof window.customVariables.lastCachedItemsLength !== "undefined"){
            let length = JSON.stringify(window.customVariables.cachedFiles) + JSON.stringify(window.customVariables.cachedFolders)

            length = length.length

            if(length == window.customVariables.lastCachedItemsLength){
                return false
            }
            else{
                window.customVariables.lastCachedItemsLength = length
            }
        }

        try{
            await Plugins.Storage.set({
                key: "cachedFiles",
                value: JSON.stringify(window.customVariables.cachedFiles)
            })

            await Plugins.Storage.set({
                key: "cachedFolders",
                value: JSON.stringify(window.customVariables.cachedFolders)
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        return true
    }

    window.customFunctions.dismissActionSheet = async (all = false) => {
        if(all){
            try{
                await actionSheetController.dismiss()

                return true
            }
            catch(e){
                return console.log(e)
            }
        }

        try{
            let actionSheet = await actionSheetController.getTop()

            if(typeof actionSheet !== "undefined"){
                return actionSheet.dismiss()
            }
            
            return true
        }
        catch(e){
            return console.log(e)
        }
    }

    window.customFunctions.dismissPopover = async (all = false) => {
        if(all){
            try{
                await popoverController.dismiss()

                return true
            }
            catch(e){
                return console.log(e)
            }
        }

        try{
            let popover = await popoverController.getTop()

            if(typeof popover !== "undefined"){
                return popover.dismiss()
            }

            return true
        }
        catch(e){
            return console.log(e)
        }
    }

    window.customFunctions.dismissModal = async (all = false) => {
        if(all){
            try{
                await modalController.dismiss()

                return true
            }
            catch(e){
                return console.log(e)
            }
        }

        try{
            let modal = await modalController.getTop()

            if(typeof modal !== "undefined"){
                return modal.dismiss()
            }

            return true
        }
        catch(e){
            return console.log(e)
        }
    }

    window.customFunctions.dismissLoader = async (all = false) => {
        if(all){
            try{
                await loadingController.dismiss()

                return true
            }
            catch(e){
                return console.log(e)
            }
        }

        try{
            let loader = await loadingController.getTop()

            if(typeof loader !== "undefined"){
                return loader.dismiss()
            }

            return true
        }
        catch(e){
            return console.log(e)
        }
    }

    window.customFunctions.dismissAlert = async (all = false) => {
        if(all){
            try{
                await alertController.dismiss()

                return true
            }
            catch(e){
                return console.log(e)
            }
        }

        try{
            let alert = await alertController.getTop()

            if(typeof alert !== "undefined"){
                return alert.dismiss()
            }

            return true
        }
        catch(e){
            return console.log(e)
        }
    }

    window.customFunctions.selectAllItems = () => {
        let items = []

        for(let i = 0; i < this.state.itemList.length; i++){
            let item = this.state.itemList[i]

            item.selected = true

            items.push(item)
        }

        this.setState({
            itemList: items,
            selectedItems: items.length
        })

        return window.customFunctions.dismissPopover()
    }

    window.customFunctions.unselectAllItems = () => {
        let items = []

        for(let i = 0; i < this.state.itemList.length; i++){
            let item = this.state.itemList[i]

            item.selected = false

            items.push(item)
        }

        this.setState({
            itemList: items,
            selectedItems: 0
        })

        return window.customFunctions.dismissPopover()
    }

    window.customFunctions.refreshItemList = async () => {
        try{
            await this.updateItemList(true, true, false)
        }
        catch(e){
            console.log(e)
        }

        return window.customFunctions.dismissPopover()
    }

    window.customFunctions.hideSidebarMenu = async () => {
        let mainMenu = await menuController.get("sideBarMenu")

        return mainMenu.close()
    }

    window.customFunctions.openRegisterModal = () => {
        return this.showRegister()
    }

    window.customFunctions.doLogout = async () => {
        await Plugins.Storage.set({ key: "isLoggedIn", value: "false" })
        await Plugins.Storage.set({ key: "userAPIKey", value: "" })
        await Plugins.Storage.set({ key: "userEmail", value: "" })
        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify([]) })
        await Plugins.Storage.set({ key: "userPublicKey", value: "" })
        await Plugins.Storage.set({ key: "userPrivateKey", value: "" })

        this.setState({ isLoggedIn: false })

        return this.showLogin()
    }

    window.customFunctions.doLogin = async () => {
        let email = document.getElementById("login-email").value
        let password = document.getElementById("login-password").value
        let twoFactorKey = document.getElementById("login-2fa").value

        if(!email || !password){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "loginInvalidInputs"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(twoFactorKey.length == 0){
            twoFactorKey = "XXXXXX"
        }

        let loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/login", {
                email,
                password: utils.hashPassword(password),
                twoFactorKey
            })
        }
        catch(e){
            document.getElementById("login-password").value = ""
            document.getElementById("login-2fa").value = ""

            console.log(e)

            window.customFunctions.dismissLoader()

            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "apiRequestError"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(!res.status){
            if(res.message == "Please enter your Two Factor Authentication code."){
                window.customFunctions.dismissLoader()

                document.getElementById("login-2fa-container").style.display = "block"

                let alert = await alertController.create({
                    header: "",
                    subHeader: "",
                    message: language.get(this.state.lang, "loginWith2FACode"),
                    buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                })

                return alert.present()
            }
            else{
                document.getElementById("login-password").value = ""
                document.getElementById("login-2fa").value = ""

                window.customFunctions.dismissLoader()

                if(res.message == "Account not yet activated."){
                    let alert = await alertController.create({
                        header: "",
                        subHeader: "",
                        message: language.get(this.state.lang, "loginAccountNotActivated"),
                        buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                    })
        
                    return alert.present()
                }
                else if(res.message == "Account not found."){
                    let alert = await alertController.create({
                        header: "",
                        subHeader: "",
                        message: language.get(this.state.lang, "loginAccountNotFound"),
                        buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                    })
        
                    return alert.present()
                }

                let alert = await alertController.create({
                    header: "",
                    subHeader: "",
                    message: language.get(this.state.lang, "loginWrongCredentials"),
                    buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                })

                return alert.present()
            }
        }

        await Plugins.Storage.set({ key: "isLoggedIn", value: "true" })
        await Plugins.Storage.set({ key: "userAPIKey", value: res.data.apiKey })
        await Plugins.Storage.set({ key: "userEmail", value: email })
        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify([utils.hashFn(password)]) })

        /*window.customFunctions.dismissLoader(true)
        window.customFunctions.dismissModal(true)
        window.customFunctions.dismissLoader()

        document.getElementById("login-email").value = ""
        document.getElementById("login-password").value = ""
        document.getElementById("login-2fa").value = ""*/

        return document.location.href = "index.html"
    }

    window.customFunctions.doRegister = async () => {
        let email = document.getElementById("register-email").value
        let password = document.getElementById("register-password").value
        let passwordRepeat = document.getElementById("register-password-repeat").value

        if(!email || !password || !passwordRepeat){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "registerInvalidInputs"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        let loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/register", {
                email,
                password: utils.hashPassword(password),
                passwordRepeat: utils.hashPassword(passwordRepeat)
            })
        }
        catch(e){
            document.getElementById("register-password").value = ""
            document.getElementById("register-password-repeat").value = ""

            console.log(e)

            window.customFunctions.dismissLoader()

            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "apiRequestError"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(!res.status){
            document.getElementById("register-password").value = ""
            document.getElementById("register-password-repeat").value = ""

            window.customFunctions.dismissLoader()

            let message = ""

            if(res.message.toLowerCase().indexOf("invalid email") !== -1 || res.message.toLowerCase().indexOf("invalid password") !== -1 || res.message.toLowerCase().indexOf("invalid email") !== -1){
                message = language.get(this.state.lang, "registerInvalidFields")
            }
            else if(res.message.toLowerCase().indexOf("your password needs to be at least 10 characters long") !== -1){
                message = language.get(this.state.lang, "registerPasswordAtLeast10Chars")
            }
            else if(res.message.toLowerCase().indexOf("passwords do not match") !== -1){
                message = language.get(this.state.lang, "registerPasswordsDoNotMatch")
            }
            else if(res.message.toLowerCase().indexOf("invalid email") !== -1){
                message = language.get(this.state.lang, "registerInvalidEmail")
            }
            else if(res.message.toLowerCase().indexOf("database error") !== -1){
                message = language.get(this.state.lang, "apiRequestError")
            }
            else if(res.message.toLowerCase().indexOf("this email is already registered") !== -1){
                message = language.get(this.state.lang, "registerEmailAlreadyRegistered")
            }
            else if(res.message.toLowerCase().indexOf("we could not send an email at this time, please try again later") !== -1){
                message = language.get(this.state.lang, "registerCouldNotSendEmail")
            }

            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: message,
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        document.getElementById("register-email").value = ""
        document.getElementById("register-password").value = ""
        document.getElementById("register-password-repeat").value = ""

        window.customFunctions.dismissLoader()

        let alert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(this.state.lang, "registerSuccess"),
            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
        })

        return alert.present()
    }

    window.customFunctions.openSettingsModal = async () => {
        return this.openSettingsModal()
    }

    window.customFunctions.setLang = async (lang = "en") => {
        await Plugins.Storage.set({ key: "lang", value: lang })

        return document.location.href = "index.html"
    }

    window.customFunctions.openLanguageModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "language-modal-" + utils.generateRandomClassName()

        let languagesHTML = ""
        let langList = language.list()

        for(let prop in langList){
            languagesHTML += `
                <ion-item lines="none" onClick="window.customFunctions.setLang('` + prop + `')" button>
                    <ion-label>` + language.name(prop) + `</ion-label>
                    <ion-radio slot="end" value="` + prop + `"></ion-radio>
                </ion-item>
            `
        }

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "settingsLanguage") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-radio-group value="` + appLang + `">
                                ` + languagesHTML + `
                            </ion-radio-group>
                        </ion-list>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return modal.present()
    }

    window.customFunctions.openEncryptionModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "encryption-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "encryption") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "encryptionModalHeader") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none" style="padding-top: 10px;">
                                ` + language.get(appLang, "encryptionModalFirstText") + `
                            </ion-item>
                            <ion-item-divider style="padding-top: 15px; --background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "encryptionModalHeaderHowItWorks") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none" style="padding-top: 10px;">
                                ` + language.get(appLang, "encryptionModalHowItWorksText") + `
                            </ion-item>
                        </ion-list>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return modal.present()
    }

    window.customFunctions.openWebsiteModal = async () => {
        let actionSheet = await actionSheetController.create({
            header: language.get(this.state.lang, "website"),
            buttons: [
                {
                    text: language.get(this.state.lang, "website"),
                    icon: Ionicons.globe,
                    handler: () => {
                        window.open("https://filen.io/", "_system")

                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "onlineFM"),
                    icon: Ionicons.grid,
                    handler: () => {
                        window.open("https://filen.io/my-account/file-manager/default", "_system")

                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "cancel"),
                    icon: "close",
                    role: "cancel"
                }
            ]
        })

        return actionSheet.present()
    }

    window.customFunctions.openHelpModal = async () => {
        let btns = [
            {
                text: language.get(this.state.lang, "support"),
                icon: Ionicons.helpBuoyOutline,
                handler: () => {
                    window.open("https://support.filen.io/", "_system")

                    return false
                }
            },
            {
                text: language.get(this.state.lang, "faq"),
                icon: Ionicons.informationCircle,
                handler: () => {
                    window.open("https://filen.io/faq", "_system")

                    return false
                }
            },
            {
                text: language.get(this.state.lang, "tos"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    window.open("https://filen.io/terms", "_system")

                    return false
                }
            },
            {
                text: language.get(this.state.lang, "privacyPolicy"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    window.open("https://filen.io/privacy", "_system")

                    return false
                }
            },
            {
                text: language.get(this.state.lang, "cancel"),
                icon: "close",
                role: "cancel"
            }
        ]

        if(isPlatform("ios")){
            btns = [
                {
                    text: language.get(this.state.lang, "support"),
                    icon: Ionicons.helpBuoyOutline,
                    handler: () => {
                        window.open("https://support.filen.io/", "_system")

                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "cancel"),
                    icon: "close",
                    role: "cancel"
                }
            ]
        }

        let actionSheet = await actionSheetController.create({
            header: language.get(this.state.lang, "help"),
            buttons: btns
        })

        return actionSheet.present()
    }

    window.customFunctions.queueFileUpload = this.queueFileUpload
    window.customFunctions.queueFileDownload = this.queueFileDownload

    window.customFunctions.openItemActionSheetFromJSON = (itemJSON) => {
        let item = JSON.parse(window.atob(itemJSON))

        return this.spawnItemActionSheet(item)
    }

    window.customFunctions.moveSelectedItems = () => {
        return this.moveSelectedItems()
    }

    window.customFunctions.trashSelectedItems = () => {
        return this.trashSelectedItems()
    }

    window.customFunctions.restoreSelectedItems = () => {
        return this.restoreSelectedItems()
    }

    window.customFunctions.removeSelectedItemsFromSharedIn = () => {
        return this.removeSelectedItemsFromSharedIn()
    }

    window.customFunctions.stopSharingSelectedItems = () => {
        return this.stopSharingSelectedItems()
    }

    window.customFunctions.downloadSelectedItems = () => {
        return this.downloadSelectedItems()
    }

    window.customFunctions.storeSelectedItemsOffline = () => {
        return this.storeSelectedItemsOffline()
    }

    window.customFunctions.shareSelectedItems = () => {
        return this.shareSelectedItems()
    }

    window.customFunctions.settingsToggleDarkMode = async () => {
        if(this.state.darkMode){
            await Plugins.Storage.set({ key: "darkMode", value: "false" })

            document.getElementById("settings-dark-mode-toggle").checked = false

            return this.setState({
                darkMode: false
            }, () => {
                document.location.href = "index.html"
            })
        }
        else{
            await Plugins.Storage.set({ key: "darkMode", value: "true" })

            document.getElementById("settings-dark-mode-toggle").checked = true

            return this.setState({
                darkMode: true
            }, () => {
                document.location.href = "index.html"
            })
        }
    }

    window.customFunctions.loginToggleDarkMode = async () => {
        if(this.state.darkMode){
            await Plugins.Storage.set({ key: "darkMode", value: "false" })

            return this.setState({
                darkMode: false
            }, () => {
                document.location.href = "index.html"
            })
        }
        else{
            await Plugins.Storage.set({ key: "darkMode", value: "true" })

            return this.setState({
                darkMode: true
            }, () => {
                document.location.href = "index.html"
            })
        }
    }

    window.customFunctions.saveSettings = async (newSettings) => {
        await Plugins.Storage.set({ key: "settings", value: JSON.stringify(newSettings) })

        return this.setState({
            settings: newSettings
        })
    }

    window.customFunctions.toggleShowThumbnails = () => {
        let newSettings = this.state.settings
        let newVal = !newSettings.showThumbnails

        newSettings.showThumbnails = newVal

        document.getElementById("settings-show-thumbnails-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.toggleOnlyWifi = () => {
        let newSettings = this.state.settings
        let newVal = !newSettings.onlyWifi

        newSettings.onlyWifi = newVal

        document.getElementById("settings-only-wifi-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.logoutUser = async () => {
        try{
            await Plugins.Storage.remove({ key: "isLoggedIn" })
            await Plugins.Storage.remove({ key: "userAPIKey" })
            await Plugins.Storage.remove({ key: "userEmail" })
            await Plugins.Storage.remove({ key: "userMasterKeys" })
            await Plugins.Storage.remove({ key: "userPublicKey" })
            await Plugins.Storage.remove({ key: "userPrivateKey" })
            await Plugins.Storage.remove({ key: "offlineSavedFiles" })
            await Plugins.Storage.remove({ key: "apiCache" })
            await Plugins.Storage.remove({ key: "cachedFiles" })
            await Plugins.Storage.remove({ key: "cachedFolders" })
            await Plugins.Storage.remove({ key: "cachedMetadata" })
            await Plugins.Storage.remove({ key: "thumbnailCache" })
            await Plugins.Storage.remove({ key: "getThumbnailErrors" })
            await Plugins.Storage.remove({ key: "cachedAPIItemListRequests" })
            await Plugins.Storage.remove({ key: "itemsCache" })
        }
        catch(e){
            console.log(e)
        }

        return document.location.href = "index.html"
    }

    window.customFunctions.doLogout = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "logoutAlertHeader"),
            message: language.get(this.state.lang, "logoutConfirmation"),
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: () => {
                        return window.customFunctions.logoutUser()
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.emptyTrash = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "emptyTrashHeader"),
            message: language.get(this.state.lang, "emptyTrashWarning"),
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async () => {
                        let loading = await loadingController.create({
                            message: ""
                        })

                        loading.present()

                        try{
                            var res = await utils.apiRequest("POST", "/v1/trash/empty", {
                                apiKey: this.state.userAPIKey
                            })
                        }
                        catch(e){
                            console.log(e)

                            loading.dismiss()

                            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                        }

                        if(!res.status){
                            console.log(res.message)

                            loading.dismiss()

                            return this.spawnToast(res.message)
                        }

                        loading.dismiss()

                        this.updateItemList()

                        return this.spawnToast(language.get(this.state.lang, "trashEmptied"))
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.changeItemColor = async (itemJSON, color) => {
        let item = JSON.parse(window.atob(itemJSON))

        let loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/dir/color/change", {
                apiKey: this.state.userAPIKey,
                uuid: item.uuid,
                color: color
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            console.log(res.message)
    
            loading.dismiss()
    
            return this.spawnToast(res.message)
        }

        loading.dismiss()

        try{
            await this.updateItemList()
        }
        catch(e){
            console.log(e)
        }

        return window.customFunctions.dismissModal()
    }

    window.customFunctions.editItemPublicLink = async (itemJSON, type, isEdit = false, currentLinkUUID = "") => {
        let item = JSON.parse(window.atob(itemJSON))
        let linkUUID = utils.uuidv4()

        if(isEdit && typeof currentLinkUUID == "string"){
            if(currentLinkUUID.length > 1){
                linkUUID = currentLinkUUID
            }
        }

        let loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        let expires = "never"

        if(typeof document.getElementById("public-link-expires-select").value == "string"){
            expires = document.getElementById("public-link-expires-select").value
        }

        let password = "empty"

        if(typeof document.getElementById("public-link-password-input").value == "string"){
            if(document.getElementById("public-link-password-input").value){
                password = document.getElementById("public-link-password-input").value
            }
        }

        let downloadBtn = "enable"

        if(document.getElementById("public-link-enable-download-btn-toggle") !== null){
            if(!document.getElementById("public-link-enable-download-btn-toggle").checked){
                downloadBtn = "disable"
            }
        }
        
        if(item.type == "file"){
            try{
                var res = await utils.apiRequest("POST", "/v1/link/edit", {
                    apiKey: this.state.userAPIKey,
                    uuid: linkUUID,
                    fileUUID: item.uuid,
                    expiration: expires,
                    password: password,
                    passwordHashed: utils.hashFn(password),
                    downloadBtn: downloadBtn,
                    type: type
                })
            }
            catch(e){
                console.log(e)
        
                loading.dismiss()
        
                return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
            }
        
            if(!res.status){
                console.log(res.message)
        
                loading.dismiss()
        
                return this.spawnToast(res.message)
            }

            loading.dismiss()

            document.getElementById("public-link-enabled-toggle").checked = true
            document.getElementById("public-link-input").value = "https://filen.io/d/" + linkUUID + "#!" + item.key

            if(type == "enable"){
                document.getElementById("enable-public-link-content").style.display = "none"
                document.getElementById("public-link-enabled-content").style.display = "block"
            }
            else{
                document.getElementById("enable-public-link-content").style.display = "block"
                document.getElementById("public-link-enabled-content").style.display = "none"

                try{
                    await this.updateItemList()
                }
                catch(e){
                    console.log(e)
                }
            }

            return true
        }
        else{
            const removeFolderLink = async (callback) => {
                let removeLoading = await loadingController.create({
                    message: ""
                })

                removeLoading.present()

                try{
                    var res = await utils.apiRequest("POST", "/v1/dir/link/remove", {
                        apiKey: this.state.userAPIKey,
                        uuid: item.uuid
                    })
                }
                catch(e){
                    console.log(e)
            
                    removeLoading.dismiss()
            
                    return callback(language.get(this.state.lang, "apiRequestError"))
                }
            
                if(!res.status){
                    console.log(res.message)
            
                    removeLoading.dismiss()
            
                    return callback(res.message)
                }

                removeLoading.dismiss()
                
                return callback(null)
            }

            const editFolderLink = async (callback) => {
                let editLoading = await loadingController.create({
                    message: ""
                })

                editLoading.present()

                try{
                    var res = await utils.apiRequest("POST", "/v1/dir/link/edit", {
                        apiKey: this.state.userAPIKey,
                        uuid: item.uuid,
                        expiration: expires,
                        password: password,
                        passwordHashed: utils.hashFn(password),
                        downloadBtn: downloadBtn
                    })
                }
                catch(e){
                    console.log(e)
            
                    editLoading.dismiss()
            
                    return callback(language.get(this.state.lang, "apiRequestError"))
                }
            
                if(!res.status){
                    console.log(res.message)
            
                    editLoading.dismiss()
            
                    return callback(res.message)
                }

                editLoading.dismiss()
                
                return callback(null)
            }

            const createFolderLink = async (callback) => {
                let createLoading = await loadingController.create({
                    message: "",
                    backdropDismiss: false
                })

                createLoading.present()

                try{
                    var res = await utils.apiRequest("POST", "/v1/download/dir", {
                        apiKey: this.state.userAPIKey,
                        uuid: item.uuid
                    })
                }
                catch(e){
                    console.log(e)
            
                    createLoading.dismiss()
            
                    return callback(language.get(this.state.lang, "apiRequestError"))
                }
            
                if(!res.status){
                    console.log(res.message)
            
                    createLoading.dismiss()
            
                    return callback(res.message)
                }

                let key = utils.generateRandomString(32)
                let keyEnc = utils.cryptoJSEncrypt(key, this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
                let newLinkUUID = utils.uuidv4()
                let totalItems = (res.data.folders.length + res.data.files.length)
                let doneItems = 0
                let erroredItems = 0

                const itemAdded = () => {
                    doneItems += 1

                    createLoading.message = language.get(this.state.lang, "folderLinkAddedItemsCount", true, ["__ADDED__", "__TOTAL__"], [doneItems, totalItems])

                    if(doneItems >= totalItems){
                        createLoading.dismiss()

                        if(erroredItems > 0){
                            console.log("Errored items: " + erroredItems)
                        }

                        linkUUID = newLinkUUID
            
                        return callback(null , {
                            linkUUID: linkUUID,
                            linkKey: key
                        })
                    }
                }

                const addItemRequest = async (data, tries, maxTries, cb) => {
                    if(tries >= maxTries){
						return cb(language.get(this.state.lang, "apiRequestError"))
                    }
                    
                    try{
                        var res = await utils.apiRequest("POST", "/v1/dir/link/add", data)
                    }
                    catch(e){
                        console.log(e)
                
                        return setTimeout(() => {
                            addItemRequest(data, (tries + 1), maxTries, cb)
                        }, 1000)
                    }
                
                    return cb(null)
                }

                const addItem = async (itemType, itemToAdd) => {
                    await window.customVariables.shareItemSemaphore.acquire()

                    let itemMetadata = ""

					if(itemType == "file"){
						itemMetadata = utils.cryptoJSEncrypt(JSON.stringify({
							name: itemToAdd.name,
							mime: itemToAdd.mime,
							key: itemToAdd.key,
							size: parseInt(itemToAdd.size)
						}), key)
					}
					else{
						itemMetadata = utils.cryptoJSEncrypt(JSON.stringify({
							name: itemToAdd.name
						}), key)
					}

					addItemRequest({
						apiKey: window.customVariables.apiKey,
						uuid: itemToAdd.uuid,
						parent: itemToAdd.parent,
						linkUUID: newLinkUUID,
						type: itemType,
						metadata: itemMetadata,
						key: keyEnc,
						expiration: "never",
						password: "empty",
						passwordHashed: utils.hashFn("empty"),
						downloadBtn: "enable"
					}, 0, 32, (err) => {
						window.customVariables.shareItemSemaphore.release()

						if(err){
							console.log(err)

							erroredItems += 1
						}

						itemAdded()
					}) 
                }

                for(let i = 0; i < res.data.folders.length; i++){
					let folder = res.data.folders[i]

                    await window.customVariables.decryptShareItemSemaphore.acquire()

					addItem("folder", {
						uuid: folder.uuid,
						parent: folder.parent,
						name: utils.decryptCryptoJSFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}

				for(let i = 0; i < res.data.files.length; i++){
					let file = res.data.files[i]

					await window.customVariables.decryptShareItemSemaphore.acquire()

					let fileMetadata = utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)

					addItem("file", {
						uuid: file.uuid,
						parent: file.parent,
						name: fileMetadata.name,
						mime: fileMetadata.mime,
						key: fileMetadata.key,
						size: fileMetadata.size
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}
            }

            loading.dismiss()

            if(type == "enable"){
                if(isEdit){
                    editFolderLink((err) => {
                        if(err){
                            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                        }
                    })
                }
                else{
                    createFolderLink((err, linkData) => {
                        if(err){
                            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                        }
    
                        document.getElementById("public-link-enabled-toggle").checked = true
                        document.getElementById("public-link-input").value = "https://filen.io/f/" + linkData.linkUUID + "#!" + linkData.linkKey

                        document.getElementById("enable-public-link-content").style.display = "none"
                        document.getElementById("public-link-enabled-content").style.display = "block"
                    })
                }
            }
            else{
                removeFolderLink((err) => {
                    if(err){
                        return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                    }

                    document.getElementById("enable-public-link-content").style.display = "block"
                    document.getElementById("public-link-enabled-content").style.display = "none"

                    this.updateItemList()
                })
            }

            return true
        }
    }

    window.customFunctions.copyPublicLinkToClipboard = async () => {
        if(!Capacitor.isNative){
            try{
                utils.copyTextToClipboardWeb(document.getElementById("public-link-input").value)
            }
            catch(e){
                console.log(e)
    
                return this.spawnToast(language.get(this.state.lang, "couldNotCopyToClipboard")) 
            }
    
            return this.spawnToast(language.get(this.state.lang, "copiedToClipboard"))
        }

        try{
            let link = document.getElementById("public-link-input").value

            await Plugins.Clipboard.write({
                url: link
            })
        }
        catch(e){
            console.log(e)

            return this.spawnToast(language.get(this.state.lang, "couldNotCopyToClipboard")) 
        }

        return this.spawnToast(language.get(this.state.lang, "copiedToClipboard")) 
    }

    window.customFunctions.copyStringToClipboard = async (string) => {
        if(!Capacitor.isNative){
            try{
                utils.copyTextToClipboardWeb(string)
            }
            catch(e){
                console.log(e)
    
                return this.spawnToast(language.get(this.state.lang, "couldNotCopyToClipboard")) 
            }
    
            return this.spawnToast(language.get(this.state.lang, "copiedToClipboard"))
        }

        try{
            await Plugins.Clipboard.write({
                url: string
            })
        }
        catch(e){
            console.log(e)

            return this.spawnToast(language.get(this.state.lang, "couldNotCopyToClipboard")) 
        }

        return this.spawnToast(language.get(this.state.lang, "copiedToClipboard")) 
    }

    window.customFunctions.clearThumbnailCache = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "settingsClearThumbnailCacheHeader"),
            message: language.get(this.state.lang, "settingsClearThumbnailCacheInfo"),
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async () => {
                        if(!Capacitor.isNative){
                            return alert.dismiss()
                        }

                        let dirObj = {
                            path: "ThumbnailCache/",
                            directory: FilesystemDirectory.External
                        }

                        try{
                            await Plugins.Filesystem.rmdir({
                                path: dirObj.path,
                                directory: dirObj.directory,
                                recursive: true
                            })

                            window.customVariables.thumbnailCache = {}
                            window.customVariables.thumbnailBlobCache = {}
                            window.customVariables.lastThumbnailCacheLength = undefined

                            await window.customFunctions.saveThumbnailCache(true)
                        }
                        catch(e){
                            console.log(e)
                        }

                        alert.dismiss()

                        return this.spawnToast(language.get(this.state.lang, "settingsClearThumbnailCacheDone"))
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.deleteEverything = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "settingsDeleteAll"),
            message: language.get(this.state.lang, "settingsDeleteAllInfo"),
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async () => {
                        let confirmAlert = await alertController.create({
                            header: language.get(this.state.lang, "settingsDeleteAll"),
                            message: language.get(this.state.lang, "settingsDeleteAllConfirm"),
                            buttons: [
                                {
                                    text: language.get(this.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(this.state.lang, "alertOkButton"),
                                    handler: async () => {
                                        var loading = await loadingController.create({
                                            message: ""
                                        })
                                    
                                        loading.present()

                                        try{
                                            var res = await utils.apiRequest("POST", "/v1/user/delete/all", {
                                                apiKey: this.state.userAPIKey
                                            })
                                        }
                                        catch(e){
                                            console.log(e)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(this.state.lang, "apiRequestError"),
                                                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }
                                
                                        if(!res.status){
                                            console.log(res.message)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: res.message,
                                                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }

                                        window.customFunctions.dismissLoader()
                                    
                                        let apiAlert = await alertController.create({
                                            header: "",
                                            subHeader: "",
                                            message: language.get(this.state.lang, "settingsDeleteAllSuccess"),
                                            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                        })
                                
                                        return apiAlert.present()
                                    }
                                }
                            ]
                        })
                
                        return confirmAlert.present()
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.deleteVersioned = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "settingsDeleteVersioned"),
            message: language.get(this.state.lang, "settingsDeleteVersionedInfo"),
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async () => {
                        let confirmAlert = await alertController.create({
                            header: language.get(this.state.lang, "settingsDeleteVersioned"),
                            message: language.get(this.state.lang, "settingsDeleteAllConfirm"),
                            buttons: [
                                {
                                    text: language.get(this.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(this.state.lang, "alertOkButton"),
                                    handler: async () => {
                                        var loading = await loadingController.create({
                                            message: ""
                                        })
                                    
                                        loading.present()

                                        try{
                                            var res = await utils.apiRequest("POST", "/v1/user/versions/delete", {
                                                apiKey: this.state.userAPIKey
                                            })
                                        }
                                        catch(e){
                                            console.log(e)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(this.state.lang, "apiRequestError"),
                                                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }
                                
                                        if(!res.status){
                                            console.log(res.message)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: res.message,
                                                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }

                                        window.customFunctions.dismissLoader()
                                    
                                        let apiAlert = await alertController.create({
                                            header: "",
                                            subHeader: "",
                                            message: language.get(this.state.lang, "settingsDeleteVersionedSuccess"),
                                            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                        })
                                
                                        return apiAlert.present()
                                    }
                                }
                            ]
                        })
                
                        return confirmAlert.present()
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.deleteAccount = async () => {
        const deleteIt = async (twoFactorKey = "XXXXXX") => {
            let alert = await alertController.create({
                header: language.get(this.state.lang, "settingsDeleteAccount"),
                message: language.get(this.state.lang, "settingsDeleteAccountInfo"),
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "alertOkButton"),
                        handler: async () => {
                            let confirmAlert = await alertController.create({
                                header: language.get(this.state.lang, "settingsDeleteAccount"),
                                message: language.get(this.state.lang, "settingsDeleteAllConfirm"),
                                buttons: [
                                    {
                                        text: language.get(this.state.lang, "cancel"),
                                        role: "cancel",
                                        handler: () => {
                                            return false
                                        }
                                    },
                                    {
                                        text: language.get(this.state.lang, "alertOkButton"),
                                        handler: async () => {
                                            var loading = await loadingController.create({
                                                message: ""
                                            })
                                        
                                            loading.present()
    
                                            try{
                                                var res = await utils.apiRequest("POST", "/v1/user/account/delete", {
                                                    apiKey: this.state.userAPIKey,
                                                    twoFactorKey
                                                })
                                            }
                                            catch(e){
                                                console.log(e)
                                        
                                                window.customFunctions.dismissLoader()
                                        
                                                let apiAlert = await alertController.create({
                                                    header: "",
                                                    subHeader: "",
                                                    message: language.get(this.state.lang, "apiRequestError"),
                                                    buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                                })
                                        
                                                return apiAlert.present()
                                            }
                                    
                                            if(!res.status){
                                                window.customFunctions.dismissLoader()
                                        
                                                let apiAlert = await alertController.create({
                                                    header: "",
                                                    subHeader: "",
                                                    message: res.message,
                                                    buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                                })
                                        
                                                return apiAlert.present()
                                            }
    
                                            window.customFunctions.dismissLoader()
                                        
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(this.state.lang, "settingsDeleteAccountSuccess"),
                                                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }
                                    }
                                ]
                            })
                    
                            return confirmAlert.present()
                        }
                    }
                ]
            })
    
            return alert.present()
        }

        if(this.state.twoFactorEnabled){
            let alert = await alertController.create({
                header: language.get(this.state.lang, "settingsDeleteAccount2FA"),
                inputs: [
                    {
                        type: "number",
                        id: "2fa-input",
                        name: "2fa-input",
                        value: ""
                    }
                ],
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            return deleteIt(inputs['2fa-input'])
                        }
                    }
                ]
            })
        
            return alert.present()
        }
        else{
            return deleteIt()
        }
    }

    window.customFunctions.redeemCode = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "settingsRedeemCode"),
            inputs: [
                {
                    type: "text",
                    id: "code-input",
                    name: "code-input",
                    placeholder: language.get(this.state.lang, "settingsRedeemCodePlaceholder"),
                    value: ""
                }
            ],
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async (inputs) => {
                        let code = inputs['code-input']

                        var loading = await loadingController.create({
                            message: ""
                        })
                    
                        loading.present()
                    
                        try{
                            var res = await utils.apiRequest("POST", "/v1/user/code/redeem", {
                                apiKey: this.state.userAPIKey,
                                code
                            })
                        }
                        catch(e){
                            console.log(e)
                    
                            loading.dismiss()
                    
                            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                        }
                    
                        if(!res.status){
                            loading.dismiss()
                    
                            console.log(res.message)
                    
                            return this.spawnToast(res.message)
                        }
                    
                        loading.dismiss()

                        this.updateUserUsage()

                        return this.spawnToast(language.get(this.state.lang, "codeRedeemSuccess"))
                    }
                }
            ]
        })
    
        return alert.present()
    }

    window.customFunctions.showGDPR = async () => {
        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/gdpr/download", {
                apiKey: this.state.userAPIKey
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return this.spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "gdpr-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "modalGDPRTitle") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen style="-webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;">
						<pre style="width: 100vw; height: 100%; margin-top: 0px; padding: 10px; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;">` + JSON.stringify(res.data, null, 4) + `</pre>
					</ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return modal.present()
    }

    window.customFunctions.open2FAModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "two-factor-modal-" + utils.generateRandomClassName()

        if(typeof window.customVariables.lastSettingsRes.twoFactorKey !== "string"){
            return false
        }

        if(window.customVariables.lastSettingsRes.twoFactorKey.length <= 6){
            return false
        }

        if(this.state.twoFactorEnabled){
            customElements.define(modalId, class ModalContent extends HTMLElement {
                connectedCallback(){
                    this.innerHTML = `
                        <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                            <ion-toolbar>
                                <ion-buttons slot="start">
                                    <ion-button onClick="window.customFunctions.dismissModal()">
                                        <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                    </ion-button>
                                </ion-buttons>
                                <ion-title>
                                    ` + language.get(appLang, "settings2FA") + `
                                </ion-title>
                            </ion-toolbar>
                        </ion-header>
                        <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                            <section style="padding-left: 15px; padding-right: 15px; margin-top: 15px;">
                                ` + language.get(appLang, "settings2FADisableInfo") + `
                            </section>
                            <br>
                            <section style="padding-left: 15px; padding-right: 15px; margin-top: 15px;">
                                <ion-button expand="block" size="small" color="` + (appDarkMode ? `dark` : `light`) + `" fill="solid" onClick="window.customFunctions.toggle2FA(false)">` + language.get(appLang, "disable") + `</ion-button>
                            </section>
                        </ion-content>
                    `
                }
            })
        }
        else{
            customElements.define(modalId, class ModalContent extends HTMLElement {
                connectedCallback(){
                    this.innerHTML = `
                        <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                            <ion-toolbar>
                                <ion-buttons slot="start">
                                    <ion-button onClick="window.customFunctions.dismissModal()">
                                        <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                    </ion-button>
                                </ion-buttons>
                                <ion-title>
                                    ` + language.get(appLang, "settings2FA") + `
                                </ion-title>
                            </ion-toolbar>
                        </ion-header>
                        <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                            <ion-list>
                                <ion-item lines="none" style="--background: white; margin-top: -10px;">
                                    <div id="qr-code-container" style="margin: 0px auto; padding: 20px;"></div>
                                </ion-item>
                                <ion-item lines="none" style="margin-top: 30px;">
                                    <ion-input value="` + window.customVariables.lastSettingsRes.twoFactorKey + `" style="-webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;" disabled></ion-input>
                                    <ion-button slot="end" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.copyStringToClipboard('` + window.customVariables.lastSettingsRes.twoFactorKey + `')">
                                        ` + language.get(appLang, "copy") + `
                                    </ion-button>
                                </ion-item>
                            </ion-list>
                            <section style="padding-left: 15px; padding-right: 15px; margin-top: 30px;">
								<ion-button expand="block" size="small" color="` + (appDarkMode ? `dark` : `light`) + `" fill="solid" onClick="window.customFunctions.toggle2FA(true)">` + language.get(appLang, "activate") + `</ion-button>
							</section>
                        </ion-content>
                    `
                }
            })
        }

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        await modal.present()

        if(!this.state.twoFactorEnabled){
            new window.QRCode(document.getElementById("qr-code-container"), {
                text: `otpauth://totp/` + encodeURIComponent("Filen") + `:` + encodeURIComponent(this.state.userEmail) + `?secret=` + window.customVariables.lastSettingsRes.twoFactorKey + `&issuer=` + encodeURIComponent("Filen") + `&digits=6&period=30`,
                width: 250,
                height: 250,
                colorDark: (this.state.darkMode ? "#000000" : "#000000"),
                colorLight: (this.state.darkMode ? "#ffffff" : "#ffffff"),
                correctLevel: window.QRCode.CorrectLevel.H
            })
        }

        return true
    }

    window.customFunctions.toggle2FA = async (activate) => {
        if(activate){
            let alert = await alertController.create({
                header: language.get(this.state.lang, "settings2FAActivate"),
                inputs: [
                    {
                        type: "number",
                        id: "two-factor-input",
                        name: "two-factor-input",
                        placeholder: language.get(this.state.lang, "enterGenerated2FACode"),
                        value: ""
                    }
                ],
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            let code = inputs['two-factor-input']
    
                            var loading = await loadingController.create({
                                message: ""
                            })
                        
                            loading.present()
                        
                            try{
                                var res = await utils.apiRequest("POST", "/v1/user/settings/2fa/enable", {
                                    apiKey: this.state.userAPIKey,
                                    code
                                })
                            }
                            catch(e){
                                console.log(e)
                        
                                loading.dismiss()
                        
                                return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                            }
                        
                            if(!res.status){
                                loading.dismiss()
                        
                                console.log(res.message)
                        
                                return this.spawnToast(res.message)
                            }
                        
                            loading.dismiss()

                            this.setState({
                                twoFactorEnabled: true
                            })

                            window.customFunctions.dismissModal(true)
                            window.customFunctions.dismissModal(true)
    
                            return this.spawnToast(language.get(this.state.lang, "2faActivated"))
                        }
                    }
                ]
            })
        
            return alert.present()
        }
        else{
            let alert = await alertController.create({
                header: language.get(this.state.lang, "settings2FADisable"),
                inputs: [
                    {
                        type: "number",
                        id: "two-factor-input",
                        name: "two-factor-input",
                        placeholder: language.get(this.state.lang, "enterGenerated2FACode"),
                        value: ""
                    }
                ],
                buttons: [
                    {
                        text: language.get(this.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(this.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            let code = inputs['two-factor-input']
    
                            var loading = await loadingController.create({
                                message: ""
                            })
                        
                            loading.present()
                        
                            try{
                                var res = await utils.apiRequest("POST", "/v1/user/settings/2fa/disable", {
                                    apiKey: this.state.userAPIKey,
                                    code
                                })
                            }
                            catch(e){
                                console.log(e)
                        
                                loading.dismiss()
                        
                                return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                            }
                        
                            if(!res.status){
                                loading.dismiss()
                        
                                console.log(res.message)
                        
                                return this.spawnToast(res.message)
                            }
                        
                            loading.dismiss()

                            this.setState({
                                twoFactorEnabled: false
                            })

                            window.customFunctions.dismissModal(true)
                            window.customFunctions.dismissModal(true)
    
                            return this.spawnToast(language.get(this.state.lang, "2faDisabled"))
                        }
                    }
                ]
            })
        
            return alert.present()
        }
    }

    window.customFunctions.openEventsModal = async () => {
        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/events", {
                apiKey: this.state.userAPIKey,
                id: 0
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return this.spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "events-modal-" + utils.generateRandomClassName()

        let eventsHTML = ""

        for(let i = 0; i < res.data.events.length; i++){
            eventsHTML += utils.renderEventRow(res.data.events[i], this.state.userMasterKeys, appLang)
        }

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "events") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list style="margin-top: -7px;">
                            ` + eventsHTML + `
                        </ion-list>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return await modal.present()
    }

    window.customFunctions.openEventDetailsModal = async (uuid) => {
        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/events/get", {
                apiKey: this.state.userAPIKey,
                uuid
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return this.spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "event-detail-modal-" + utils.generateRandomClassName()

        let eventDate = (new Date(res.data.timestamp * 1000)).toString().split(" ")
	    let dateString = eventDate[1] + ` ` + eventDate[2] + ` ` + eventDate[3] + ` ` + eventDate[4]

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "eventDetail") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list style="margin-top: -7px;">
                            <ion-item lines="none">
                                <ion-label>
                                    ` + res.data.info.ip + `
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + dateString + `
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + res.data.info.userAgent + `
                                </ion-label>
                            </ion-item>
                        </ion-list>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return await modal.present()
    }

    window.customFunctions.openEmailPasswordModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "change-email-password-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "settingsChangeEmailPassword") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "changeEmailNewEmail") + `" type="email" id="change-email-email"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "changeEmailNewEmailRepeat") + `" type="email" id="change-email-email-repeat"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "yourCurrentPassword") + `" type="password" id="change-email-password"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    <ion-button expand="block" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.changeEmail()">` + language.get(appLang, "save") + `</ion-button>
                                </ion-label>
                            </ion-item>
                        </ion-list>
                        <ion-list style="margin-top: 30px;">
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "changePasswordNewPassword") + `" type="password" id="change-password-password"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "changePasswordNewPasswordRepeat") + `" type="password" id="change-password-password-repeat"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input placeholder="` + language.get(appLang, "yourCurrentPassword") + `" type="password" id="change-password-current"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    <ion-button expand="block" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.changePassword()">` + language.get(appLang, "save") + `</ion-button>
                                </ion-label>
                            </ion-item>
                        </ion-list>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return await modal.present()
    }

    window.customFunctions.openInviteModal = async () => {
        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/get/account", {
                apiKey: this.state.userAPIKey
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return this.spawnToast(res.message)
        }
    
        loading.dismiss()

        let accountData = res.data

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "invite-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar>
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "settingsInvite") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <section style="padding: 16px;">
                            ` + language.get(appLang, "settingsInviteInfo") + `
                        </section>
                        <ion-list>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "settingsInviteCount") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        ` + accountData.referCount + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item>
                                <ion-input id="ref-link" value="https://filen.io/r/` + accountData.refId + `" disabled></ion-input>
                                <ion-buttons slot="end" onClick="window.customFunctions.copyRefLink()">
                                    <ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `">
                                        ` + language.get(appLang, "copy") + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                        </ion-list>
                        <section style="padding: 16px; font-size: 9pt; color: gray;">
                            ` + language.get(appLang, "settingsInviteInfo2") + `
                        </section>
                    </ion-content>
                `
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: true,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        return await modal.present()
    }

    window.customFunctions.copyRefLink = () => {
        return window.customFunctions.copyStringToClipboard(document.getElementById("ref-link").value)
    }

    window.customFunctions.changeEmail = async () => {
        let newEmail = document.getElementById("change-email-email").value
        let newEmailRepeat = document.getElementById("change-email-email-repeat").value
        let password = document.getElementById("change-email-password").value

        if(typeof newEmail !== "string" || typeof newEmailRepeat !== "string" || typeof password !== "string"){
            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""

            return this.spawnToast(language.get(this.state.lang, "changeEmailInvalidFields"))
        }

        if(newEmail.length <= 1 || newEmailRepeat.length <= 1 || password.length <= 1){
            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""

            return this.spawnToast(language.get(this.state.lang, "changeEmailInvalidFields"))
        }

        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/settings/email/change", {
                apiKey: this.state.userAPIKey,
                email: newEmail,
                emailRepeat: newEmailRepeat,
                password: utils.hashPassword(password)
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()

            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)

            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""
    
            return this.spawnToast(res.message)
        }
    
        loading.dismiss()

        document.getElementById("change-email-email").value = ""
        document.getElementById("change-email-email-repeat").value = ""
        document.getElementById("change-email-password").value = ""

        let successAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(this.state.lang, "changeEmailSuccess"),
            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
        })

        return successAlert.present()
    }

    window.customFunctions.changePassword = async () => {
        let newPassword = document.getElementById("change-password-password").value
        let newPasswordRepeat = document.getElementById("change-password-password-repeat").value
        let password = document.getElementById("change-password-current").value

        if(typeof newPassword !== "string" || typeof newPasswordRepeat !== "string" || typeof password !== "string"){
            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""

            return this.spawnToast(language.get(this.state.lang, "changePasswordInvalidFields"))
        }

        if(newPassword.length <= 1 || newPasswordRepeat.length <= 1 || password.length <= 1){
            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""

            return this.spawnToast(language.get(this.state.lang, "changePasswordInvalidFields"))
        }

        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/settings/password/change", {
                apiKey: this.state.userAPIKey,
                password: utils.hashPassword(newPassword),
                passwordRepeat: utils.hashPassword(newPasswordRepeat),
                currentPassword: utils.hashPassword(password)
            })
        }
        catch(e){
            console.log(e)

            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""
    
            loading.dismiss()
    
            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()

            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""
    
            console.log(res.message)
    
            return this.spawnToast(res.message)
        }

        document.getElementById("change-password-password").value = ""
        document.getElementById("change-password-password-repeat").value = ""
        document.getElementById("change-password-current").value = ""
    
        loading.dismiss()

        window.customFunctions.logoutUser()

        return this.spawnToast(language.get(this.state.lang, "changePasswordSuccess"))
    }

    window.customFunctions.openOrderBy = async () => {
        let alert = await alertController.create({
            header: language.get(this.state.lang, "orderBy"),
            inputs: [
                {
                    type: "radio",
                    label: language.get(this.state.lang, "orderByName"),
                    value: "name",
                    checked: (window.customVariables.orderBy.indexOf("name") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(this.state.lang, "orderBySize"),
                    value: "size",
                    checked: (window.customVariables.orderBy.indexOf("size") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(this.state.lang, "orderByDate"),
                    value: "date",
                    checked: (window.customVariables.orderBy.indexOf("date") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(this.state.lang, "orderByType"),
                    value: "type",
                    checked: (window.customVariables.orderBy.indexOf("type") !== -1 ? true : false)
                }
            ],
            buttons: [
                {
                    text: language.get(this.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(this.state.lang, "orderByReset"),
                    handler: () => {
                        let sortedItems = utils.orderItemsByType(this.state.itemList, "dateDesc")

                        window.customVariables.orderBy = "nameAsc"
                        window.customVariables.itemList = sortedItems

                        return this.setState({
                            itemList: sortedItems
                        }, () => {
                            this.forceUpdate()
                        })
                    }
                },
                {
                    text: language.get(this.state.lang, "alertOkButton"),
                    handler: async (type) => {
                        let alert = await alertController.create({
                            header: language.get(this.state.lang, "orderByDirection"),
                            inputs: [
                                {
                                    type: "radio",
                                    label: language.get(this.state.lang, "orderByDirectionAsc"),
                                    value: "Asc",
                                    checked: (window.customVariables.orderBy.indexOf("Asc") !== -1 ? true : false)
                                },
                                {
                                    type: "radio",
                                    label: language.get(this.state.lang, "orderByDirectionDesc"),
                                    value: "Desc",
                                    checked: (window.customVariables.orderBy.indexOf("Desc") !== -1 ? true : false)
                                }
                            ],
                            buttons: [
                                {
                                    text: language.get(this.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(this.state.lang, "alertOkButton"),
                                    handler: (direction) => {
                                        let typeAndDirection = type + direction

                                        console.log(typeAndDirection)

                                        let sortedItems = utils.orderItemsByType(this.state.itemList, typeAndDirection)
                
                                        window.customVariables.orderBy = typeAndDirection
                                        window.customVariables.itemList = sortedItems
                
                                        return this.setState({
                                            itemList: sortedItems
                                        }, () => {
                                            this.forceUpdate()
                                        })
                                    }
                                }
                            ]
                        })

                        return alert.present()
                    }
                }
            ]
        })

        window.customFunctions.dismissPopover()

        return alert.present()
    }
}