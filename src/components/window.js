import { Capacitor, Plugins, FilesystemDirectory } from "@capacitor/core"
import { modalController, popoverController, menuController, alertController, loadingController, actionSheetController } from "@ionic/core"
import * as language from "../utils/language"
import * as Ionicons from 'ionicons/icons'
import { isPlatform } from '@ionic/react'
import { kMaxLength } from "buffer"

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
                if(routeEx[1] == "base" || routeEx[1] == "shared-in" || routeEx[1] == "shared-out" || routeEx[1] == "trash" || routeEx[1] == "links"){
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

    window.customFunctions = {}
    window.customVariables = {}

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

    window.onresize = () => {
        this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth
        })
    }

    document.onclick = (e) => {
        return window.customFunctions.togglePreviewHeader(e)
    }

    window.customFunctions.isPlatform = isPlatform
    window.customFunctions.safeAreaInsets = safeAreaInsets

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

    window.customFunctions.saveThumbnailCache = async () => {
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

        try{
            await Plugins.Storage.set({
                key: "thumbnailCache",
                value: JSON.stringify(window.customVariables.thumbnailCache)
            })
        }
        catch(e){
            console.log(e)
        }
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
        }
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

    window.customFunctions.refreshItemList = () => {
        this.updateItemList()

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
                password,
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
                password,
                passwordRepeat
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

    window.customFunctions.openEncryptionModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "encryption-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header>
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
        let actionSheet = await actionSheetController.create({
            header: language.get(this.state.lang, "help"),
            buttons: [
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

    window.customFunctions.toggleOnlyWifi = () => {
        let newSettings = this.state.settings
        let newVal = !newSettings.onlyWifi

        newSettings.onlyWifi = newVal

        document.getElementById("settings-only-wifi-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.logoutUser = async () => {
        await Plugins.Storage.remove({ key: "isLoggedIn" })
        await Plugins.Storage.remove({ key: "userAPIKey" })
        await Plugins.Storage.remove({ key: "userEmail" })
        await Plugins.Storage.remove({ key: "userMasterKeys" })
        await Plugins.Storage.remove({ key: "userPublicKey" })
        await Plugins.Storage.remove({ key: "userPrivateKey" })
        await Plugins.Storage.remove({ key: "offlineSavedFiles" })
        await Plugins.Storage.remove({ key: "apiCache" })

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

                        alert.dismiss()

                        try{
                            await Plugins.Filesystem.rmdir({
                                path: dirObj.path,
                                directory: dirObj.directory,
                                recursive: true
                            })

                            window.customVariables.thumbnailCache = {}
                            window.customVariables.thumbnailBlobCache = {}
                            window.customVariables.lastThumbnailCacheLength = undefined

                            window.customFunctions.saveThumbnailCache()
                        }
                        catch(e){
                            console.log(e)
                        }

                        return this.spawnToast(language.get(this.state.lang, "settingsClearThumbnailCacheDone"))
                    }
                }
            ]
        })

        return alert.present()
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