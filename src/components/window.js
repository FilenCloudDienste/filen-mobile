import { Plugins } from "@capacitor/core"
import { modalController, popoverController, menuController, alertController, loadingController, actionSheetController } from "@ionic/core"
import * as language from "../utils/language"
import * as Ionicons from 'ionicons/icons';

const utils = require("../utils/utils")

export function windowRouter(){
    window.onhashchange = async () => {
        if(window.currentHref !== window.location.href){
            window.currentHref = window.location.href

            this.setState({
                currentHref: window.currentHref
            })

            let routeEx = window.location.hash.split("/")

            if(this.state.isLoggedIn){
                if(routeEx[1] == "base" || routeEx[1] == "shared-in" || routeEx[1] == "shared-out" || routeEx[1] == "trash"){
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
    window.customFunctions = {}
    window.customVariables = {}

    window.customVariables.itemList = []
    window.customVariables.lang = this.state.lang
    window.customVariables.cachedFolders = {}
    window.customVariables.cachedFiles = {}
    window.customVariables.keyUpdateInterval = undefined
    window.customVariables.usageUpdateInterval = undefined
    window.customVariables.apiKey = ""
    window.customVariables.uploadSemaphore = new utils.Semaphore(3)
    window.customVariables.uploadChunkSemaphore = new utils.Semaphore(5)
    window.customVariables.downloadSemaphore = new utils.Semaphore(5)
    window.customVariables.downloadChunkSemaphore = new utils.Semaphore(30)
    window.customVariables.uploads = {}
    window.customVariables.downloads = {}
    window.customVariables.reloadContentAfterUploadTimeout = undefined
    window.customVariables.offlineSavedFiles = {}
    window.customVariables.urlCreator = window.URL || window.webkitURL
    window.customVariables.currentPreviewURL = undefined
    window.customVariables.reloadAfterActionTimeout = undefined
    window.customVariables.previewHeaderHideTimeout = undefined
    window.customVariables.nextNativeToastAllowed = Math.floor((+new Date()) / 1000)
    window.customVariables.apiCache = {}

    document.addEventListener("click", (e) => {
        if(document.getElementsByClassName("preview-header-hidden").length > 0){
            try{
                document.getElementsByClassName("preview-header-hidden")[0].style.display = "block"
            } catch(e){ }

            clearTimeout(window.customVariables.previewHeaderHideTimeout)

            window.customVariables.previewHeaderHideTimeout = setTimeout(() => {
                try{
                    document.getElementsByClassName("preview-header-hidden")[0].style.display = "none"
                } catch(e){ }
            }, 5000)
        }
    }, true)

    window.onresize = () => {
        this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth
        })
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

    window.customFunctions.saveAPICache = async () => {
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
            document.getElementById("login-password").value = ""
            document.getElementById("login-2fa").value = ""

            window.customFunctions.dismissLoader()

            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "loginWrongCredentials"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        await Plugins.Storage.set({ key: "isLoggedIn", value: "true" })
        await Plugins.Storage.set({ key: "userAPIKey", value: res.data.apiKey })
        await Plugins.Storage.set({ key: "userEmail", value: email })
        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify([utils.hashFn(password)]) })

        window.customFunctions.dismissLoader(true)
        window.customFunctions.dismissModal(true)

        window.customFunctions.dismissLoader()

        document.getElementById("login-email").value = ""
        document.getElementById("login-password").value = ""
        document.getElementById("login-2fa").value = ""

        return this.doSetup()
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
                    <ion-content fullscreen>
                        encryption
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

    window.customFunctions.openHelpModal = async () => {
        let appLang = this.state.lang
        let modalId = "help-modal-" + utils.generateRandomClassName()

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
                                ` + language.get(appLang, "help") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen>
                        help
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
}