import { Capacitor, Plugins, FilesystemDirectory, App, HapticsImpactStyle } from "@capacitor/core"
import { modalController, popoverController, menuController, alertController, loadingController, actionSheetController } from "@ionic/core"
import * as language from "../utils/language"
import * as Ionicons from 'ionicons/icons'
import { isPlatform, getPlatforms } from "@ionic/react"
import { FingerprintAIO } from "@ionic-native/fingerprint-aio"
import { PhotoLibrary } from '@ionic-native/photo-library';

const workers = require("../utils/workers")
const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')
const CryptoJS = require("crypto-js")

export function windowRouter(){
    window.onhashchange = async () => {
        if(window.currentHref !== window.location.href){
            window.currentHref = window.location.href

            this.setState({
                currentHref: window.currentHref
            }, () => {
                this.forceUpdate()
            })

            let routeEx = window.location.hash.split("/")

            if(this.state.isLoggedIn){
                if(routeEx[1] == "base" || routeEx[1] == "shared-in" || routeEx[1] == "shared-out" || routeEx[1] == "trash" || routeEx[1] == "links" || routeEx[1] == "recent" || routeEx[1] == "favorites"){
                    await this.updateItemList()
    
                    let foldersInRoute = routeEx.slice(2)
    
                    if(foldersInRoute.length > 0){
                        let lastFolderInRoute = foldersInRoute[foldersInRoute.length - 1]
    
                        if(window.customVariables.cachedFolders[lastFolderInRoute]){
                            this.setState({
                                mainToolbarTitle: window.customVariables.cachedFolders[lastFolderInRoute].name,
                                showMainToolbarBackButton: true
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else{
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "cloudDrives"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                    }
                    else{
                        if(routeEx[1] == "shared-in"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "sharedInTitle"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "shared-out"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "sharedOutTitle"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "trash"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "trashTitle"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "links"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "linksTitle"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "recent"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "recent"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "events"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "events"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else if(routeEx[1] == "favorites"){
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "favorites"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
                            })
                        }
                        else{
                            this.setState({
                                mainToolbarTitle: language.get(this.state.lang, "cloudDrives"),
                                showMainToolbarBackButton: false
                            }, () => {
                                this.forceUpdate()
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

    let hammerJSScript = document.createElement("script")

    hammerJSScript.type = "text/javascript"
    hammerJSScript.src = "assets/hammer.js"

    document.getElementsByTagName("head")[0].appendChild(hammerJSScript)

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
    window.customVariables.uploadSemaphore = new utils.Semaphore(1)
    window.customVariables.uploadChunkSemaphore = new utils.Semaphore(8)
    window.customVariables.downloadSemaphore = new utils.Semaphore(1)
    window.customVariables.downloadChunkSemaphore = new utils.Semaphore(16)
    window.customVariables.shareItemSemaphore = new utils.Semaphore(8)
    window.customVariables.decryptShareItemSemaphore = new utils.Semaphore(128)
    window.customVariables.writeSemaphore = new utils.Semaphore(64)
    window.customVariables.currentUploadThreads = 0
    window.customVariables.maxUploadThreads = 6
    window.customVariables.maxDownloadThreads = 16
    window.customVariables.currentDownloadThreads = 0
    window.customVariables.maxWriteThreads = 256
    window.customVariables.currentWriteThreads = 0
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
    window.customVariables.lastCachedMetadataLength = undefined
    window.customVariables.thumbnailCache = {}
    window.customVariables.thumbnailBlobCache = {}
    window.customVariables.currentThumbnailURL = undefined
    window.customVariables.lastThumbnailCacheLength = undefined
    window.customVariables.thumbnailSemaphore = new utils.Semaphore(4)
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
    window.customVariables.currentFileVersion = this.state.currentFileVersion
    window.customVariables.currentAuthVersion = this.state.currentAuthVersion
    window.customVariables.currentMetadataVersion = this.state.currentMetadataVersion
    window.customFunctions.workers = workers
    window.customVariables.updateScreenShowing = false
    window.customVariables.currentPINCode = ""
    window.customVariables.confirmPINCode = ""
    window.customFunctions.isPlatform = isPlatform
    window.customFunctions.safeAreaInsets = safeAreaInsets
    window.customVariables.currentBiometricModalType = "auth"
    window.customVariables.nextBiometricAuth = 0
    window.customVariables.biometricAuthShowing = false
    window.customVariables.biometricAuthTimeout = 300 //secs
    window.customVariables.currentTextEditorContent = ""
    window.customVariables.currentTextEditorItem = {}
    window.customVariables.cachedUserInfo = undefined
    window.customVariables.imagePreviewZoomedIn = false

    /*setTimeout(() => {
        PhotoLibrary.requestAuthorization().then(() => {
            PhotoLibrary.getLibrary((res) => {
                let lib = res.library

                lib.forEach((item) => {
                    console.log(item)

                    if(item.mimeType.indexOf("image/") !== -1){
                        PhotoLibrary.getPhoto(item.id).then((data) => {
                            console.log(data)
                        }).catch((err) => {
                            console.error(err)
                        })
                    }
                    else{
                        PhotoLibrary.getVideo(item.id).then((data) => {
                            console.log(data)
                        }).catch((err) => {
                            console.error(err)
                        })
                    }
                })
            }, (err) => {
                console.error(err)
            }, {
                thumbnailWidth: 1,
                thumbnailHeight: 1,
                quality: 1,
                useOriginalFileNames: true,
                includeAlbumData: false,
                includeVideos: true,
                chunkTimeSec: 0.5,
                maxItems: 99999999999,
                itemsInChunk: 100
            }).subscribe({
                next: (res) => {
                    
                },
                error: (err) => {
                    console.error(err)
                },
                complete: () => {
                    console.log("done")
                }
            })
        }).catch((err) => {
            console.error(err)
        })
    }, 1000)*/

    Plugins.App.addListener("appStateChange", (appState) => {
        if(appState.isActive){
            window.customFunctions.checkVersion()
            window.customFunctions.triggerBiometricAuth()
        }
    })

    window.addEventListener("load", () => {
        window.customVariables.isDocumentReady = true

        if(Capacitor.isNative && window.customVariables.isDocumentReady){
            Plugins.SplashScreen.hide()
        }
    })

    clearInterval(window.customVariables.mainSearchbarInterval)

    setInterval(() => {
        if(document.getElementById("main-virtual-list") !== null){
            let scrollTop = Math.floor(document.getElementById("main-virtual-list").scrollTop)

            if(scrollTop == 0){
                this.setState({
                    refresherEnabled: true
                })
            }
            else{
                this.setState({
                    refresherEnabled: false
                })
            }

            let diff = Math.floor(Math.floor(document.getElementById("main-virtual-list").scrollHeight - document.getElementById("main-virtual-list").offsetHeight) - Math.floor(scrollTop))

            if(scrollTop > 0 && diff <= 50){
                this.setState({
                    hideMainFab: true
                })
            }
            else{
                this.setState({
                    hideMainFab: false
                })
            }
        }
        else{
            this.setState({
                hideMainFab: false
            })
        }
    }, 250)

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
        return this.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            gridItemWidth: (window.innerWidth / 2) - 25
        }, () => {
            this.forceUpdate()
        })
    }

    clearInterval(window.customVariables.deviceHeightAndWidthInterval)

    window.customVariables.deviceHeightAndWidthInterval = setInterval(() => {
        updateHeightAndWidthState()
    }, 500)

    window.addEventListener("orientationchange", () => {
        updateHeightAndWidthState()
    }, false)

    window.addEventListener("resize", function() {
        updateHeightAndWidthState()
    }, false)

    document.onclick = (e) => {
        return window.customFunctions.togglePreviewHeader(e)
    }

    window.customFunctions.fetchUserInfo = async () => {
        let loading = await loadingController.create({
            message: ""
        })

        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/user/info", {
                apiKey: window.customVariables.apiKey
            })
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            this.spawnToast(language.get(this.state.lang, "apiRequestError"))

            return false
        }

        if(!res.status){
            console.log(res.message)

            loading.dismiss()

            this.spawnToast(res.message)

            return false
        }

        loading.dismiss()

        window.customVariables.cachedUserInfo = res.data

        this.setState({
            cachedUserInfo: res.data
        }, () => {
            this.forceUpdate()
        })

        return true
    }

    window.customFunctions.triggerBiometricAuth = () => {
        if(typeof this.state.settings.biometricPINCode == "undefined"){
            return false
        }

        if(this.state.settings.biometricPINCode.length !== 4){
            return false
        }

        if(((+new Date() / 1000)) > window.customVariables.nextBiometricAuth){
            window.customVariables.nextBiometricAuth = ((+new Date() / 1000) + window.customVariables.biometricAuthTimeout)
            
            window.customFunctions.showBiometricAuthScreen("auth")
        }

        return true
    }

    window.customFunctions.shakeDiv = async (div, interval = 100, distance = 10, times = 4) => {
        window.$(div).css("position", "relative")

        for(let iter = 0; iter < (times + 1); iter++){
            window.$(div).animate({
                left: ((iter % 2 == 0 ? distance : distance *- 1)
            )}, interval)
        }
        
        window.$(div).animate({
            left: 0
        }, interval)

        return true
    }

    window.customFunctions.inputPINCode = async (number) => {
        let dotChildren = window.$("#pin-code-dots").children()

        const paintDots = (length) => {
            Plugins.Haptics.impact(HapticsImpactStyle.Light)

            if(length == 1){
                dotChildren.first().attr("icon", Ionicons.ellipse)
            }
            else if(length == 2){
                dotChildren.first().next().attr("icon", Ionicons.ellipse)
            }
            else if(length == 3){
                dotChildren.first().next().next().attr("icon", Ionicons.ellipse)
            }
            else{
                dotChildren.first().next().next().next().attr("icon", Ionicons.ellipse)
            }

            return true
        }

        if(window.customVariables.currentBiometricModalType == "auth" && typeof this.state.settings.biometricPINCode !== "undefined"){
            window.customVariables.currentPINCode = window.customVariables.currentPINCode + "" + number

            paintDots(window.customVariables.currentPINCode.length)

            if(window.customVariables.currentPINCode.length >= 4){
                if(window.customVariables.currentPINCode !== this.state.settings.biometricPINCode){
                    Plugins.Haptics.impact(HapticsImpactStyle.Medium)

                    await window.customFunctions.shakeDiv(window.$("#pin-code-dots"), 100, 10, 6)

                    dotChildren.each(function(){
                        window.$(this).attr("icon", Ionicons.ellipseOutline)
                    })

                    window.customVariables.currentPINCode = ""
                }
                else{
                    window.customVariables.currentPINCode = ""

                    await new Promise((resolve) => {
                        return setTimeout(resolve, 100)
                    })

                    window.customVariables.biometricAuthShowing = false

                    window.$("#biometric-auth-screen").remove()
                }
            }
        }
        else if(window.customVariables.currentBiometricModalType == "setup"){
            if(window.customVariables.currentPINCode.length >= 4){
                window.customVariables.confirmPINCode = window.customVariables.confirmPINCode + "" + number

                paintDots(window.customVariables.confirmPINCode.length)

                if(window.customVariables.confirmPINCode.length >= 4){
                    if(window.customVariables.confirmPINCode !== window.customVariables.currentPINCode){
                        Plugins.Haptics.impact(HapticsImpactStyle.Medium)

                        await window.customFunctions.shakeDiv(window.$("#pin-code-dots"), 100, 10, 6)

                        dotChildren.each(function(){
                            window.$(this).attr("icon", Ionicons.ellipseOutline)
                        })

                        window.customVariables.currentPINCode = ""
                        window.customVariables.confirmPINCode = ""
    
                        window.$("#pin-code-text").html(language.get(this.state.lang, "biometricSetupPINCode"))
                    }
                    else{
                        let newSettings = this.state.settings

                        newSettings.biometricPINCode = window.customVariables.confirmPINCode

                        window.customFunctions.saveSettings(newSettings)

                        this.setState({
                            settings: newSettings
                        }, () => {
                            this.forceUpdate()
                        })

                        window.customVariables.currentPINCode = ""
                        window.customVariables.confirmPINCode = ""

                        await new Promise((resolve) => {
                            return setTimeout(resolve, 100)
                        })

                        window.customVariables.biometricAuthShowing = false

                        window.$("#biometric-auth-screen").remove()
                    }
                }
            }
            else{
                window.customVariables.currentPINCode = window.customVariables.currentPINCode + "" + number

                paintDots(window.customVariables.currentPINCode.length)

                if(window.customVariables.currentPINCode.length >= 4){
                    dotChildren.each(function(){
                        window.$(this).attr("icon", Ionicons.ellipseOutline)
                    })

                    window.customVariables.confirmPINCode = ""

                    window.$("#pin-code-text").html(language.get(this.state.lang, "biometricSetupPINCodeConfirm"))
                }
            }
        }

        return true
    }

    window.customFunctions.showBiometricAuthScreen = async (type = "auth") => {
        if(type == "auth"){
            if(window.customVariables.biometricAuthShowing){
                return false
            }
    
            window.customVariables.biometricAuthShowing = true
        }

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "biometric-auth-modal-" + utils.generateRandomClassName()

        window.customVariables.currentPINCode = ""
        window.customVariables.confirmPINCode = ""

        if(type == "auth"){
            window.customVariables.currentBiometricModalType = "auth"
        }
        else if(type == "setup"){
            window.customVariables.currentBiometricModalType = "setup"
        }
        else{
            window.customVariables.currentBiometricModalType = "auth"
        }

        window.$("body").prepend(`
            <div id="biometric-auth-screen" style="position: absolute; height: 100vh; width: 100vw; overflow: hidden; z-index: 100000;">
                <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                    <ion-toolbar style="--background: transparent;">
                        <ion-title>
                            &nbsp;
                        </ion-title>
                    </ion-toolbar>
                </ion-header>
                <ion-content fullscreen>
                    <div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
                        <center>
                            <ion-icon slot="icon-only" icon="` + Ionicons.lockClosedOutline + `" style="font-size: 60pt;"></ion-icon>
                            <br>
                            <br>
                            <br>
                            <text id="pin-code-text">
                                ` + language.get(appLang, (type == "auth" ? "biometricEnterPINCode" : "biometricSetupPINCode")) + `
                            </text>
                            <br>
                            <br>
                            <br>
                            <div id="pin-code-dots">
                                <ion-icon slot="icon-only" icon="` + Ionicons.ellipseOutline + `" style="font-size: 16pt; margin-right: 10px;"></ion-icon>
                                <ion-icon slot="icon-only" icon="` + Ionicons.ellipseOutline + `" style="font-size: 16pt; margin-right: 10px;"></ion-icon>
                                <ion-icon slot="icon-only" icon="` + Ionicons.ellipseOutline + `" style="font-size: 16pt; margin-right: 10px;"></ion-icon>
                                <ion-icon slot="icon-only" icon="` + Ionicons.ellipseOutline + `" style="font-size: 16pt;"></ion-icon>
                            </div>
                            <br>
                            <br>
                            <br>
                            <div style="width: ` + (window.innerWidth - 50) + `px; height: 300px;">
                                <div style="width: 100%; height: 75px;">
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('1')">
                                            1
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('2')">
                                            2
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('3')">
                                            3
                                        </ion-button>
                                    </div>
                                </div>
                                <div style="width: 100%; height: 75px;">
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('4')">
                                            4
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('5')">
                                            5
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('6')">
                                            6
                                        </ion-button>
                                    </div>
                                </div>
                                <div style="width: 100%; height: 75px;">
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('7')">
                                            7
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('8')">
                                            8
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('9')">
                                            9
                                        </ion-button>
                                    </div>
                                </div>
                                <div style="width: 100%; height: 75px;">
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-weight: bold; font-size: 24pt; padding-left: 12px; ` + (type == "setup" && `visibility: hidden;`) + `">
                                        <ion-button fill="none" button style="width: 64px; height: 64px;" onClick="window.customFunctions.doLogout()">
                                            <ion-icon slot="icon-only" icon="` + Ionicons.logOutOutline + `" style="font-size: 24pt;"></ion-icon>
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-size: 24pt; font-weight: bold;">
                                        <ion-button fill="none" button style="width: 64px; height: 64px; font-size: 24pt;" onClick="window.customFunctions.inputPINCode('0')">
                                            0
                                        </ion-button>
                                    </div>
                                    <div style="width: 33%; float: left; height: 100%; line-height: 75px; font-weight: bold; font-size: 24pt; padding-left: 7px; ` + (type == "setup" && `visibility: hidden;`) + `">
                                        <ion-button fill="none" button style="width: 64px; height: 64px;" onClick="window.customFunctions.showBiometricAuth()">
                                            <ion-icon slot="icon-only" icon="` + Ionicons.fingerPrintOutline + `" style="font-size: 24pt;"></ion-icon>
                                        </ion-button>
                                    </div>
                                </div>
                            </div>
                        </center>
                    </div>
                </ion-content>
            </div>
        `)

        if(type == "auth"){
            window.customFunctions.showBiometricAuth()
        }

        //this.setupStatusbar("login/register")

        //modal.onDidDismiss().then(() => {
        //    this.setupStatusbar()
        //})

        return true
    }

    window.customFunctions.showBiometricAuth = async () => {
        try{
            var available = await FingerprintAIO.isAvailable()
        }
        catch(e){
            //this.spawnToast(language.get(this.state.lang, "biometricNotAvailable"))

            return console.log(e)
        }

        if(!["finger", "face", "biometric"].includes(available)){
            //return this.spawnToast(language.get(this.state.lang, "biometricNotAvailable"))

            return false
        }

        try{
            var result = await FingerprintAIO.show({
                clientId: "filen",
                clientSecret: "filen",
                disableBackup: true,
                title: language.get(this.state.lang, "biometricTitle"),
                description: language.get(this.state.lang, "biometricDescription"),
                fallbackButtonTitle: language.get(this.state.lang, "biometricUsePIN"),
                cancelButtonTitle: language.get(this.state.lang, "cancel"),
                confirmationRequired: false
            })
        }
        catch(e){
            //this.spawnToast(language.get(this.state.lang, "biometricInvalid"))

            return console.log(e)
        }

        if(typeof result.code !== "undefined"){
            if(result.code == -108){
                //this.spawnToast(language.get(this.state.lang, "biometricCanceled"))

                return false
            }
        }

        if(!["Success", "success", "biometric_success"].includes(result)){
            //this.spawnToast(language.get(this.state.lang, "biometricInvalid"))

            return false
        }

        window.customVariables.biometricAuthShowing = false

        window.$("#biometric-auth-screen").remove()

        return true
    }

    window.customFunctions.checkVersion = async () => {
        if(window.customVariables.updateScreenShowing){
            return false
        }

        try{
            var deviceInfo = await Plugins.Device.getInfo()

            var res = await utils.apiRequest("POST", "/v1/currentVersions", {
                platform: "mobile"
            })
        }
        catch(e){
            return console.log(e)
        }

        if(utils.compareVersions(deviceInfo.appVersion, res.data.mobile) == "update"){
            console.log("update")

            window.customFunctions.showUpdateScreen()
        }
        else{
            console.log("app version ok")
        }

        return true
    }

    window.customFunctions.showUpdateScreen = async () => {
        if(window.customVariables.updateScreenShowing){
            return false
        }

        window.customVariables.updateScreenShowing = true

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "update-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                        <ion-toolbar style="--background: transparent;">
                            <ion-title>
                                ` + language.get(appLang, "updateAvailable") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen>
                        <div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
                            <center>
                                <ion-avatar>
                                    <img src="assets/img/icon.png">
                                </ion-avatar>
                                <br>
                                ` + language.get(appLang, "updateAvailableInfo") + `
                                <br>
                                <br>
                                ` + (Capacitor.platform == "ios" ? `
                                    <ion-button fill="solid" color="primary" onClick="window.open('itms-apps://itunes.apple.com/app/id1549224518')">
                                        ` + language.get(appLang, "updateAvailableAppStore") + `
                                    </ion-button>
                                ` : `
                                    <ion-button fill="solid" color="primary" onClick="window.open('market://details?id=io.filen.app')">
                                        ` + language.get(appLang, "updateAvailableGooglePlay") + `
                                    </ion-button>
                                `) + `
                            </center>
                        </div>
                    </ion-content>
                `;
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: false,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        await modal.present()

        this.setupStatusbar("login/register")

        modal.onDidDismiss().then(() => {
            this.setupStatusbar()
        })

        return true
    }

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

    window.customFunctions.toggleBiometricAuth = () => {
        if(typeof this.state.settings.biometricPINCode !== "undefined"){
            if(this.state.settings.biometricPINCode.length == 4){
                let newSettings = this.state.settings

                newSettings.biometricPINCode = ""

                window.customFunctions.saveSettings(newSettings)

                return this.setState({
                    settings: newSettings
                }, () => {
                    this.forceUpdate()
                })
            }
        }

        return window.customFunctions.showBiometricAuthScreen("setup")
    }

    window.customFunctions.toggleGridMode = () => {
        window.customFunctions.dismissPopover()

        let newSettings = this.state.settings
        let newVal = !newSettings.gridModeEnabled

        newSettings.gridModeEnabled = newVal

        window.customFunctions.saveSettings(newSettings)

        return this.setState({
            settings: newSettings
        }, () => {
            this.forceUpdate()
        })
    }

    window.customFunctions.togglePreviewHeader = (e) => {
        if(typeof e.target == "undefined"){
            return false
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
        try{
            await Plugins.Storage.set({
                key: "itemsCache",
                value: await workers.JSONStringifyWorker(window.customVariables.itemsCache)
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
                value: await workers.JSONStringifyWorker(window.customVariables.offlineSavedFiles)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveGetThumbnailErrors = async () => {
        try{
            await Plugins.Storage.set({
                key: "getThumbnailErrors",
                value: await workers.JSONStringifyWorker(window.customVariables.getThumbnailErrors)
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
                value: await workers.JSONStringifyWorker(window.customVariables.apiCache)
            })
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveThumbnailCache = async (skipLengthCheck = false) => {
        try{
            await Plugins.Storage.set({
                key: "thumbnailCache",
                value: await workers.JSONStringifyWorker(window.customVariables.thumbnailCache)
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        return true
    }

    window.customFunctions.saveCachedItems = async () => {
        try{
            await Plugins.Storage.set({
                key: "cachedFiles",
                value: await workers.JSONStringifyWorker(window.customVariables.cachedFiles)
            })

            await Plugins.Storage.set({
                key: "cachedFolders",
                value: await workers.JSONStringifyWorker(window.customVariables.cachedFolders)
            })

            await Plugins.Storage.set({
                key: "cachedMetadata",
                value: await workers.JSONStringifyWorker(window.customVariables.cachedMetadata)
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

    window.customFunctions.refresherPulled = async () => {
        try{
            await this.updateItemList(false, true, false)

            document.getElementById("refresher").complete()
        }
        catch(e){
            console.log(e)
        }

        return true
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
            var authInfo = await utils.apiRequest("POST", "/v1/auth/info", {
                email
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

        if(!authInfo.status){
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

        let passwordToSend = undefined
        let mKey = undefined
        let salt = authInfo.data.salt
        let authVersion = authInfo.data.authVersion

        try{
            if(authVersion == 1){
                passwordToSend = utils.hashPassword(password)
                mKey = utils.hashFn(password)
            }
            else if(authVersion == 2){
                try{
					let derivedKey = await utils.deriveKeyFromPassword(password, salt, 200000, "SHA-512", 512) //PBKDF2, 200.000 iterations, sha-512, 512 bit key, first half (from left) = master key, second half = auth key

					mKey = derivedKey.substring(0, (derivedKey.length / 2))
			  		passwordToSend = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
			  		passwordToSend = CryptoJS.SHA512(passwordToSend).toString()
				}
				catch(err){
					document.getElementById("login-password").value = ""
                    document.getElementById("login-2fa").value = ""

                    console.log(err)

                    window.customFunctions.dismissLoader()

                    let alert = await alertController.create({
                        header: "",
                        subHeader: "",
                        message: language.get(this.state.lang, "passwordDerivationError"),
                        buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                    })

                    return alert.present()
				}
            }

            var res = await utils.apiRequest("POST", "/v1/login", {
                email,
                password: passwordToSend,
                twoFactorKey,
                authVersion
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
        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify([mKey]) })
        await Plugins.Storage.set({ key: "userAuthVersion", value: authVersion })

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

        if(password.length < 10){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "registerPasswordAtLeast10Chars"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(password !== passwordRepeat){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "registerPasswordsDoNotMatch"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        let loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        let salt = utils.generateRandomString(256)

        try{
            if(this.state.currentAuthVersion == 1){
                password = utils.hashPassword(password)
                passwordRepeat = password
            }
            else if(this.state.currentAuthVersion == 2){
                try{
					let derivedKey = await utils.deriveKeyFromPassword(password, salt, 200000, "SHA-512", 512) //PBKDF2, 200.000 iterations, sha-512, 512 bit key, first half (from left) = master key, second half = auth key

			  		password = derivedKey.substring((derivedKey.length / 2), derivedKey.length)
			  		password = CryptoJS.SHA512(password).toString()
                    passwordRepeat = password
				}
				catch(err){
                    console.log(err)

                    let alert = await alertController.create({
                        header: "",
                        subHeader: "",
                        message: language.get(this.state.lang, "passwordDerivationError"),
                        buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
                    })

                    return alert.present()
				}
            }

            var res = await utils.apiRequest("POST", "/v1/register", {
                email,
                password,
                passwordRepeat,
                salt,
                authVersion: this.state.currentAuthVersion
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

    window.customFunctions.openTermsModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "terms-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: ""
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/terms"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }

        loading.dismiss()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "termsHeader") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="padding: 10px; color: ` + (appDarkMode ? `white` : `black`) + `;" fullscreen>
                        <div style="padding: 15px;">
                            ` + res + `
                        </div>
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openPrivacyModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "privacy-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: ""
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/privacy"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }

        loading.dismiss()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "privacyHeader") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="padding: 10px; color: ` + (appDarkMode ? `white` : `black`) + `;" fullscreen>
                        ` + res + `
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openImprintModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "imprint-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: ""
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/imprint"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
        }

        loading.dismiss()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "imprintHeader") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="padding: 10px; color: ` + (appDarkMode ? `white` : `black`) + `;" fullscreen>
                        ` + res + `
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.sendForgotPassword = async () => {
        if(!document.getElementById('forgot-password-check').checked){
            return window.$("#forgot-password-check-label").fadeOut(150).fadeIn(150).fadeOut(150).fadeIn(150).fadeOut(150).fadeIn(150)
        }

        let email = document.getElementById("forgot-password-email").value

        if(!email){
            document.getElementById("forgot-password-email").value = ""

            let apiAlert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "registerInvalidEmail"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/forgot-password", {
                email
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

            document.getElementById("forgot-password-email").value = ""
    
            let apiAlert = await alertController.create({
                header: "",
                subHeader: "",
                message: res.message,
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        window.customFunctions.dismissLoader()

        document.getElementById("forgot-password-email").value = ""
    
        let apiAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(this.state.lang, "forgotPasswordEmailSendSuccess"),
            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
        })

        return apiAlert.present()
    }

    window.customFunctions.openForgotPasswordModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "forgot-password-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "forgotPasswordHeader") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen>
                        <div style="padding: 5%; padding-top: 0px; padding-bottom: 0px;">
                            <ion-item style="width: 100%; margin-top: 30px;">
                                <ion-input autocapitalize="off" autocomplete="off" type="email" id="forgot-password-email" placeholder="` + language.get(appLang, "emailPlaceholder") + `"></ion-input>
                            </ion-item>
                            <div style="width: 100%; margin-top: 30px;">
                                <ion-checkbox color="secondary" slot="start" id="forgot-password-check"></ion-checkbox>
                                &nbsp;
                                <ion-label id="forgot-password-check-label" onClick="if(document.getElementById('forgot-password-check').checked){ document.getElementById('forgot-password-check').checked = false }else{ document.getElementById('forgot-password-check').checked = true }">` + language.get(appLang, "forgotPasswordInfo") + `</ion-label>
                            </div>
                            <ion-button expand="block" style="width: 100%; margin-top: 25px;" onClick="window.customFunctions.sendForgotPassword()">` + language.get(appLang, "send") + `</ion-button>
                        </div>
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.resendConfirmationEmail = async () => {
        let email = document.getElementById("resend-confirmation-email").value

        if(!email){
            document.getElementById("resend-confirmation-email").value = ""

            let apiAlert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(this.state.lang, "registerInvalidEmail"),
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/confirmation/resend", {
                email
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

            document.getElementById("resend-confirmation-email").value = ""
    
            let apiAlert = await alertController.create({
                header: "",
                subHeader: "",
                message: res.message,
                buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        window.customFunctions.dismissLoader()

        document.getElementById("resend-confirmation-email").value = ""
    
        let apiAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(this.state.lang, "resendConfirmationEmailSuccess"),
            buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
        })

        return apiAlert.present()
    }

    window.customFunctions.openResendConfirmationModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "resend-confirmation-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "resendConfirmationHeader") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen>
                        <div style="padding: 5%; padding-top: 0px; padding-bottom: 0px;">
                            <ion-item style="width: 100%; margin-top: 30px;">
                                <ion-input type="email" autocapitalize="off" autocomplete="off" id="resend-confirmation-email" placeholder="` + language.get(appLang, "emailPlaceholder") + `"></ion-input>
                            </ion-item>
                            <ion-button expand="block" style="width: 100%; margin-top: 25px;" onClick="window.customFunctions.resendConfirmationEmail()">` + language.get(appLang, "resend") + `</ion-button>
                        </div>
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
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
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        if(!this.state.isLoggedIn){
            this.setupStatusbar("modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    this.setupStatusbar()
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openEncryptionModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "encryption-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        this.setupStatusbar("modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                this.setupStatusbar()
            })
        }
        catch(e){
            console.log(e)
        }

        return true
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
                text: language.get(this.state.lang, "tos"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    return window.customFunctions.openTermsModal()
                }
            },
            {
                text: language.get(this.state.lang, "privacyPolicy"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    return window.customFunctions.openPrivacyModal()
                }
            },
            {
                text: language.get(this.state.lang, "cancel"),
                icon: "close",
                role: "cancel"
            }
        ]

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

    window.customFunctions.favoriteSelectedItems = async (value) => {
        window.customFunctions.dismissPopover()

        var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()

        let items = this.state.itemList

        for(let i = 0; i < items.length; i++){
            if(items[i].selected){
                await this.favoriteItem(items[i], value, false)
            }
        }

        loading.dismiss()

        window.customFunctions.unselectAllItems()

        return true
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

        currentLinkUUID = window.$("#save-link-btn").attr("data-currentlinkuuid")

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

        let password = ""

        if(typeof document.getElementById("public-link-password-input").value == "string"){
            if(document.getElementById("public-link-password-input").value.length > 0){
                password = document.getElementById("public-link-password-input").value
            }
        }

        let pass = "empty"
        let passH = "empty"

        if(password.length > 0){
            pass = "notempty"
            passH = password
        }

        let downloadBtn = "enable"

        if(document.getElementById("public-link-enable-download-btn-toggle") !== null){
            if(!document.getElementById("public-link-enable-download-btn-toggle").checked){
                downloadBtn = "disable"
            }
        }

        let salt = utils.generateRandomString(32)
        
        if(item.type == "file"){
            try{
                var res = await utils.apiRequest("POST", "/v1/link/edit", {
                    apiKey: this.state.userAPIKey,
                    uuid: linkUUID,
                    fileUUID: item.uuid,
                    expiration: expires,
                    password: pass,
                    passwordHashed: await utils.deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512),
                    salt,
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

            window.$("#save-link-btn").attr("data-currentlinkuuid", linkUUID)

            if(type == "enable"){
                document.getElementById("enable-public-link-content").style.display = "none"
                document.getElementById("public-link-enabled-content").style.display = "block"
                document.getElementById("public-link-enabled-share").style.display = "block"
            }
            else{
                document.getElementById("enable-public-link-content").style.display = "block"
                document.getElementById("public-link-enabled-content").style.display = "none"
                document.getElementById("public-link-enabled-share").style.display = "none"

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

                let salt = utils.generateRandomString(32)

                try{
                    var res = await utils.apiRequest("POST", "/v1/dir/link/edit", {
                        apiKey: this.state.userAPIKey,
                        uuid: item.uuid,
                        expiration: expires,
                        password: pass,
                        passwordHashed: await utils.deriveKeyFromPassword(passH, salt, 200000, "SHA-512", 512),
                        salt,
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
                let keyEnc = await utils.encryptMetadata(key, this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
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
						itemMetadata = await utils.encryptMetadata(JSON.stringify({
							name: itemToAdd.name,
							mime: itemToAdd.mime,
							key: itemToAdd.key,
							size: parseInt(itemToAdd.size),
                            lastModified: itemToAdd.lastModified
						}), key)
					}
					else{
						itemMetadata = await utils.encryptMetadata(JSON.stringify({
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
						name: await utils.decryptFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}

				for(let i = 0; i < res.data.files.length; i++){
					let file = res.data.files[i]

					await window.customVariables.decryptShareItemSemaphore.acquire()

					let fileMetadata = await utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)

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
                        document.getElementById("public-link-enabled-share").style.display = "block"
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
                    document.getElementById("public-link-enabled-share").style.display = "none"

                    this.updateItemList()
                })
            }

            return true
        }
    }

    window.customFunctions.sharePublicLink = async (name) => {
        if(!Capacitor.isNative){
            return false
        }

        try{
            let link = document.getElementById("public-link-input").value

            await Plugins.Share.share({
                title: name,
                text: name,
                url: link,
                dialogTitle: ""
            })
        }
        catch(e){
            console.log(e)

            return false
        }

        return true
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

                        let dirObj = []

                        if(Capacitor.platform == "ios"){
                            dirObj.push({
                                path: "ThumbnailCache/",
                                directory: FilesystemDirectory.Documents
                            })

                            dirObj.push({
                                path: "FilenThumbnailCache/",
                                directory: FilesystemDirectory.Documents
                            })
                        }
                        else{
                            dirObj.push({
                                path: "ThumbnailCache/",
                                directory: FilesystemDirectory.External
                            })

                            dirObj.push({
                                path: "FilenThumbnailCache/",
                                directory: FilesystemDirectory.External
                            })
                        }

                        try{
                            for(let i = 0; i < dirObj.length; i++){
                                Plugins.Filesystem.rmdir({
                                    path: dirObj[i].path,
                                    directory: dirObj[i].directory,
                                    recursive: true
                                })
                            }
                        }
                        catch(e){
                            console.log(e)
                        }

                        window.customVariables.thumbnailCache = {}
                        window.customVariables.thumbnailBlobCache = {}
                        window.customVariables.lastThumbnailCacheLength = undefined

                        await window.customFunctions.saveThumbnailCache(true)

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
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        return true
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
                        <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                            <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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
                        <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                            <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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
                                    <ion-input autocomplete="off" value="` + window.customVariables.lastSettingsRes.twoFactorKey + `" style="-webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;" disabled></ion-input>
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
            eventsHTML += await utils.renderEventRow(res.data.events[i], this.state.userMasterKeys, appLang)
        }

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        this.setupStatusbar("modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                this.setupStatusbar()
            })
        }
        catch(e){
            console.log(e)
        }

        return true
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
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        return true
    }

    window.customFunctions.openEmailPasswordModal = async () => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "change-email-password-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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
                        <!--<ion-list>
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="off" placeholder="` + language.get(appLang, "changeEmailNewEmail") + `" type="email" id="change-email-email"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="off" placeholder="` + language.get(appLang, "changeEmailNewEmailRepeat") + `" type="email" id="change-email-email-repeat"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="off" placeholder="` + language.get(appLang, "yourCurrentPassword") + `" type="password" id="change-email-password"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    <ion-button expand="block" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.changeEmail()">` + language.get(appLang, "save") + `</ion-button>
                                </ion-label>
                            </ion-item>
                        </ion-list>-->
                        <ion-list>
                            <ion-item lines="none" style="font-size: small; padding: 10px;">
                                ` + language.get(appLang, "changeEmailPasswordInfo") + `
                            </ion-item>
                        </ion-list>
                        <!--<ion-list style="margin-top: 30px;">
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="new-password" placeholder="` + language.get(appLang, "changePasswordNewPassword") + `" type="password" id="change-password-password"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="new-password" placeholder="` + language.get(appLang, "changePasswordNewPasswordRepeat") + `" type="password" id="change-password-password-repeat"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item>
                                <ion-label>
                                    <ion-input autocapitalize="off" autocomplete="new-password" placeholder="` + language.get(appLang, "yourCurrentPassword") + `" type="password" id="change-password-current"></ion-input>
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none" style="font-size: small; padding: 10px;">
                                ` + language.get(appLang, "changePasswordWarning") + `
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    <ion-button expand="block" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.changePassword()">` + language.get(appLang, "save") + `</ion-button>
                                </ion-label>
                            </ion-item>
                        </ion-list>-->
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

        await modal.present()

        this.setupStatusbar("modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                this.setupStatusbar()
            })
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.openVersionsItemPreview = (itemJSON) => {
        let item = JSON.parse(window.atob(itemJSON))

        return this.previewItem(item, undefined, true)
    }

    window.customFunctions.restoreVersionedItem = async (uuid, currentUUID) => {
        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/file/archive/restore", {
                apiKey: this.state.userAPIKey,
                uuid: uuid,
                currentUUID: currentUUID
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

        window.customFunctions.dismissModal()

        this.spawnToast(language.get(this.state.lang, "fileVersionRestored"))

        this.updateItemList(false)

        return true
    }

    window.customFunctions.openVersionHistoryModal = async (item) => {
        if(item.type !== "file"){
            return false
        }

        var loading = await loadingController.create({
            message: ""
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/file/versions", {
                apiKey: this.state.userAPIKey,
                uuid: item.uuid
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

        let versionData = res.data.versions

        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "versions-modal-" + utils.generateRandomClassName()

        let versionsHTML = ""

        for(let i = 0; i < versionData.length; i++){
            let metadata = await utils.decryptFileMetadata(versionData[i].metadata, this.state.userMasterKeys, versionData[i].uuid)
			let uploadDate = (new Date(versionData[i].timestamp * 1000)).toString().split(" ")
            let dateString = uploadDate[1] + ` ` + uploadDate[2] + ` ` + uploadDate[3] + ` ` + uploadDate[4]
            let nameEx = metadata.name.split(".")

            versionsHTML += `
                <ion-item>
                    <ion-label>
                        ` + dateString + `
                    </ion-label>
                    ` + (versionData[i].uuid !== item.uuid ? `
                        ` + (utils.getFilePreviewType(nameEx[nameEx.length - 1], metadata.mime) !== "none" ? `
                            <ion-button onClick="window.customFunctions.openVersionsItemPreview('` + 
                                window.btoa(JSON.stringify({
                                    uuid: versionData[i].uuid,
                                    name: metadata.name,
                                    type: "file",
                                    key: metadata.key,
                                    mime: metadata.mime,
                                    size: parseInt(metadata.size),
                                    timestamp: versionData[i].timestamp,
                                    region: versionData[i].region,
                                    bucket: versionData[i].bucket,
                                    version: versionData[i].version,
                                    chunks: versionData[i].chunks,
                                    rm: versionData[i].rm
                                }))
                            + `')">
                                ` + language.get(appLang, "previewItem") + `
                            </ion-button>
                        ` : ``) + `
                        <ion-button onClick="window.customFunctions.restoreVersionedItem('` + versionData[i].uuid + `', '` + item.uuid + `')">
                            ` + language.get(appLang, "restoreItem") + `
                        </ion-button>
                    ` : `
                        ` + language.get(appLang, "currentFileVersion") + `
                    `) + `
                </ion-item>
            `
        }

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "itemVersions") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list style="margin-top: -7px;">
                            ` + versionsHTML + `
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

        await modal.present()

        this.setupStatusbar("modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                this.setupStatusbar()
            })
        }
        catch(e){
            console.log(e)
        }

        return true
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
                    <ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
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

        await modal.present()

        return true
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

        let newKeys = this.state.userMasterKeys.join("|") + "|" + utils.hashFn(newPassword)

        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify(newKeys.split("|")) })

        this.setState({
            userMasterKeys: newKeys.split("|")
        }, () => {
            window.customVariables.userMasterKeys = newKeys.split("|")

            this.updateUserKeys((err) => {
                if(err){
                    loading.dismiss()
            
                    console.log(res.message)
            
                    return this.spawnToast(language.get(this.state.language, "apiRequestError"))
                }

                loading.dismiss()

                window.customFunctions.logoutUser()

                return this.spawnToast(language.get(this.state.lang, "changePasswordSuccess"))
            })
        })
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

    window.customFunctions.closeTextEditor = async () => {
        let value = document.getElementById("editor-textarea").value

        if(value == window.customVariables.currentTextEditorContent){
            return window.customFunctions.dismissModal()
        }

        let alert = await alertController.create({
            header: language.get(this.state.lang, "textEditorSaveChanges", true, ["__NAME__"], [window.customVariables.currentTextEditorItem.name]),
            buttons: [
                {
                    text: language.get(this.state.lang, "close"),
                    handler: () => {
                        return alert.dismiss()
                    }
                },
                {
                    text: language.get(this.state.lang, "textEditorDontSave"),
                    handler: () => {
                        return window.customFunctions.dismissModal()
                    }
                },
                {
                    text: language.get(this.state.lang, "save"),
                    handler: () => {
                        let file = new Blob([new TextEncoder().encode(value)], {
                            lastModified: new Date(),
                            name: window.customVariables.currentTextEditorItem.name
                        })
                
                        file.name = window.customVariables.currentTextEditorItem.name
                        file.lastModified = new Date()
                        file.editorParent = window.customVariables.currentTextEditorItem.parent

                        Object.defineProperty(file, "type", {
                            writable: true,
                            value: ""
                        })

                        this.queueFileUpload(file)

                        return window.customFunctions.dismissModal()
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.saveTextEditor = () => {
        let value = document.getElementById("editor-textarea").value

        if(value == ""){
            return window.customFunctions.dismissModal()
        }

        if(value == window.customVariables.currentTextEditorContent){
            return window.customFunctions.dismissModal()
        }

        let file = new Blob([new TextEncoder().encode(value)], {
            lastModified: new Date(),
            name: window.customVariables.currentTextEditorItem.name
        })

        file.name = window.customVariables.currentTextEditorItem.name
        file.lastModified = new Date()
        file.editorParent = window.customVariables.currentTextEditorItem.parent

        Object.defineProperty(file, "type", {
            writable: true,
            value: ""
        })

        this.queueFileUpload(file)

        return window.customFunctions.dismissModal()
    }

    window.customFunctions.openTextEditor = async (item, content = "") => {
        let appLang = this.state.lang
        let appDarkMode = this.state.darkMode
        let modalId = "editor-modal-" + utils.generateRandomClassName()

        window.customVariables.currentTextEditorContent = content
        window.customVariables.currentTextEditorItem = item

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.closeTextEditor()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + item.name + `
                            </ion-title>
                            <ion-buttons slot="end">
                                <ion-button onClick="window.customFunctions.saveTextEditor()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.saveOutline + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content fullscreen>
                        <textarea id="editor-textarea" style="width: 100vw; height: 100%; border: none; border-radius: 0px; background-color: transparent; color: ` + (appDarkMode ? `white` : `black`) + `; outline: none; padding-top: 5px;">` + content + `</textarea>
                    </ion-content>
                `;
            }
        })

        let modal = await modalController.create({
            component: modalId,
            swipeToClose: false,
            showBackdrop: false,
            backdropDismiss: false,
            cssClass: "modal-fullscreen"
        })

        await modal.present()

        this.setupStatusbar("login/register")

        modal.onDidDismiss().then(() => {
            this.setupStatusbar()
        })

        utils.moveCursorToStart("editor-textarea")

        document.getElementById("editor-textarea").focus()

        return true
    }

    window.customFunctions.deleteSelectedItemsPermanently = async () => {
        let items = await this.getSelectedItems()

        window.customFunctions.dismissPopover()
        window.customFunctions.unselectAllItems()

        let alert = await alertController.create({
            header: language.get(this.state.lang, "deletePermanently"),
            message: language.get(this.state.lang, "deletePermanentlyConfirmationMultiple", true, ["__COUNT__"], [items.length]),
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
                            message: "",
                            backdropDismiss: false
                        })

                        let deletedUUIDs = []
                
                        loading.present()
            
                        for(let i = 0; i < items.length; i++){
                            let errored = false

                            try{
                                if(items[i].type == "file"){
                                    var res = await utils.apiRequest("POST", "/v1/file/delete/permanent", {
                                        apiKey: window.customVariables.apiKey,
                                        uuid: items[i].uuid
                                    })
                                }
                                else{
                                    var res = await utils.apiRequest("POST", "/v1/dir/delete/permanent", {
                                        apiKey: window.customVariables.apiKey,
                                        uuid: items[i].uuid
                                    })
                                }
                            }
                            catch(e){
                                console.log(e)

                                errored = true
                            }
                        
                            if(!res.status){
                                console.log(res.message)

                                errored = true
                            }

                            if(!errored){
                                deletedUUIDs.push(items[i].uuid)
                            }
                        }

                        loading.dismiss()

                        let itemList = []

                        for(let i = 0; i < this.state.itemList.length; i++){
                            if(!deletedUUIDs.includes(this.state.itemList[i].uuid)){
                                itemList.push(this.state.itemList[i])
                            }
                        }

                        this.setState({
                            itemList: itemList
                        }, () => {
                            this.forceUpdate()
                        })
            
                        return this.spawnToast(language.get(this.state.lang, "itemsDeletedPermanently", true, ["__COUNT__"], [deletedUUIDs.length]))
                    }
                }
            ]
        })
    
        return alert.present()
    }
}