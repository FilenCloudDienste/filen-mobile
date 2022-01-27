import { Capacitor } from "@capacitor/core"
import { modalController, popoverController, toastController, menuController, alertController, loadingController, actionSheetController } from "@ionic/core"
import * as language from "../utils/language"
import * as Ionicons from "ionicons/icons"
import { isPlatform } from "@ionic/react"
import { FingerprintAIO } from "@ionic-native/fingerprint-aio"
import { FileOpener } from "@ionic-native/file-opener"
import { Network } from "@capacitor/network"
import { Keyboard } from "@capacitor/keyboard"
import { Haptics, HapticsImpactStyle } from "@capacitor/haptics"
import { Clipboard } from "@capacitor/clipboard"
import { App } from "@capacitor/app"
import { Share } from "@capacitor/share"
import { SplashScreen } from "@capacitor/splash-screen"
import { SendIntent } from "send-intent"
import { Media } from "@capacitor-community/media"
import { Base64 } from "js-base64"
import * as storage from "./storage"
import { queueFileUpload, fileExists } from "./upload"
import { updateItemList, previewItem, spawnItemActionSheet, moveSelectedItems, trashSelectedItems, restoreSelectedItems, getSelectedItems, removeSelectedItemsFromSharedIn, stopSharingSelectedItems, downloadSelectedItems, shareSelectedItems, storeSelectedItemsOffline, favoriteItem } from "./items";
import { updateUserUsage } from "./user"
import { setupStatusbar } from "./setup"
import { openSettingsModal } from "./settings"
import { spawnToast } from "./spawn"
import { showRegister } from "./register"

const workers = require("../utils/workers")
const utils = require("../utils/utils")
const safeAreaInsets = require("safe-area-insets")
const CryptoJS = require("crypto-js")
const mime = require("mime-types")

export async function doRouting(self){
    if(window.customVariables.isCurrentlyRouting){
        return false
    }

    window.customVariables.isCurrentlyRouting = true

    let doRouting = false

    if(window.currentHref !== window.location.href){
        doRouting = true
    }

    if(!window.customVariables.didFirstLoad){
        window.customVariables.didFirstLoad = true

        doRouting = true
    }

    if(doRouting){
        window.currentHref = window.location.href

        self.setState({
            currentHref: window.currentHref
        })

        window.customVariables.backButtonPresses = 0
        window.customVariables.gettingThumbnails = {}

        let routeEx = window.location.hash.split("/")

        if(self.state.isLoggedIn){
            if(routeEx[1] == "base" || routeEx[1] == "shared-in" || routeEx[1] == "shared-out" || routeEx[1] == "trash" || routeEx[1] == "links" || routeEx[1] == "recent" || routeEx[1] == "favorites"){
                await updateItemList(self)

                let foldersInRoute = routeEx.slice(2)

                if(foldersInRoute.length > 0){
                    let lastFolderInRoute = foldersInRoute[foldersInRoute.length - 1]

                    if(window.customVariables.cachedFolders[lastFolderInRoute]){
                        self.setState({
                            mainToolbarTitle: window.customVariables.cachedFolders[lastFolderInRoute].name,
                            showMainToolbarBackButton: true
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else{
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "cloudDrives"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                }
                else{
                    if(routeEx[1] == "shared-in"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "sharedInTitle"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "shared-out"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "sharedOutTitle"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "trash"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "trashTitle"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "links"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "linksTitle"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "recent"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "recent"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "events"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "events"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else if(routeEx[1] == "favorites"){
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "favorites"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                    else{
                        self.setState({
                            mainToolbarTitle: language.get(self.state.lang, "cloudDrives"),
                            showMainToolbarBackButton: false
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                }
            }
        }
    }

    window.customVariables.isCurrentlyRouting = false

    return true
}

export function windowRouter(self){
    window.onhashchange = () => {
        if(typeof self !== "object"){
            return false
        }

        return doRouting(self)
    }
}

export function setupWindowFunctions(self){
    window.$ = undefined

    /*let hacktimerScript = document.createElement("script")

    hacktimerScript.type = "text/javascript"
    hacktimerScript.src = "assets/hacktimer/HackTimer.js"

    document.getElementsByTagName("head")[0].appendChild(hacktimerScript)*/

    let jQueryScript = document.createElement("script")

    jQueryScript.type = "text/javascript"
    jQueryScript.src = "assets/jquery.js"

    document.getElementsByTagName("head")[0].appendChild(jQueryScript)

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
    window.customVariables.lang = self.state.lang
    window.customVariables.cachedFolders = {}
    window.customVariables.cachedFiles = {}
    window.customVariables.cachedMetadata = {}
    window.customVariables.keyUpdateInterval = undefined
    window.customVariables.usageUpdateInterval = undefined
    window.customVariables.apiKey = ""
    window.customVariables.uploadSemaphore = new utils.Semaphore(1)
    window.customVariables.uploadChunkSemaphore = new utils.Semaphore(8)
    window.customVariables.downloadSemaphore = new utils.Semaphore(1)
    window.customVariables.downloadChunkSemaphore = new utils.Semaphore(20)
    window.customVariables.shareItemSemaphore = new utils.Semaphore(32)
    window.customVariables.decryptShareItemSemaphore = new utils.Semaphore(256)
    window.customVariables.writeSemaphore = new utils.Semaphore(64)
    window.customVariables.transfersSemaphore = new utils.Semaphore(1)
    window.customVariables.blobWriterSemaphore = new utils.Semaphore(1024)
    window.customVariables.currentUploadThreads = 0
    window.customVariables.maxUploadThreads = 8
    window.customVariables.maxDownloadThreads = 20
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
    window.customVariables.thumbnailSemaphore = new utils.Semaphore(2)
    window.customVariables.getFileThumbnailSemaphore = new utils.Semaphore(2)
    window.customVariables.updateItemsSemaphore = new utils.Semaphore(1)
    window.customVariables.fsCopySemaphore = new utils.Semaphore(1)
    window.customVariables.cameraUploadSemaphore = new utils.Semaphore(1)
    window.customVariables.cameraUploadUploadSemaphore = new utils.Semaphore(1)
    window.customVariables.getNetworkInfoInterval = undefined
    window.customVariables.networkStatus = {
        connected: true,
        connectionType: "wifi"
    }
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
    window.customVariables.currentFileVersion = self.state.currentFileVersion
    window.customVariables.currentAuthVersion = self.state.currentAuthVersion
    window.customVariables.currentMetadataVersion = self.state.currentMetadataVersion
    window.customFunctions.workers = workers
    window.customVariables.updateScreenShowing = false
    window.customVariables.currentPINCode = ""
    window.customVariables.confirmPINCode = ""
    window.customFunctions.isPlatform = isPlatform
    window.customFunctions.safeAreaInsets = safeAreaInsets
    window.customVariables.currentBiometricModalType = "auth"
    window.customVariables.nextBiometricAuth = 0
    window.customVariables.biometricAuthShowing = false
    window.customVariables.biometricAuthTimeout = 900
    window.customVariables.currentTextEditorContent = ""
    window.customVariables.currentTextEditorItem = {}
    window.customVariables.cachedUserInfo = undefined
    window.customVariables.imagePreviewZoomedIn = false
    window.customVariables.galleryUploadEnabled = false
    window.customVariables.backButtonPresses = 0
    window.customVariables.navigateBackTimeout = 0
    window.customVariables.appUrlOpenReceivedURLs = {}
    window.customVariables.listenersAdded = false
    window.customVariables.didFirstLoad = false
    window.customVariables.isCurrentlyRouting = false
    window.customVariables.saveSettingsDebounce = undefined
    window.customVariables.cameraUpload = {
        uploadedIds: {},
        cachedIds: [],
        blockedIds: {},
        lastCheck: 0
    }
    window.customVariables.cameraUploadRunning = false
    window.customVariables.cameraUploadEnabled = false
    window.customVariables.updateCameraUploadModalInterval = undefined
    window.customVariables.isAppActive = true
    window.customVariables.gettingThumbnails = {}
    window.customVariables.requestFolderSizesTimeout = {}
    window.customVariables.thumbnailsInView = {}
    window.customVariables.debounceIds = {}
    window.customVariables.didRequestThumbnail = {}
    window.customVariables.cameraUploadFetchNewItemsTimeout = Math.floor((+new Date()) / 1000)

    window.customFunctions.checkForSendIntent = () => {
        if(!isPlatform("android")){
            return false
        }

        SendIntent.checkSendIntentReceived().then((result) => {
            if(result){
                setTimeout(() => {
                    window.customFunctions.fileSendIntentReceived(result, "android")
                }, 500)
            }

            return true
        }).catch((err) => {
            return console.log(err)
        })
    }

    window.customFunctions.setupCameraUpload = async (enable = true) => {
        await new Promise((resolve) => {
            let wait = setInterval(() => {
                if(self.state.isLoggedIn && self.state.isDeviceOnline && window.customVariables.isDocumentReady){
                    clearInterval(wait)

                    return setTimeout(resolve, 5000)
                }
            }, 1000)
        })

        if(enable){
            /*if(!self.state.settings.cameraUpload.enabled){
                window.customVariables.cameraUploadEnabled = false
    
                return false
            }

            if(typeof self.state.settings.cameraUpload.parent !== "string"){
                window.customVariables.cameraUploadEnabled = false
    
                return false
            }

            if(window.customVariables.cameraUploadEnabled){
                return false
            }*/

            window.customVariables.cameraUploadEnabled = true

            return true
        }
        else{
            window.customVariables.cameraUploadEnabled = false

            return true
        }
    }

    window.customFunctions.doCameraUpload = async () => {
        await window.customVariables.cameraUploadSemaphore.acquire()

        if(!self.state.isLoggedIn){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if(!self.state.isDeviceOnline){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if(!window.customVariables.isDocumentReady){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if(Capacitor.isNative){
            if(self.state.settings.onlyWifiUploads){
                let networkStatus = self.state.networkStatus
    
                if(networkStatus.connectionType !== "wifi"){
                    window.customVariables.cameraUploadRunning = false

                    window.customVariables.cameraUploadSemaphore.release()

                    return setTimeout(() => {
                        window.customFunctions.doCameraUpload()
                    }, 1000)
                }
            }
        }

        if(!self.state.settings.cameraUpload.enabled){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if(typeof self.state.settings.cameraUpload.parent !== "string"){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if(!window.customVariables.cameraUploadEnabled){
            window.customVariables.cameraUploadRunning = false

            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        if((window.customVariables.cameraUpload.lastCheck + 1000) > (+new Date())){
            window.customVariables.cameraUploadSemaphore.release()

            return setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        }

        window.customVariables.cameraUpload.lastCheck = (+new Date())
        window.customVariables.cameraUploadRunning = true

        let parent = self.state.settings.cameraUpload.parent

        if(Math.floor((+new Date()) / 1000) > window.customVariables.cameraUploadFetchNewItemsTimeout){
            try{
                var dataTotal = await Media.getMedias({
                    type: "total",
                    includeHidden: (self.state.settings.cameraUpload.hidden ? 1 : 0),
                    includeBurst: (self.state.settings.cameraUpload.burst ? 1 : 0),
                    iTunesSynced: (self.state.settings.cameraUpload.icloud ? 1 : 0),
                    cloudShared: (self.state.settings.cameraUpload.shared ? 1 : 0),
                    convertHeic: (self.state.settings.cameraUpload.convertHeic ? 1 : 0)
                })
            }
            catch(e){
                console.log(e)
    
                window.customVariables.cameraUploadSemaphore.release()
    
                return setTimeout(() => {
                    window.customFunctions.doCameraUpload()
                }, 1000)
            }

            window.customVariables.cameraUploadFetchNewItemsTimeout = (Math.floor((+new Date()) / 1000) + 60)
    
            if(dataTotal.total > window.customVariables.cameraUpload.cachedIds.length){
                try{
                    var dataAll = await Media.getMedias({
                        type: "all",
                        includeHidden: (self.state.settings.cameraUpload.hidden ? 1 : 0),
                        includeBurst: (self.state.settings.cameraUpload.burst ? 1 : 0),
                        iTunesSynced: (self.state.settings.cameraUpload.icloud ? 1 : 0),
                        cloudShared: (self.state.settings.cameraUpload.shared ? 1 : 0),
                        convertHeic: (self.state.settings.cameraUpload.convertHeic ? 1 : 0)
                    })
                }
                catch(e){
                    console.log(e)
        
                    window.customVariables.cameraUploadSemaphore.release()
        
                    return setTimeout(() => {
                        window.customFunctions.doCameraUpload()
                    }, 1000)
                }
    
                window.customVariables.cameraUpload.cachedIds = []
    
                for(let i = 0; i < dataAll.medias.length; i++){
                    window.customVariables.cameraUpload.cachedIds.push(dataAll.medias[i].id)
                }
            }
        }

        let max = 1
        let current = 0
        let fileObjects = []

        for(let i = 0; i < window.customVariables.cameraUpload.cachedIds.length; i++){
            let id = window.customVariables.cameraUpload.cachedIds[i]

            if(typeof id == "string" && typeof window.customVariables.cameraUpload.uploadedIds[id] == "undefined" && typeof window.customVariables.cameraUpload.blockedIds[id] == "undefined" && max > current){
                current += 1
                
                try{
                    var data = await Media.getMedias({
                        type: "id",
                        id: id,
                        includeHidden: (self.state.settings.cameraUpload.hidden ? 1 : 0),
                        includeBurst: (self.state.settings.cameraUpload.burst ? 1 : 0),
                        iTunesSynced: (self.state.settings.cameraUpload.icloud ? 1 : 0),
                        cloudShared: (self.state.settings.cameraUpload.shared ? 1 : 0),
                        convertHeic: (self.state.settings.cameraUpload.convertHeic ? 1 : 0)
                    })
                }
                catch(e){
                    console.log(e)
        
                    window.customVariables.cameraUploadSemaphore.release()
        
                    return setTimeout(() => {
                        window.customFunctions.doCameraUpload()
                    }, 1000)
                }

                if(data.medias.length > 0){
                    let index = data.medias[0].index
                    let url = data.medias[0].url
                    
                    if(url && typeof url == "string" && url.length > 4){
                        let heicURL = data.medias[0].heicURL || undefined
                        let realURL = url

                        if(url.indexOf("file://") == -1){
                            url = "file://" + url
                        }

                        let mimeType = mime.lookup(url.replace("file://", ""))
                        let mimeTypeCheckPassed = false

                        if(self.state.settings.cameraUpload.photos && mimeType.indexOf("image/") !== -1){
                            mimeTypeCheckPassed = true
                        }

                        if(self.state.settings.cameraUpload.videos && mimeType.indexOf("video/") !== -1){
                            mimeTypeCheckPassed = true
                        }

                        if(typeof mimeType == "string"){
                            if(mimeType.indexOf("/") !== -1){
                                if(self.state.settings.cameraUpload.photos && self.state.settings.cameraUpload.videos){
                                    if(mimeType.indexOf("image/") !== -1 || mimeType.indexOf("video/") !== -1){
                                        mimeTypeCheckPassed = true
                                    }
                                }

                                if(!self.state.settings.cameraUpload.photos && self.state.settings.cameraUpload.videos){
                                    if(mimeType.indexOf("video/") !== -1){
                                        mimeTypeCheckPassed = true
                                    }
                                }

                                if(self.state.settings.cameraUpload.photos && !self.state.settings.cameraUpload.videos){
                                    if(mimeType.indexOf("image/") !== -1){
                                        mimeTypeCheckPassed = true
                                    }
                                }

                                if(!self.state.settings.cameraUpload.photos && !self.state.settings.cameraUpload.videos){
                                    mimeTypeCheckPassed = false
                                }
                            }
                        }

                        if(mimeTypeCheckPassed){
                            try{
                                let fileObj = await new Promise((resolve, reject) => {
                                    let tempName = "UPLOAD_" + utils.uuidv4()
                                    let fileObject = {}
        
                                    fileObject.tempName = tempName
                                    fileObject.editorParent = parent
        
                                    window.resolveLocalFileSystemURL(url, (resolved) => {
                                        if(resolved.isFile){
                                            resolved.file((resolvedFile) => {
                                                fileObject.name = resolvedFile.name
                                                fileObject.lastModified = Math.floor(resolvedFile.lastModified) || Math.floor((+new Date()))
                                                fileObject.size = resolvedFile.size
                                                fileObject.type = resolvedFile.type
                                                fileObject.fileEntry = resolvedFile
                                                fileObject.tempFileEntry = undefined

                                                if(fileObject.name.indexOf(".") !== -1){
                                                    let ex = fileObject.name.split(".")
                                                    let ext = ex.pop()
                                                    let without = ex.join(".")
                                                    let title = (without + "_" + Math.floor(fileObject.lastModified / 1000) + "." + ext).trim()
                                                    
                                                    fileObject.name = title
                                                }
        
                                                return resolve(fileObject)
                                            }, (err) => {
                                                return reject(err)
                                            })
                                        }
                                        else{
                                            return reject("selected path is not a file")
                                        }
                                    }, (err) => {
                                        return reject(err)
                                    })
                                })
        
                                fileObjects.push({
                                    file: fileObj,
                                    id,
                                    index,
                                    url,
                                    heicURL
                                })
                            }
                            catch(e){
                                console.log(e)
                            }
                        }
                        else{
                            window.customVariables.cameraUpload.blockedIds[id] = true
                            current -= 1
                        }
                    }
                    else{
                        window.customVariables.cameraUpload.blockedIds[id] = true
                        current -= 1
                    }
                }
            }
        }

        await new Promise((topResolve) => {
            if(fileObjects.length == 0){
                return topResolve()
            }

            let done = 0
            
            for(let i = 0; i < fileObjects.length; i++){
                if(typeof fileObjects[i].file !== "undefined"){
                    new Promise((resolve, reject) => {
                        if(!self.state.settings.cameraUpload.enabled || !window.customVariables.cameraUploadEnabled){
                            return reject("stopped")
                        }

                        fileExists(self, fileObjects[i].file.name, fileObjects[i].file.editorParent, async (err, exists) => {
                            if(err){
                                return reject(err)
                            }

                            if(exists){
                                await window.customVariables.cameraUploadUploadSemaphore.acquire()
    
                                window.customVariables.cameraUpload.uploadedIds[fileObjects[i].id] = true
    
                                await window.customFunctions.saveCameraUpload()
    
                                window.customVariables.cameraUploadUploadSemaphore.release()

                                return resolve()
                            }

                            queueFileUpload(self, fileObjects[i].file, undefined, async (err) => {
                                if(err){
                                    console.log(err)

                                    try{
                                        if(err.toString().indexOf("Parent folder is in the trash") !== -1){
                                            let newSettings = self.state.settings

                                            newSettings.cameraUpload.parent = ""
                                            newSettings.cameraUpload.parentName = ""
                                            newSettings.cameraUpload.enabled = false

                                            await window.customFunctions.saveSettings(newSettings)

                                            if(document.getElementById("camera-upload-enabled-toggle") !== null){
                                                document.getElementById("camera-upload-enabled-toggle").checked = false
                                            }

                                            window.customFunctions.setupCameraUpload(false)
                                        }
                                    }
                                    catch{}

                                    await window.customFunctions.saveCameraUpload()

                                    return resolve()
                                }
    
                                await window.customVariables.cameraUploadUploadSemaphore.acquire()
    
                                window.customVariables.cameraUpload.uploadedIds[fileObjects[i].id] = true
    
                                await window.customFunctions.saveCameraUpload()
    
                                window.customVariables.cameraUploadUploadSemaphore.release()
    
                                if(typeof fileObjects[i].heicURL !== "undefined"){
                                    window.resolveLocalFileSystemURL(fileObjects[i].url, (resolved) => {
                                        if(resolved.isFile){
                                            resolved.getParent((parent) => {
                                                if(parent.isDirectory){
                                                    if(typeof parent.removeRecursively == "function"){
                                                        parent.removeRecursively(() => {
                                                            return resolve()
                                                        }, (err) => {
                                                            console.log(err)
    
                                                            return resolve()
                                                        })
                                                    }
                                                    else if(typeof parent.remove == "function"){
                                                        parent.remove(() => {
                                                            return resolve()
                                                        }, (err) => {
                                                            console.log(err)
    
                                                            return resolve()
                                                        })
                                                    }
                                                    else{
                                                        return resolve()
                                                    }
                                                }
                                                else{
                                                    return resolve()
                                                }
                                            }, (err) => {
                                                console.log(err)
    
                                                return resolve()
                                            })
                                        }
                                        else{
                                            return resolve()
                                        }
                                    }, (err) => {
                                        console.log(err)
    
                                        return resolve()
                                    })
                                }
                                else{
                                    return resolve()
                                }
                            })
                        })
                    }).then(() => {
                        done += 1

                        if(done >= fileObjects.length){
                            return topResolve()
                        }
                    })
                }
                else{
                    done += 1
                }
            }
        })

        window.customVariables.cameraUploadSemaphore.release()

        return setTimeout(() => {
            window.customFunctions.doCameraUpload()
        }, 100)
    }

    if(!window.customVariables.listenersAdded){
        window.customVariables.listenersAdded = true

        Network.addListener("networkStatusChange", (status) => {
            let old = window.customVariables.networkStatus
    
            window.customVariables.networkStatus = status
    
            if(old.connected !== window.customVariables.networkStatus.connected){
                self.setState({
                    networkStatus: window.customVariables.networkStatus,
                    isDeviceOnline: window.customVariables.networkStatus.connected
                }, () => {
                    self.forceUpdate()
                })
            }
        })

        App.addListener("appUrlOpen", async (data) => {
            if(!isPlatform("ios")){
                return false
            }
    
            if(!self.state.isLoggedIn){
                return false
            }

            if(typeof data == "undefined"){
                return false
            }

            if(typeof data.url !== "string"){
                return false
            }

            if(data.url.indexOf("url=") == -1){
                return false
            }
    
            await new Promise((resolve) => {
                let wait = setInterval(() => {
                    if(window.customVariables.isDocumentReady){
                        clearInterval(wait)
    
                        return resolve()
                    }
                }, 10)
            })
    
            if(typeof window.customVariables.appUrlOpenReceivedURLs[data.url] !== "undefined"){
                if(window.customVariables.appUrlOpenReceivedURLs[data.url] > (+new Date())){
                    return false
                }
            }
    
            window.customVariables.appUrlOpenReceivedURLs[data.url] = ((+new Date()) + 3000)
    
            return setTimeout(() => {
                window.customFunctions.fileSendIntentReceived(data.url, "ios")
            }, 250)
        })
    
        App.addListener("backButton", async (e) => {
            if(isPlatform("ios")){
                return false
            }
    
            let modalOpen = await window.customFunctions.isAModalOpen()
    
            if(["#!/base", "#!/shared-in", "#!/shared-out", "#!/favorites", "#!/links"].includes(window.location.hash)){
                if(!modalOpen){
                    if(window.customVariables.backButtonPresses >= 1){
                        window.customVariables.backButtonPresses = 0
    
                        try{
                            App.exitApp()
                        }
                        catch(e){
                            return console.log(e)
                        }
                    }
                    else{
                        window.customVariables.backButtonPresses += 1
    
                        spawnToast(language.get(self.state.lang, "closeAppPress"))
                    }
                }
            }
        })
    
        App.addListener("appStateChange", (appState) => {
            if(appState.isActive){
                window.customFunctions.checkVersion()
                window.customFunctions.triggerBiometricAuth()
                window.customFunctions.isIndexEmpty()

                window.customVariables.isAppActive = true
            }
            else{
                window.customVariables.isAppActive = false
            }

            window.customFunctions.setupCameraUpload(true)

            setTimeout(() => {
                window.customFunctions.doCameraUpload()
            }, 1000)
        })
    
        window.addEventListener("load", () => {
            window.customVariables.isDocumentReady = true

            window.screen.orientation.lock("portrait")
        })

        window.addEventListener("sendIntentReceived", () => {
            window.customFunctions.checkForSendIntent()
        })

        window.customFunctions.checkForSendIntent()
        window.customFunctions.setupCameraUpload(true)
    }

    clearInterval(window.customVariables.mainSearchbarInterval)

    window.customFunctions.isIndexEmpty = () => {
        return false

        setTimeout(async () => {
            if(["#!/base", "#!/shared-in", "#!/shared-out", "#!/favorites", "#!/links"].includes(window.location.hash)){
                if(self.state.itemList.length == 0){
                    await updateItemList(self)
                }
            }
        }, 500)
    }

    window.customFunctions.fileSendIntentReceived = async (url, type) => {
        let fileObjects = []

        if(type == "ios"){
            let urlEx = url.split("?")
            let parts = urlEx[1].split("&")

            let params = {
                urls: []
            }

            for(let i = 0; i < parts.length; i++){
                let ex = parts[i].split("=")
                
                if(ex[0] == "url"){
                    params.urls.push(decodeURIComponent(ex[1]))
                }
            }

            for(let i = 0; i < params.urls.length; i++){
                try{
                    let fileObj = await new Promise((resolve, reject) => {
                        let tempName = "UPLOAD_" + utils.uuidv4()
                        let fileObject = {}

                        fileObject.tempName = tempName

                        window.resolveLocalFileSystemURL(params.urls[i], (resolved) => {
                            if(resolved.isFile){
                                resolved.file((resolvedFile) => {
                                    fileObject.name = resolvedFile.name
                                    fileObject.lastModified = Math.floor(resolvedFile.lastModified) || Math.floor((+new Date()))
                                    fileObject.size = resolvedFile.size
                                    fileObject.type = resolvedFile.type
                                    fileObject.fileEntry = resolvedFile
                                    fileObject.tempFileEntry = undefined

                                    return resolve(fileObject)
                                }, (err) => {
                                    return reject(err)
                                })
                            }
                            else{
                                return reject(params.urls[i] + " path is not a file")
                            }
                        }, (err) => {
                            return reject(err)
                        })
                    })

                    fileObjects.push(fileObj)
                }
                catch(e){
                    console.log(e)
                }
            }
        }
        else{
            let items = []

            items.push({
                title: decodeURIComponent(url.title) || utils.uuidv4(),
                url: url.url
            })

            if(typeof url.additionalItems == "object"){
                for(let i = 0; i < url.additionalItems.length; i++){
                    items.push({
                        title: decodeURIComponent(url.additionalItems[i].title) || utils.uuidv4(),
                        url: url.additionalItems[i].url
                    })
                }
            }

            for(let i = 0; i < items.length; i++){
                try{
                    let fileObj = await new Promise((resolve, reject) => {
                        let tempName = "UPLOAD_" + utils.uuidv4()
                        let fileObject = {}

                        fileObject.tempName = tempName

                        window.resolveLocalFileSystemURL(items[i].url, (resolved) => {
                            if(resolved.isFile){
                                resolved.file((resolvedFile) => {
                                    fileObject.name = items[i].title
                                    fileObject.lastModified = Math.floor((+new Date()))
                                    fileObject.size = resolvedFile.size
                                    fileObject.type = resolvedFile.type
                                    fileObject.fileEntry = resolvedFile
                                    fileObject.tempFileEntry = undefined

                                    return resolve(fileObject)
                                }, (err) => {
                                    return reject(err)
                                })
                            }
                            else{
                                return reject(items[i].url + " path is not a file")
                            }
                        }, (err) => {
                            return reject(err)
                        })
                    })

                    fileObjects.push(fileObj)
                }
                catch(e){
                    console.log(e)
                }
            }
        }

        let toast = await toastController.create({
            message: language.get(self.state.lang, "selectDestination"),
            animated: false,
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "uploadHere"),
                    handler: async () => {
                        let fileParent = utils.currentParentFolder()

                        if(fileParent.length <= 32){
                            return false
                        }

                        for(let i = 0; i < fileObjects.length; i++){
                            queueFileUpload(self, fileObjects[i])
                        }

                        return true
                    }
                }
            ]
        })
    
        return toast.present()
    }

    window.customFunctions.isAModalOpen = async () => {
        let modalOpen = false
        
        try{
            let topModal = await modalController.getTop()

            if(typeof topModal !== "undefined"){
                modalOpen = true
            }
        }
        catch(e){
            modalOpen = false
        }

        try{
            let topModal = await popoverController.getTop()

            if(typeof topModal !== "undefined"){
                modalOpen = true
            }
        }
        catch(e){
            modalOpen = false
        }

        try{
            let topModal = await actionSheetController.getTop()

            if(typeof topModal !== "undefined"){
                modalOpen = true
            }
        }
        catch(e){
            modalOpen = false
        }

        return modalOpen
    }

    window.customFunctions.itemListScrolling = () => {
        if(document.getElementById("main-virtual-list") !== null){
            let scrollTop = Math.floor(document.getElementById("main-virtual-list").scrollTop)

            /*if(scrollTop == 0){
                self.setState({
                    refresherEnabled: true
                })
            }
            else{
                self.setState({
                    refresherEnabled: false
                })
            }*/

            let diff = Math.floor(Math.floor(document.getElementById("main-virtual-list").scrollHeight - document.getElementById("main-virtual-list").offsetHeight) - Math.floor(scrollTop))

            if(scrollTop > 0 && diff <= 50){
                self.setState({
                    hideMainFab: true
                })
            }
            else{
                self.setState({
                    hideMainFab: false
                })
            }
        }
        else{
            self.setState({
                hideMainFab: false
            })
        }
    }

    window.customFunctions.updateHeightAndWidthState = () => {
        if(self.state.windowHeight == window.innerHeight && self.state.windowWidth == window.innerWidth){
            return false
        }

        let gridItemWidth = (window.innerWidth / 2) - 25
        let gridItemHeight = (window.innerHeight / 5)

        if(gridItemHeight < gridItemWidth){
            gridItemHeight = gridItemWidth
        }

        return self.setState({
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth,
            gridItemWidth: gridItemWidth,
            gridItemHeight: gridItemHeight
        }, () => {
            return self.forceUpdate()
        })
    }

    window.addEventListener("orientationchange", () => {
        return window.customFunctions.updateHeightAndWidthState()
    }, false)

    window.addEventListener("resize", () => {
        return window.customFunctions.updateHeightAndWidthState()
    }, false)

    document.addEventListener("resize", () => {
        return window.customFunctions.updateHeightAndWidthState()
    }, false)

    setInterval(() => {
        return window.customFunctions.updateHeightAndWidthState()
    }, 100)

    document.onclick = (e) => {
        return window.customFunctions.togglePreviewHeader(e)
    }

    window.customFunctions.fetchUserInfo = async () => {
        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
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

            spawnToast(language.get(self.state.lang, "apiRequestError"))

            return false
        }

        if(!res.status){
            console.log(res.message)

            loading.dismiss()

            spawnToast(res.message)

            return false
        }

        loading.dismiss()

        window.customVariables.cachedUserInfo = res.data

        self.setState({
            cachedUserInfo: res.data
        }, () => {
            self.forceUpdate()
        })

        return true
    }

    window.customFunctions.triggerBiometricAuth = () => {
        if(typeof self.state.settings.biometricPINCode == "undefined"){
            return false
        }

        if(self.state.settings.biometricPINCode.length !== 4){
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
            Haptics.impact(HapticsImpactStyle.Light)

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

        if(window.customVariables.currentBiometricModalType == "auth" && typeof self.state.settings.biometricPINCode !== "undefined"){
            window.customVariables.currentPINCode = window.customVariables.currentPINCode + "" + number

            paintDots(window.customVariables.currentPINCode.length)

            if(window.customVariables.currentPINCode.length >= 4){
                if(window.customVariables.currentPINCode !== self.state.settings.biometricPINCode){
                    Haptics.impact(HapticsImpactStyle.Light)

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
                        Haptics.impact(HapticsImpactStyle.Light)

                        await window.customFunctions.shakeDiv(window.$("#pin-code-dots"), 100, 10, 6)

                        dotChildren.each(function(){
                            window.$(this).attr("icon", Ionicons.ellipseOutline)
                        })

                        window.customVariables.currentPINCode = ""
                        window.customVariables.confirmPINCode = ""
    
                        window.$("#pin-code-text").html(language.get(self.state.lang, "biometricSetupPINCode"))
                    }
                    else{
                        let loading = await loadingController.create({
                            message: "",
                            backdropDismiss: false,
                            showBackdrop: false
                        })

                        await loading.present()

                        let newSettings = self.state.settings

                        newSettings.biometricPINCode = window.customVariables.confirmPINCode

                        window.customFunctions.saveSettings(newSettings)

                        window.customVariables.currentPINCode = ""
                        window.customVariables.confirmPINCode = ""

                        window.customVariables.biometricAuthShowing = false

                        window.$("#biometric-auth-screen").remove()

                        loading.dismiss()
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

                    window.$("#pin-code-text").html(language.get(self.state.lang, "biometricSetupPINCodeConfirm"))
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

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        if(Capacitor.isNative){
            SplashScreen.hide()
        }

        if(type == "auth"){
            window.customFunctions.showBiometricAuth()
        }

        //setupStatusbar(self, "login/register")

        //modal.onDidDismiss().then(() => {
        //    setupStatusbar(self)
        //})

        return true
    }

    window.customFunctions.showBiometricAuth = async () => {
        try{
            var available = await FingerprintAIO.isAvailable()
        }
        catch(e){
            //spawnToast(language.get(self.state.lang, "biometricNotAvailable"))

            return console.log(e)
        }

        if(!["finger", "face", "biometric"].includes(available)){
            //return spawnToast(language.get(self.state.lang, "biometricNotAvailable"))

            return false
        }

        try{
            var result = await FingerprintAIO.show({
                clientId: "filen",
                clientSecret: "filen",
                disableBackup: true,
                title: language.get(self.state.lang, "biometricTitle"),
                description: language.get(self.state.lang, "biometricDescription"),
                fallbackButtonTitle: language.get(self.state.lang, "biometricUsePIN"),
                cancelButtonTitle: language.get(self.state.lang, "cancel"),
                confirmationRequired: false
            })
        }
        catch(e){
            //spawnToast(language.get(self.state.lang, "biometricInvalid"))

            return console.log(e)
        }

        if(typeof result.code !== "undefined"){
            if(result.code == -108){
                //spawnToast(language.get(self.state.lang, "biometricCanceled"))

                return false
            }
        }

        if(!["Success", "success", "biometric_success"].includes(result)){
            //spawnToast(language.get(self.state.lang, "biometricInvalid"))

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
            var deviceInfo = await App.getInfo()

            var res = await utils.apiRequest("POST", "/v1/currentVersions", {
                platform: "mobile"
            })
        }
        catch(e){
            return console.log(e)
        }

        if(utils.compareVersions(deviceInfo.version, res.data.mobile) == "update"){
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

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode

        window.$("body").prepend(`
            <div id="update-screen" style="position: absolute; height: 100vh; width: 100vw; overflow: hidden; z-index: 100000;">
                <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                    <ion-toolbar style="--background: transparent;">
                        <ion-title>
                            ` + language.get(appLang, "updateAvailable") + `
                        </ion-title>
                    </ion-toolbar>
                </ion-header>
                <ion-content fullscreen>
                    <div style="position: absolute; left: 50%; top: 40%; -webkit-transform: translate(-50%, -40%); transform: translate(-50%, -50%); width: 100%;">
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
            </div>
        `)

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
                    apiKey: self.state.userAPIKey || "none",
                    error: JSON.stringify(errObj),
                    platform: "mobile"
                })
            }
            catch(e){  }
        })
    }

    window.customFunctions.toggleBiometricAuth = () => {
        if(typeof self.state.settings.biometricPINCode !== "undefined"){
            if(self.state.settings.biometricPINCode.length == 4){
                let newSettings = self.state.settings

                newSettings.biometricPINCode = ""

                window.customFunctions.saveSettings(newSettings)

                return self.setState({
                    settings: newSettings
                }, () => {
                    self.forceUpdate()
                })
            }
        }

        return window.customFunctions.showBiometricAuthScreen("setup")
    }

    window.customFunctions.toggleGridMode = () => {
        window.customFunctions.dismissPopover()

        let newSettings = self.state.settings
        let newVal = !newSettings.gridModeEnabled

        newSettings.gridModeEnabled = newVal

        window.customFunctions.saveSettings(newSettings)

        return self.setState({
            settings: newSettings,
            scrollToIndex: 0
        }, () => {
            self.forceUpdate()
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

    window.customFunctions.isDeviceOnline = () => {
        return self.state.isDeviceOnline
    }

    window.customFunctions.getNetworkInfo = async () => {
        try{
            let old = window.customVariables.networkStatus

            window.customVariables.networkStatus = await Network.getStatus()

            if(old.connected !== window.customVariables.networkStatus.connected){
                self.setState({
                    networkStatus: window.customVariables.networkStatus,
                    isDeviceOnline: window.customVariables.networkStatus.connected
                }, () => {
                    self.forceUpdate()
                })
            }
        }
        catch(e){
            console.log(e)
        }
    }

    window.customFunctions.saveSettings = (newSettings) => {
        self.setState({
            settings: newSettings
        })

        return storage.saveSettings(newSettings)
    }

    window.customFunctions.saveItemsCache = () => {
        return storage.saveItemsCache()
    }

    window.customFunctions.saveOfflineSavedFiles = () => {
        return storage.saveOfflineSavedFiles()
    }

    window.customFunctions.saveGetThumbnailErrors = () => {
        return storage.saveGetThumbnailErrors()
    }

    window.customFunctions.saveAPICache = () => {
        return storage.saveAPICache()
    }

    window.customFunctions.saveThumbnailCache = () => {
        return storage.saveThumbnailCache()
    }

    window.customFunctions.saveCachedItems = () => {
        return storage.saveCachedItems()
    }

    window.customFunctions.saveFolderSizeCache = () => {
        return storage.saveFolderSizeCache()
    }

    window.customFunctions.saveCameraUpload = () => {
        return storage.saveCameraUpload()
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
            let done = false

            while(!done){
                try{
                    let modal = await modalController.getTop()
        
                    if(typeof modal !== "undefined"){
                        await modal.dismiss()
                    }
                    else{
                        done = true
                    }
                }
                catch(e){
                    console.log(e)

                    done = true
                }
            }

            return true
        }

        try{
            let modal = await modalController.getTop()

            if(typeof modal !== "undefined"){
                return modal.dismiss()
            }

            return true
        }
        catch(e){
            console.log(e)

            return false
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

        for(let i = 0; i < self.state.itemList.length; i++){
            let item = self.state.itemList[i]

            item.selected = true

            items.push(item)
        }

        self.setState({
            itemList: items,
            selectedItems: items.length
        })

        return window.customFunctions.dismissPopover()
    }

    window.customFunctions.unselectAllItems = () => {
        let items = []

        for(let i = 0; i < self.state.itemList.length; i++){
            let item = self.state.itemList[i]

            item.selected = false

            items.push(item)
        }

        self.setState({
            itemList: items,
            selectedItems: 0
        })

        return window.customFunctions.dismissPopover()
    }

    window.customFunctions.refresherPulled = async () => {
        try{
            await updateItemList(self, false, true, false)

            document.getElementById("refresher").complete()
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.refreshItemList = async () => {
        try{
            await updateItemList(self, true, true, false)
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
        return showRegister(self)
    }

    window.customFunctions.doLogin = async () => {
        let email = document.getElementById("login-email").value
        let password = document.getElementById("login-password").value
        let twoFactorKey = document.getElementById("login-2fa").value

        if(!email || !password){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(self.state.lang, "loginInvalidInputs"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(twoFactorKey.length == 0){
            twoFactorKey = "XXXXXX"
        }

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
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
                message: language.get(self.state.lang, "apiRequestError"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                message: language.get(self.state.lang, "loginWrongCredentials"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                        message: language.get(self.state.lang, "passwordDerivationError"),
                        buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                message: language.get(self.state.lang, "apiRequestError"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                    message: language.get(self.state.lang, "loginWith2FACode"),
                    buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                        message: language.get(self.state.lang, "loginAccountNotActivated"),
                        buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                    })
        
                    return alert.present()
                }
                else if(res.message == "Account not found."){
                    let alert = await alertController.create({
                        header: "",
                        subHeader: "",
                        message: language.get(self.state.lang, "loginAccountNotFound"),
                        buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                    })
        
                    return alert.present()
                }

                let alert = await alertController.create({
                    header: "",
                    subHeader: "",
                    message: language.get(self.state.lang, "loginWrongCredentials"),
                    buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                })

                return alert.present()
            }
        }

        try{
            await storage.remove("userPublicKey")
            await storage.remove("userPrivateKey")

            await storage.set("isLoggedIn", "true")
            await storage.set("userAPIKey", res.data.apiKey)
            await storage.set("userEmail", email)
            await storage.set("userMasterKeys", await workers.JSONStringifyWorker([mKey]))
            await storage.set("userAuthVersion", authVersion)
        }
        catch(e){
            return console.log(e)
        }

        await window.customFunctions.waitForStorageWrites()

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
                message: language.get(self.state.lang, "registerInvalidInputs"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(password.length < 10){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(self.state.lang, "registerPasswordAtLeast10Chars"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(password !== passwordRepeat){
            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: language.get(self.state.lang, "registerPasswordsDoNotMatch"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()

        let salt = utils.generateRandomString(256)

        try{
            if(self.state.currentAuthVersion == 1){
                password = utils.hashPassword(password)
                passwordRepeat = password
            }
            else if(self.state.currentAuthVersion == 2){
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
                        message: language.get(self.state.lang, "passwordDerivationError"),
                        buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                    })

                    return alert.present()
				}
            }

            var res = await utils.apiRequest("POST", "/v1/register", {
                email,
                password,
                passwordRepeat,
                salt,
                authVersion: self.state.currentAuthVersion
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
                message: language.get(self.state.lang, "apiRequestError"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })

            return alert.present()
        }

        if(!res.status){
            document.getElementById("register-password").value = ""
            document.getElementById("register-password-repeat").value = ""

            window.customFunctions.dismissLoader()

            let message = ""

            if(res.message.toLowerCase().indexOf("invalid email") !== -1 || res.message.toLowerCase().indexOf("invalid password") !== -1 || res.message.toLowerCase().indexOf("invalid email") !== -1){
                message = language.get(self.state.lang, "registerInvalidFields")
            }
            else if(res.message.toLowerCase().indexOf("your password needs to be at least 10 characters long") !== -1){
                message = language.get(self.state.lang, "registerPasswordAtLeast10Chars")
            }
            else if(res.message.toLowerCase().indexOf("passwords do not match") !== -1){
                message = language.get(self.state.lang, "registerPasswordsDoNotMatch")
            }
            else if(res.message.toLowerCase().indexOf("invalid email") !== -1){
                message = language.get(self.state.lang, "registerInvalidEmail")
            }
            else if(res.message.toLowerCase().indexOf("database error") !== -1){
                message = language.get(self.state.lang, "apiRequestError")
            }
            else if(res.message.toLowerCase().indexOf("self email is already registered") !== -1){
                message = language.get(self.state.lang, "registerEmailAlreadyRegistered")
            }
            else if(res.message.toLowerCase().indexOf("we could not send an email at self time, please try again later") !== -1){
                message = language.get(self.state.lang, "registerCouldNotSendEmail")
            }

            let alert = await alertController.create({
                header: "",
                subHeader: "",
                message: message,
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
            message: language.get(self.state.lang, "registerSuccess"),
            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
        })

        return alert.present()
    }

    window.customFunctions.openSettingsModal = async () => {
        return openSettingsModal(self)
    }

    window.customFunctions.openTermsModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "terms-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/terms"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return spawnToast(language.get(self.state.lang, "apiRequestError"))
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openPrivacyModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "privacy-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/privacy"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return spawnToast(language.get(self.state.lang, "apiRequestError"))
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openImprintModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "imprint-modal-" + utils.generateRandomClassName()

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })

        loading.present()

        try{
            var res = await utils.fetchWithTimeout(60000, fetch("https://filen.io/raw/imprint"))

            res = await res.text()
        }
        catch(e){
            console.log(e)

            loading.dismiss()

            return spawnToast(language.get(self.state.lang, "apiRequestError"))
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
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
                message: language.get(self.state.lang, "registerInvalidEmail"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
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
                message: language.get(self.state.lang, "apiRequestError"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        window.customFunctions.dismissLoader()

        document.getElementById("forgot-password-email").value = ""
    
        let apiAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(self.state.lang, "forgotPasswordEmailSendSuccess"),
            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
        })

        return apiAlert.present()
    }

    window.customFunctions.openForgotPasswordModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
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
                message: language.get(self.state.lang, "registerInvalidEmail"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
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
                message: language.get(self.state.lang, "apiRequestError"),
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
            })
    
            return apiAlert.present()
        }

        window.customFunctions.dismissLoader()

        document.getElementById("resend-confirmation-email").value = ""
    
        let apiAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(self.state.lang, "resendConfirmationEmailSuccess"),
            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
        })

        return apiAlert.present()
    }

    window.customFunctions.openResendConfirmationModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.setLang = async (lang = "en") => {
        try{
            await storage.set("lang", lang)
        }
        catch(e){
            return console.log(e)
        }

        await window.customFunctions.waitForStorageWrites()

        return document.location.href = "index.html"
    }

    window.customFunctions.openLanguageModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        if(!self.state.isLoggedIn){
            setupStatusbar(self, "modal")

            try{
                let sModal = await modalController.getTop()

                sModal.onDidDismiss().then(() => {
                    setupStatusbar(self)
                })
            }
            catch(e){
                console.log(e)
            }
        }

        return true
    }

    window.customFunctions.openEncryptionModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        setupStatusbar(self, "modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                setupStatusbar(self)
            })
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.openWebsiteModal = async () => {
        let actionSheet = await actionSheetController.create({
            header: language.get(self.state.lang, "website"),
            buttons: [
                {
                    text: language.get(self.state.lang, "website"),
                    icon: Ionicons.globe,
                    handler: () => {
                        window.open("https://filen.io/", "_system")

                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "onlineFM"),
                    icon: Ionicons.grid,
                    handler: () => {
                        window.open("https://filen.io/my-account/file-manager/default", "_system")

                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "cancel"),
                    icon: "close",
                    role: "cancel"
                }
            ],
            showBackdrop: false
        })

        return actionSheet.present()
    }

    window.customFunctions.openHelpModal = async () => {
        let btns = [
            {
                text: language.get(self.state.lang, "support"),
                icon: Ionicons.helpBuoyOutline,
                handler: () => {
                    window.open("https://support.filen.io/", "_system")

                    return false
                }
            },
            {
                text: language.get(self.state.lang, "tos"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    return window.customFunctions.openTermsModal()
                }
            },
            {
                text: language.get(self.state.lang, "privacyPolicy"),
                icon: Ionicons.informationCircleOutline,
                handler: () => {
                    return window.customFunctions.openPrivacyModal()
                }
            },
            {
                text: language.get(self.state.lang, "cancel"),
                icon: "close",
                role: "cancel"
            }
        ]

        let actionSheet = await actionSheetController.create({
            header: language.get(self.state.lang, "help"),
            buttons: btns,
            showBackdrop: false
        })

        return actionSheet.present()
    }

    window.customFunctions.openItemActionSheetFromJSON = (itemJSON) => {
        let item = JSON.parse(Base64.decode(itemJSON))

        return spawnItemActionSheet(self, item)
    }

    window.customFunctions.favoriteSelectedItems = async (value) => {
        window.customFunctions.dismissPopover()

        var loading = await loadingController.create({
			message: "",
            showBackdrop: false
		})
	
		loading.present()

        let items = self.state.itemList

        for(let i = 0; i < items.length; i++){
            if(items[i].selected){
                await favoriteItem(self, items[i], value, false)
            }
        }

        loading.dismiss()

        window.customFunctions.unselectAllItems()

        return true
    }

    window.customFunctions.moveSelectedItems = () => {
        return moveSelectedItems(self)
    }

    window.customFunctions.trashSelectedItems = () => {
        return trashSelectedItems(self)
    }

    window.customFunctions.restoreSelectedItems = () => {
        return restoreSelectedItems(self)
    }

    window.customFunctions.removeSelectedItemsFromSharedIn = () => {
        return removeSelectedItemsFromSharedIn(self)
    }

    window.customFunctions.stopSharingSelectedItems = () => {
        return stopSharingSelectedItems(self)
    }

    window.customFunctions.downloadSelectedItems = () => {
        return downloadSelectedItems(self)
    }

    window.customFunctions.storeSelectedItemsOffline = () => {
        return storeSelectedItemsOffline(self)
    }

    window.customFunctions.shareSelectedItems = () => {
        return shareSelectedItems(self)
    }

    window.customFunctions.waitForStorageWrites = async () => {
        await new Promise((resolve) => {
            let interval = setInterval(() => {
                if(!window.customVariables.isWritingToStorage){
                    clearInterval(interval)

                    return resolve()
                }
            }, 100)
        })

        return true
    }

    window.customFunctions.toggleTheme = async () => {
        let loading = await loadingController.create({
            message: "",
            showBackdrop: false,
            backdropDismiss: false
        })
    
        loading.present()

        try{
            if(self.state.darkMode){
                await storage.set("darkMode", "false")

                if(document.getElementById("settings-dark-mode-toggle") !== null){
                    document.getElementById("settings-dark-mode-toggle").checked = false
                }
            }
            else{
                await storage.set("darkMode", "true")
    
                if(document.getElementById("settings-dark-mode-toggle") !== null){
                    document.getElementById("settings-dark-mode-toggle").checked = true
                }
            }
        }
        catch(e){
            console.log(e)
        }

        await window.customFunctions.waitForStorageWrites()

        return document.location.href = "index.html"
    }

    window.customFunctions.settingsToggleDarkMode = async () => {
        return window.customFunctions.toggleTheme()
    }

    window.customFunctions.loginToggleDarkMode = async () => {
        return window.customFunctions.toggleTheme()
    }

    window.customFunctions.settingsToggleConvertHeic = () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.convertHeic

        newSettings.convertHeic = newVal

        document.getElementById("settings-convert-heic-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.toggleShowThumbnails = () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.showThumbnails

        newSettings.showThumbnails = newVal

        document.getElementById("settings-show-thumbnails-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.toggleOnlyWifi = () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.onlyWifi

        newSettings.onlyWifi = newVal

        document.getElementById("settings-only-wifi-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.toggleOnlyWifiUploads = () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.onlyWifiUploads

        newSettings.onlyWifiUploads = newVal

        document.getElementById("settings-only-wifi-uploads-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.logoutUser = async () => {
        var loading = await loadingController.create({
            message: "",
            backdropDismiss: false,
            showBackdrop: false
        })

        loading.present()

        try{
            await storage.remove("isLoggedIn")
            await storage.remove("userAPIKey")
            await storage.remove("userEmail")
            await storage.remove("userMasterKeys")
            await storage.remove("userPublicKey")
            await storage.remove("userPrivateKey")
        }
        catch(e){
            console.log(e)
        }

        await window.customFunctions.waitForStorageWrites()

        return document.location.href = "index.html"
    }

    window.customFunctions.doLogout = async () => {
        let alert = await alertController.create({
            header: language.get(self.state.lang, "logoutAlertHeader"),
            message: language.get(self.state.lang, "logoutConfirmation"),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
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
            header: language.get(self.state.lang, "emptyTrashHeader"),
            message: language.get(self.state.lang, "emptyTrashWarning"),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async () => {
                        let loading = await loadingController.create({
                            message: "",
                            showBackdrop: false
                        })

                        loading.present()

                        try{
                            var res = await utils.apiRequest("POST", "/v1/trash/empty", {
                                apiKey: self.state.userAPIKey
                            })
                        }
                        catch(e){
                            console.log(e)

                            loading.dismiss()

                            return spawnToast(language.get(self.state.lang, "apiRequestError"))
                        }

                        if(!res.status){
                            console.log(res.message)

                            loading.dismiss()

                            return spawnToast(res.message)
                        }

                        loading.dismiss()

                        self.setState({
                            itemList: []
                        }, () => {
                            self.forceUpdate()
                        })

                        return spawnToast(language.get(self.state.lang, "trashEmptied"))
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.changeItemColor = async (itemJSON, color) => {
        let item = JSON.parse(Base64.decode(itemJSON))

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()

        try{
            var res = await utils.apiRequest("POST", "/v1/dir/color/change", {
                apiKey: self.state.userAPIKey,
                uuid: item.uuid,
                color: color
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            console.log(res.message)
    
            loading.dismiss()
    
            return spawnToast(res.message)
        }

        loading.dismiss()

        try{
            await updateItemList(self)
        }
        catch(e){
            console.log(e)
        }

        return window.customFunctions.dismissModal()
    }

    window.customFunctions.editItemPublicLink = async (itemJSON, type, isEdit = false, currentLinkUUID = "") => {
        let item = JSON.parse(Base64.decode(itemJSON))
        let linkUUID = utils.uuidv4()

        currentLinkUUID = window.$("#save-link-btn").attr("data-currentlinkuuid")

        if(isEdit && typeof currentLinkUUID == "string"){
            if(currentLinkUUID.length > 1){
                linkUUID = currentLinkUUID
            }
        }

        let loading = await loadingController.create({
            message: "",
            showBackdrop: false
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
                    apiKey: self.state.userAPIKey,
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
        
                return spawnToast(language.get(self.state.lang, "apiRequestError"))
            }
        
            if(!res.status){
                console.log(res.message)
        
                loading.dismiss()
        
                return spawnToast(res.message)
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
                    await updateItemList(self)
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
                        apiKey: self.state.userAPIKey,
                        uuid: item.uuid
                    })
                }
                catch(e){
                    console.log(e)
            
                    removeLoading.dismiss()
            
                    return callback(language.get(self.state.lang, "apiRequestError"))
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
                        apiKey: self.state.userAPIKey,
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
            
                    return callback(language.get(self.state.lang, "apiRequestError"))
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
                        apiKey: self.state.userAPIKey,
                        uuid: item.uuid
                    })
                }
                catch(e){
                    console.log(e)
            
                    createLoading.dismiss()
            
                    return callback(language.get(self.state.lang, "apiRequestError"))
                }
            
                if(!res.status){
                    console.log(res.message)
            
                    createLoading.dismiss()
            
                    return callback(res.message)
                }

                let key = utils.generateRandomString(32)
                let keyEnc = await utils.encryptMetadata(key, self.state.userMasterKeys[self.state.userMasterKeys.length - 1])
                let newLinkUUID = utils.uuidv4()
                let totalItems = (res.data.folders.length + res.data.files.length)
                let doneItems = 0
                let erroredItems = 0

                const itemAdded = () => {
                    doneItems += 1

                    createLoading.message = language.get(self.state.lang, "folderLinkAddedItemsCount", true, ["__ADDED__", "__TOTAL__"], [doneItems, totalItems])

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
						return cb(language.get(self.state.lang, "apiRequestError"))
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
						name: await utils.decryptFolderName(folder.name, self.state.userMasterKeys, folder.uuid)
					})

					window.customVariables.decryptShareItemSemaphore.release()
				}

				for(let i = 0; i < res.data.files.length; i++){
					let file = res.data.files[i]

					await window.customVariables.decryptShareItemSemaphore.acquire()

					let fileMetadata = await utils.decryptFileMetadata(file.metadata, self.state.userMasterKeys, file.uuid)

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
                            return spawnToast(language.get(self.state.lang, "apiRequestError"))
                        }
                    })
                }
                else{
                    createFolderLink((err, linkData) => {
                        if(err){
                            return spawnToast(language.get(self.state.lang, "apiRequestError"))
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
                        return spawnToast(language.get(self.state.lang, "apiRequestError"))
                    }

                    document.getElementById("enable-public-link-content").style.display = "block"
                    document.getElementById("public-link-enabled-content").style.display = "none"
                    document.getElementById("public-link-enabled-share").style.display = "none"

                    updateItemList(self)
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

            await Share.share({
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
    
                return spawnToast(language.get(self.state.lang, "couldNotCopyToClipboard")) 
            }
    
            return spawnToast(language.get(self.state.lang, "copiedToClipboard"))
        }

        try{
            let link = document.getElementById("public-link-input").value

            await Clipboard.write({
                url: link
            })
        }
        catch(e){
            console.log(e)

            return spawnToast(language.get(self.state.lang, "couldNotCopyToClipboard")) 
        }

        return spawnToast(language.get(self.state.lang, "copiedToClipboard")) 
    }

    window.customFunctions.copyStringToClipboard = async (string) => {
        if(!Capacitor.isNative){
            try{
                utils.copyTextToClipboardWeb(string)
            }
            catch(e){
                console.log(e)
    
                return spawnToast(language.get(self.state.lang, "couldNotCopyToClipboard")) 
            }
    
            return spawnToast(language.get(self.state.lang, "copiedToClipboard"))
        }

        try{
            await Clipboard.write({
                url: string
            })
        }
        catch(e){
            console.log(e)

            return spawnToast(language.get(self.state.lang, "couldNotCopyToClipboard")) 
        }

        return spawnToast(language.get(self.state.lang, "copiedToClipboard")) 
    }

    window.customFunctions.clearThumbnailCache = async () => {
        let alert = await alertController.create({
            header: language.get(self.state.lang, "settingsClearThumbnailCacheHeader"),
            message: language.get(self.state.lang, "settingsClearThumbnailCacheInfo"),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async () => {
                        if(!Capacitor.isNative){
                            return alert.dismiss()
                        }

                        alert.dismiss()

                        let loading = await loadingController.create({
                            message: "",
                            showBackdrop: false,
                            backdropDismiss: false
                        })

                        loading.present()

                        try{
                            await new Promise((resolve, reject) => {
                                window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (rootDirEntry) => {
                                    rootDirEntry.getDirectory("thumbnailCache", {
                                        create: true
                                    }, (subDirEntry) => {
                                        subDirEntry.removeRecursively(() => {
                                            return resolve(true)
                                        }, (err) => {
                                            return reject(err)
                                        })
                                    }, (err) => {
                    
                                        return reject(err)
                                    })                    
                                }, (err) => {
                                    return reject(err)
                                })
                            })
                        }
                        catch(e){
                            console.log(e)
                        }

                        window.customVariables.thumbnailCache = {}
                        window.customVariables.thumbnailBlobCache = {}
                        window.customVariables.lastThumbnailCacheLength = undefined
                        window.customVariables.getThumbnailErrors = {}
                        window.customVariables.lastGetThumbnailErrorsLength = undefined

                        await window.customFunctions.saveThumbnailCache(true)

                        try{
                            await storage.set("getThumbnailErrors@" + window.customVariables.userEmail, JSON.stringify({}))
                        }
                        catch(e){
                            console.log(e)
                        }

                        loading.dismiss()

                        return spawnToast(language.get(self.state.lang, "settingsClearThumbnailCacheDone"))
                    }
                }
            ]
        })

        return alert.present()
    }

    window.customFunctions.deleteEverything = async () => {
        let alert = await alertController.create({
            header: language.get(self.state.lang, "settingsDeleteAll"),
            message: language.get(self.state.lang, "settingsDeleteAllInfo"),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async () => {
                        let confirmAlert = await alertController.create({
                            header: language.get(self.state.lang, "settingsDeleteAll"),
                            message: language.get(self.state.lang, "settingsDeleteAllConfirm"),
                            buttons: [
                                {
                                    text: language.get(self.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(self.state.lang, "alertOkButton"),
                                    handler: async () => {
                                        var loading = await loadingController.create({
                                            message: "",
                                            showBackdrop: false
                                        })
                                    
                                        loading.present()

                                        try{
                                            var res = await utils.apiRequest("POST", "/v1/user/delete/all", {
                                                apiKey: self.state.userAPIKey
                                            })
                                        }
                                        catch(e){
                                            console.log(e)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(self.state.lang, "apiRequestError"),
                                                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                                                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }

                                        window.customFunctions.dismissLoader()
                                    
                                        let apiAlert = await alertController.create({
                                            header: "",
                                            subHeader: "",
                                            message: language.get(self.state.lang, "settingsDeleteAllSuccess"),
                                            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
            header: language.get(self.state.lang, "settingsDeleteVersioned"),
            message: language.get(self.state.lang, "settingsDeleteVersionedInfo"),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async () => {
                        let confirmAlert = await alertController.create({
                            header: language.get(self.state.lang, "settingsDeleteVersioned"),
                            message: language.get(self.state.lang, "settingsDeleteAllConfirm"),
                            buttons: [
                                {
                                    text: language.get(self.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(self.state.lang, "alertOkButton"),
                                    handler: async () => {
                                        var loading = await loadingController.create({
                                            message: "",
                                            showBackdrop: false
                                        })
                                    
                                        loading.present()

                                        try{
                                            var res = await utils.apiRequest("POST", "/v1/user/versions/delete", {
                                                apiKey: self.state.userAPIKey
                                            })
                                        }
                                        catch(e){
                                            console.log(e)
                                    
                                            window.customFunctions.dismissLoader()
                                    
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(self.state.lang, "apiRequestError"),
                                                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                                                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                                            })
                                    
                                            return apiAlert.present()
                                        }

                                        window.customFunctions.dismissLoader()
                                    
                                        let apiAlert = await alertController.create({
                                            header: "",
                                            subHeader: "",
                                            message: language.get(self.state.lang, "settingsDeleteVersionedSuccess"),
                                            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
                header: language.get(self.state.lang, "settingsDeleteAccount"),
                message: language.get(self.state.lang, "settingsDeleteAccountInfo"),
                buttons: [
                    {
                        text: language.get(self.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(self.state.lang, "alertOkButton"),
                        handler: async () => {
                            let confirmAlert = await alertController.create({
                                header: language.get(self.state.lang, "settingsDeleteAccount"),
                                message: language.get(self.state.lang, "settingsDeleteAllConfirm"),
                                buttons: [
                                    {
                                        text: language.get(self.state.lang, "cancel"),
                                        role: "cancel",
                                        handler: () => {
                                            return false
                                        }
                                    },
                                    {
                                        text: language.get(self.state.lang, "alertOkButton"),
                                        handler: async () => {
                                            var loading = await loadingController.create({
                                                message: "",
                                                showBackdrop: false
                                            })
                                        
                                            loading.present()
    
                                            try{
                                                var res = await utils.apiRequest("POST", "/v1/user/account/delete", {
                                                    apiKey: self.state.userAPIKey,
                                                    twoFactorKey
                                                })
                                            }
                                            catch(e){
                                                console.log(e)
                                        
                                                window.customFunctions.dismissLoader()
                                        
                                                let apiAlert = await alertController.create({
                                                    header: "",
                                                    subHeader: "",
                                                    message: language.get(self.state.lang, "apiRequestError"),
                                                    buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                                                })
                                        
                                                return apiAlert.present()
                                            }
                                    
                                            if(!res.status){
                                                window.customFunctions.dismissLoader()
                                        
                                                let apiAlert = await alertController.create({
                                                    header: "",
                                                    subHeader: "",
                                                    message: res.message,
                                                    buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
                                                })
                                        
                                                return apiAlert.present()
                                            }
    
                                            window.customFunctions.dismissLoader()
                                        
                                            let apiAlert = await alertController.create({
                                                header: "",
                                                subHeader: "",
                                                message: language.get(self.state.lang, "settingsDeleteAccountSuccess"),
                                                buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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

        if(self.state.twoFactorEnabled){
            let alert = await alertController.create({
                header: language.get(self.state.lang, "settingsDeleteAccount2FA"),
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
                        text: language.get(self.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(self.state.lang, "alertOkButton"),
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
            header: language.get(self.state.lang, "settingsRedeemCode"),
            inputs: [
                {
                    type: "text",
                    id: "code-input",
                    name: "code-input",
                    placeholder: language.get(self.state.lang, "settingsRedeemCodePlaceholder"),
                    value: ""
                }
            ],
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async (inputs) => {
                        let code = inputs['code-input']

                        var loading = await loadingController.create({
                            message: "",
                            showBackdrop: false
                        })
                    
                        loading.present()
                    
                        try{
                            var res = await utils.apiRequest("POST", "/v1/user/code/redeem", {
                                apiKey: self.state.userAPIKey,
                                code
                            })
                        }
                        catch(e){
                            console.log(e)
                    
                            loading.dismiss()
                    
                            return spawnToast(language.get(self.state.lang, "apiRequestError"))
                        }
                    
                        if(!res.status){
                            loading.dismiss()
                    
                            console.log(res.message)
                    
                            return spawnToast(res.message)
                        }
                    
                        loading.dismiss()

                        updateUserUsage(self)

                        return spawnToast(language.get(self.state.lang, "codeRedeemSuccess"))
                    }
                }
            ]
        })
    
        return alert.present()
    }

    window.customFunctions.showGDPR = async () => {
        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/gdpr/download", {
                apiKey: self.state.userAPIKey
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "two-factor-modal-" + utils.generateRandomClassName()

        if(typeof window.customVariables.lastSettingsRes.twoFactorKey !== "string"){
            return false
        }

        if(window.customVariables.lastSettingsRes.twoFactorKey.length <= 6){
            return false
        }

        if(self.state.twoFactorEnabled){
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

        if(!self.state.twoFactorEnabled){
            new window.QRCode(document.getElementById("qr-code-container"), {
                text: `otpauth://totp/` + encodeURIComponent("Filen") + `:` + encodeURIComponent(self.state.userEmail) + `?secret=` + window.customVariables.lastSettingsRes.twoFactorKey + `&issuer=` + encodeURIComponent("Filen") + `&digits=6&period=30`,
                width: 250,
                height: 250,
                colorDark: (self.state.darkMode ? "#000000" : "#000000"),
                colorLight: (self.state.darkMode ? "#ffffff" : "#ffffff"),
                correctLevel: window.QRCode.CorrectLevel.H
            })
        }

        return true
    }

    window.customFunctions.show2FARecoveryKeyModal = async (key) => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "two-factor-recovery-key-modal-" + utils.generateRandomClassName()

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
                                ` + language.get(appLang, "2faRecoveryKeys") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-item lines="none">
                                ` + language.get(appLang, "2faRecoveryKeysInfo") + `
                            </ion-item>
                            <ion-item lines="none" style="margin-top: 30px;">
                                <ion-input autocomplete="off" value="` + key + `" style="-webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;" disabled></ion-input>
                                <ion-button slot="end" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `" onClick="window.customFunctions.copyStringToClipboard('` + key + `')">
                                    ` + language.get(appLang, "copy") + `
                                </ion-button>
                            </ion-item>
                        </ion-list>
                        <section style="padding-left: 15px; padding-right: 15px; margin-top: 30px;">
                            <ion-button expand="block" size="small" color="` + (appDarkMode ? `dark` : `light`) + `" fill="solid" onClick="window.customFunctions.dismissModal()">` + language.get(appLang, "close") + `</ion-button>
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

    window.customFunctions.toggle2FA = async (activate) => {
        if(activate){
            let alert = await alertController.create({
                header: language.get(self.state.lang, "settings2FAActivate"),
                inputs: [
                    {
                        type: "number",
                        id: "two-factor-input",
                        name: "two-factor-input",
                        placeholder: language.get(self.state.lang, "enterGenerated2FACode"),
                        value: ""
                    }
                ],
                buttons: [
                    {
                        text: language.get(self.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(self.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            let code = inputs['two-factor-input']
    
                            var loading = await loadingController.create({
                                message: "",
                                showBackdrop: false
                            })
                        
                            loading.present()
                        
                            try{
                                var res = await utils.apiRequest("POST", "/v1/user/settings/2fa/enable", {
                                    apiKey: self.state.userAPIKey,
                                    code
                                })
                            }
                            catch(e){
                                console.log(e)
                        
                                loading.dismiss()
                        
                                return spawnToast(language.get(self.state.lang, "apiRequestError"))
                            }
                        
                            if(!res.status){
                                loading.dismiss()
                        
                                console.log(res.message)
                        
                                return spawnToast(res.message)
                            }
                        
                            loading.dismiss()

                            self.setState({
                                twoFactorEnabled: true
                            })

                            try{
                                await window.customFunctions.dismissModal()
                            }
                            catch(e){
                                console.log(e)
                            }

                            window.customFunctions.show2FARecoveryKeyModal(res.data.recoveryKeys)
    
                            return spawnToast(language.get(self.state.lang, "2faActivated"))
                        }
                    }
                ]
            })
        
            return alert.present()
        }
        else{
            let alert = await alertController.create({
                header: language.get(self.state.lang, "settings2FADisable"),
                inputs: [
                    {
                        type: "number",
                        id: "two-factor-input",
                        name: "two-factor-input",
                        placeholder: language.get(self.state.lang, "enterGenerated2FACode"),
                        value: ""
                    }
                ],
                buttons: [
                    {
                        text: language.get(self.state.lang, "cancel"),
                        role: "cancel",
                        handler: () => {
                            return false
                        }
                    },
                    {
                        text: language.get(self.state.lang, "alertOkButton"),
                        handler: async (inputs) => {
                            let code = inputs['two-factor-input']
    
                            var loading = await loadingController.create({
                                message: "",
                                showBackdrop: false
                            })
                        
                            loading.present()
                        
                            try{
                                var res = await utils.apiRequest("POST", "/v1/user/settings/2fa/disable", {
                                    apiKey: self.state.userAPIKey,
                                    code
                                })
                            }
                            catch(e){
                                console.log(e)
                        
                                loading.dismiss()
                        
                                return spawnToast(language.get(self.state.lang, "apiRequestError"))
                            }
                        
                            if(!res.status){
                                loading.dismiss()
                        
                                console.log(res.message)
                        
                                return spawnToast(res.message)
                            }
                        
                            loading.dismiss()

                            self.setState({
                                twoFactorEnabled: false
                            })

                            window.customFunctions.dismissModal()
    
                            return spawnToast(language.get(self.state.lang, "2faDisabled"))
                        }
                    }
                ]
            })
        
            return alert.present()
        }
    }

    window.customFunctions.openEventsModal = async () => {
        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/events", {
                apiKey: self.state.userAPIKey,
                id: 0
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "events-modal-" + utils.generateRandomClassName()

        let eventsHTML = ""

        for(let i = 0; i < res.data.events.length; i++){
            eventsHTML += await utils.renderEventRow(res.data.events[i], self.state.userMasterKeys, appLang)
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

        setupStatusbar(self, "modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                setupStatusbar(self)
            })
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.openEventDetailsModal = async (uuid) => {
        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/events/get", {
                apiKey: self.state.userAPIKey,
                uuid
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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
                                    ` + utils.sanitizeHTML(res.data.info.ip) + `
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + dateString + `
                                </ion-label>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + utils.sanitizeHTML(res.data.info.userAgent) + `
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
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        setupStatusbar(self, "modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                setupStatusbar(self)
            })
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.openVersionsItemPreview = (itemJSON) => {
        let item = JSON.parse(Base64.decode(itemJSON))

        return previewItem(self, item, undefined, true)
    }

    window.customFunctions.restoreVersionedItem = async (uuid, currentUUID) => {
        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/file/archive/restore", {
                apiKey: self.state.userAPIKey,
                uuid: uuid,
                currentUUID: currentUUID
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        window.customFunctions.dismissModal()

        spawnToast(language.get(self.state.lang, "fileVersionRestored"))

        updateItemList(self, false)

        return true
    }

    window.customFunctions.openVersionActionSheet = async (item) => {
        try{
            item = JSON.parse(Base64.decode(item))
        }
        catch(e){
            return console.log(e)
        }

        if(item.uuid == item.itemUUID){
            return false
        }

        let headerName = item.name

        if(headerName.length >= 32){
            headerName = headerName.substring(0, 32) + "..."
        }

        let metadata = item.metadata
        let nameEx = metadata.name.split(".")

        let buttons = []

        if(utils.getFilePreviewType(nameEx[nameEx.length - 1], metadata.mime) !== "none"){
            buttons.push({
                text: language.get(self.state.lang, "previewItem"),
                icon: Ionicons.imageOutline,
                handler: () => {
                    return window.customFunctions.openVersionsItemPreview(Base64.encode(JSON.stringify(item)))
                }
            })
        }

        buttons.push({
            text: language.get(self.state.lang, "restoreItem"),
            icon: Ionicons.bagAddOutline,
            handler: () => {
                return window.customFunctions.restoreVersionedItem(item.uuid, item.itemUUID)
            }
        })

        buttons.push({
            text: language.get(self.state.lang, "deletePermanently"),
            icon: Ionicons.trashBinOutline,
            handler: async () => {
                let loading = await loadingController.create({
                    message: "",
                    backdropDismiss: false,
                    showBackdrop: false
                })
        
                loading.present()
    
                try{
                    var res = await utils.apiRequest("POST", "/v1/file/delete/permanent", {
                        apiKey: window.customVariables.apiKey,
                        uuid: item.uuid
                    })
                }
                catch(e){
                    console.log(e)
    
                    loading.dismiss()
    
                    return spawnToast(language.get(self.state.lang, "apiRequestError"))
                }
    
                loading.dismiss()
            
                if(!res.status){
                    console.log(res.message)
    
                    return spawnToast(res.message)
                }

                window.$("#version-item-" + item.uuid).remove()
    
                return spawnToast(language.get(self.state.lang, "itemDeletedPermanently", true, ["__NAME__"], [item.name]))
            }
        })

        let actionSheet = await actionSheetController.create({
            header: headerName,
            buttons: buttons
        })

        await actionSheet.present()
        
        if(Capacitor.isNative){
            setTimeout(() => {
                Keyboard.hide()
            }, 500)
        }

        return true
    }

    window.customFunctions.openVersionHistoryModal = async (item) => {
        if(item.type !== "file"){
            return false
        }

        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/file/versions", {
                apiKey: self.state.userAPIKey,
                uuid: item.uuid
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        let versionData = res.data.versions

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "versions-modal-" + utils.generateRandomClassName()

        let versionsHTML = ""

        for(let i = 0; i < versionData.length; i++){
            let metadata = await utils.decryptFileMetadata(versionData[i].metadata, self.state.userMasterKeys, versionData[i].uuid)
			let uploadDate = (new Date(versionData[i].timestamp * 1000)).toString().split(" ")
            let dateString = uploadDate[1] + ` ` + uploadDate[2] + ` ` + uploadDate[3] + ` ` + uploadDate[4]

            versionsHTML += `
                <ion-item id="version-item-` + versionData[i].uuid + `" onClick="window.customFunctions.openVersionActionSheet('` + 
                    Base64.encode(JSON.stringify({
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
                        rm: versionData[i].rm,
                        itemUUID: item.uuid,
                        metadata: metadata
                    }))
                + `')">
                    <ion-label>
                        ` + dateString + `
                    </ion-label>
                    ` + (versionData[i].uuid !== item.uuid ? `
                        <ion-button slot="end" fill="none">
                            <ion-icon slot="icon-only" icon="` + Ionicons.ellipsisVertical + `" />
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

        setupStatusbar(self, "modal")

        try{
            let sModal = await modalController.getTop()

            sModal.onDidDismiss().then(() => {
                setupStatusbar(self)
            })
        }
        catch(e){
            console.log(e)
        }

        return true
    }

    window.customFunctions.openInviteModal = async () => {
        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/get/account", {
                apiKey: self.state.userAPIKey
            })
        }
        catch(e){
            console.log(e)
    
            loading.dismiss()
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        let accountData = res.data

        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

            return spawnToast(language.get(self.state.lang, "changeEmailInvalidFields"))
        }

        if(newEmail.length <= 1 || newEmailRepeat.length <= 1 || password.length <= 1){
            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""

            return spawnToast(language.get(self.state.lang, "changeEmailInvalidFields"))
        }

        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/settings/email/change", {
                apiKey: self.state.userAPIKey,
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
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()
    
            console.log(res.message)

            document.getElementById("change-email-email").value = ""
            document.getElementById("change-email-email-repeat").value = ""
            document.getElementById("change-email-password").value = ""
    
            return spawnToast(res.message)
        }
    
        loading.dismiss()

        document.getElementById("change-email-email").value = ""
        document.getElementById("change-email-email-repeat").value = ""
        document.getElementById("change-email-password").value = ""

        let successAlert = await alertController.create({
            header: "",
            subHeader: "",
            message: language.get(self.state.lang, "changeEmailSuccess"),
            buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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

            return spawnToast(language.get(self.state.lang, "changePasswordInvalidFields"))
        }

        if(newPassword.length <= 1 || newPasswordRepeat.length <= 1 || password.length <= 1){
            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""

            return spawnToast(language.get(self.state.lang, "changePasswordInvalidFields"))
        }

        var loading = await loadingController.create({
            message: "",
            showBackdrop: false
        })
    
        loading.present()
    
        try{
            var res = await utils.apiRequest("POST", "/v1/user/settings/password/change", {
                apiKey: self.state.userAPIKey,
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
    
            return spawnToast(language.get(self.state.lang, "apiRequestError"))
        }
    
        if(!res.status){
            loading.dismiss()

            document.getElementById("change-password-password").value = ""
            document.getElementById("change-password-password-repeat").value = ""
            document.getElementById("change-password-current").value = ""
    
            console.log(res.message)
    
            return spawnToast(res.message)
        }

        document.getElementById("change-password-password").value = ""
        document.getElementById("change-password-password-repeat").value = ""
        document.getElementById("change-password-current").value = ""

        let newKeys = self.state.userMasterKeys.join("|") + "|" + utils.hashFn(newPassword)

        try{
            await storage.set("userMasterKeys", await workers.JSONStringifyWorker(newKeys.split("|")))
        }
        catch(e){
            console.log(e)
        }

        self.setState({
            userMasterKeys: newKeys.split("|")
        }, () => {
            window.customVariables.userMasterKeys = newKeys.split("|")

            self.updateUserKeys((err) => {
                if(err){
                    loading.dismiss()
            
                    console.log(res.message)
            
                    return spawnToast(language.get(self.state.language, "apiRequestError"))
                }

                loading.dismiss()

                window.customFunctions.logoutUser()

                return spawnToast(language.get(self.state.lang, "changePasswordSuccess"))
            })
        })
    }

    window.customFunctions.openOrderBy = async () => {
        let alert = await alertController.create({
            header: language.get(self.state.lang, "orderBy"),
            inputs: [
                {
                    type: "radio",
                    label: language.get(self.state.lang, "orderByName"),
                    value: "name",
                    checked: (window.customVariables.orderBy.indexOf("name") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(self.state.lang, "orderBySize"),
                    value: "size",
                    checked: (window.customVariables.orderBy.indexOf("size") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(self.state.lang, "orderByDate"),
                    value: "date",
                    checked: (window.customVariables.orderBy.indexOf("date") !== -1 ? true : false)
                },
                {
                    type: "radio",
                    label: language.get(self.state.lang, "orderByType"),
                    value: "type",
                    checked: (window.customVariables.orderBy.indexOf("type") !== -1 ? true : false)
                }
            ],
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "orderByReset"),
                    handler: () => {
                        if(utils.currentParentFolder() == self.state.settings.cameraUpload.parent ){
                            var sortedItems = utils.orderItemsByType(self.state.itemList, "dateAsc")
                            
                            window.customVariables.orderBy = "dateAsc"
                        }
                        else{
                            var sortedItems = utils.orderItemsByType(self.state.itemList, "nameAsc")

                            window.customVariables.orderBy = "nameAsc"
                        }

                        window.customVariables.itemList = sortedItems

                        return self.setState({
                            itemList: sortedItems
                        }, () => {
                            self.forceUpdate()
                        })
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async (type) => {
                        let alert = await alertController.create({
                            header: language.get(self.state.lang, "orderByDirection"),
                            inputs: [
                                {
                                    type: "radio",
                                    label: language.get(self.state.lang, "orderByDirectionAsc"),
                                    value: "Asc",
                                    checked: (window.customVariables.orderBy.indexOf("Asc") !== -1 ? true : false)
                                },
                                {
                                    type: "radio",
                                    label: language.get(self.state.lang, "orderByDirectionDesc"),
                                    value: "Desc",
                                    checked: (window.customVariables.orderBy.indexOf("Desc") !== -1 ? true : false)
                                }
                            ],
                            buttons: [
                                {
                                    text: language.get(self.state.lang, "cancel"),
                                    role: "cancel",
                                    handler: () => {
                                        return false
                                    }
                                },
                                {
                                    text: language.get(self.state.lang, "alertOkButton"),
                                    handler: (direction) => {
                                        let typeAndDirection = type + direction

                                        console.log(typeAndDirection)

                                        let sortedItems = utils.orderItemsByType(self.state.itemList, typeAndDirection)
                
                                        window.customVariables.orderBy = typeAndDirection
                                        window.customVariables.itemList = sortedItems
                
                                        return self.setState({
                                            itemList: sortedItems
                                        }, () => {
                                            self.forceUpdate()
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
            header: language.get(self.state.lang, "textEditorSaveChanges", true, ["__NAME__"], [window.customVariables.currentTextEditorItem.name]),
            buttons: [
                {
                    text: language.get(self.state.lang, "close"),
                    handler: () => {
                        return alert.dismiss()
                    }
                },
                {
                    text: language.get(self.state.lang, "textEditorDontSave"),
                    handler: () => {
                        return window.customFunctions.dismissModal()
                    }
                },
                {
                    text: language.get(self.state.lang, "save"),
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

                        queueFileUpload(self, file)

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

        if(typeof window.customVariables.currentTextEditorItem.parent == "undefined"){
            return window.customFunctions.dismissModal()
        }

        if(window.customVariables.currentTextEditorItem.parent == "undefined"){
            return window.customFunctions.dismissModal()
        }

        let fileObject = {}

        try{
            var blob = new Blob([new TextEncoder().encode(value)], {
                lastModified: (+new Date()),
                name: window.customVariables.currentTextEditorItem.name
            })

            blob.name = window.customVariables.currentTextEditorItem.name
            blob.lastModified = (+new Date())

            Object.defineProperty(blob, "type", {
                writable: true,
                value: "text/plain"
            })
        }
        catch(e){
            return console.log(e)
        }

        fileObject.fileEntry = blob
        fileObject.size = blob.size
        fileObject.name = window.customVariables.currentTextEditorItem.name
        fileObject.lastModified = (+new Date())
        fileObject.editorParent = window.customVariables.currentTextEditorItem.parent
        fileObject.type = "text/plain"

        queueFileUpload(self, fileObject)

        return window.customFunctions.dismissModal()
    }

    window.customFunctions.openTextEditor = async (item, content = "") => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
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

        setupStatusbar(self, "login/register")

        modal.onDidDismiss().then(() => {
            setupStatusbar(self)
        })

        utils.moveCursorToStart("editor-textarea")

        document.getElementById("editor-textarea").focus()

        return true
    }

    window.customFunctions.deleteSelectedItemsPermanently = async () => {
        let items = await getSelectedItems(self)

        window.customFunctions.dismissPopover()
        window.customFunctions.unselectAllItems()

        let alert = await alertController.create({
            header: language.get(self.state.lang, "deletePermanently"),
            message: language.get(self.state.lang, "deletePermanentlyConfirmationMultiple", true, ["__COUNT__"], [items.length]),
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "alertOkButton"),
                    handler: async () => {
                        let loading = await loadingController.create({
                            message: "",
                            backdropDismiss: false,
                            showBackdrop: false
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

                        for(let i = 0; i < self.state.itemList.length; i++){
                            if(!deletedUUIDs.includes(self.state.itemList[i].uuid)){
                                itemList.push(self.state.itemList[i])
                            }
                        }

                        self.setState({
                            itemList: itemList
                        }, () => {
                            self.forceUpdate()
                        })
            
                        return spawnToast(language.get(self.state.lang, "itemsDeletedPermanently", true, ["__COUNT__"], [deletedUUIDs.length]))
                    }
                }
            ]
        })
    
        return alert.present()
    }

    window.customFunctions.openOfflineFile = async (item) => {
        window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory + "/offlineFiles/" + item.uuid, (resolved) => {
            if(resolved.isFile){
                FileOpener.open(resolved.nativeURL, item.mime).then(() => {
                    console.log(resolved.nativeURL, item.mime)
                }).catch((err) => {
                    console.log(err)
                    console.log(resolved.nativeURL, item.mime)
    
                    return spawnToast(language.get(self.state.lang, "noAppFoundToOpenFile", true, ["__NAME__"], [item.name]))
                })
            }
            else{
                return spawnToast(language.get(self.state.lang, "couldNotGetDownloadDir"))
            }
        }, (err) => {
            console.log(err)

			return spawnToast(language.get(self.state.lang, "couldNotGetDownloadDir"))
        })
    }

    window.customFunctions.toggleCameraUploadEnabled = async () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.enabled

        if(newVal){
            if(typeof self.state.settings.cameraUpload.parent == "string"){
                if(self.state.settings.cameraUpload.parent.length <= 32){
                    return window.customFunctions.selectCameraUploadFolder()
                }
            }
            else{
                return window.customFunctions.selectCameraUploadFolder()
            }
        }

        newSettings.cameraUpload.enabled = newVal

        document.getElementById("camera-upload-enabled-toggle").checked = !newVal

        if(newVal){
            window.$("#camera-upload-select-folder-btn").hide()
        }
        else{
            window.$("#camera-upload-select-folder-btn").show()
        }

        await window.customFunctions.saveSettings(newSettings)

        return window.customFunctions.setupCameraUpload(newVal)
    }

    window.customFunctions.toggleCameraUploadPhotos = async () => {
        if(document.getElementById("camera-upload-photos-toggle").checked && !document.getElementById("camera-upload-videos-toggle").checked){
            setTimeout(() => {
                document.getElementById("camera-upload-photos-toggle").checked = true
            }, 1000)

            return false
        }

        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.photos

        newSettings.cameraUpload.photos = newVal

        document.getElementById("camera-upload-photos-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadVideos = async () => {
        if(document.getElementById("camera-upload-videos-toggle").checked && !document.getElementById("camera-upload-photos-toggle").checked){
            setTimeout(() => {
                document.getElementById("camera-upload-videos-toggle").checked = true
            }, 1000)

            return false
        }
        
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.videos

        newSettings.cameraUpload.videos = newVal

        document.getElementById("camera-upload-videos-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadHidden = async () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.hidden

        newSettings.cameraUpload.hidden = newVal

        document.getElementById("camera-upload-hidden-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadBurst = async () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.burst

        newSettings.cameraUpload.burst = newVal

        document.getElementById("camera-upload-burst-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadICloud = async () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.icloud

        newSettings.cameraUpload.icloud = newVal

        document.getElementById("camera-upload-icloud-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadShared = async () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.shared

        newSettings.cameraUpload.shared = newVal

        document.getElementById("camera-upload-shared-toggle").checked = !newVal

        window.customFunctions.saveSettings(newSettings)

        await window.customVariables.cameraUploadSemaphore.acquire()

        window.customVariables.cameraUpload.blockedIds = {}

        await window.customFunctions.saveCameraUpload()

        window.customVariables.cameraUploadSemaphore.release()

        return true
    }

    window.customFunctions.toggleCameraUploadConvertHeic = () => {
        let newSettings = self.state.settings
        let newVal = !newSettings.cameraUpload.convertHeic

        newSettings.cameraUpload.convertHeic = newVal

        document.getElementById("camera-upload-convert-heic-toggle").checked = !newVal

        return window.customFunctions.saveSettings(newSettings)
    }

    window.customFunctions.selectCameraUploadFolder = async () => {
        if(window.customVariables.cameraUploadRunning){
            return false
        }

        await window.customFunctions.dismissModal(true)

        let toast = await toastController.create({
            message: language.get(self.state.lang, "selectAFolder"),
            animated: false,
            buttons: [
                {
                    text: language.get(self.state.lang, "cancel"),
                    role: "cancel",
                    handler: () => {
                        window.customFunctions.openCameraUploadModal(true)

                        return false
                    }
                },
                {
                    text: language.get(self.state.lang, "select"),
                    handler: async () => {
                        let parent = utils.currentParentFolder()

                        if(parent.length <= 32){
                            return false
                        }

                        if(typeof window.customVariables.cachedFolders[parent] == "undefined"){
                            return false
                        }

                        if(typeof window.customVariables.cachedFolders[parent].uuid !== "string"){
                            return false
                        }

                        if(typeof window.customVariables.cachedFolders[parent].name !== "string"){
                            return false
                        }

                        var loading = await loadingController.create({
                            message: "",
                            showBackdrop: false
                        })
                    
                        loading.present()

                        let newSettings = self.state.settings

                        newSettings.cameraUpload.parent = window.customVariables.cachedFolders[parent].uuid
                        newSettings.cameraUpload.parentName = window.customVariables.cachedFolders[parent].name

                        await window.customFunctions.saveSettings(newSettings)

                        loading.dismiss()

                        if(self.state.settings.cameraUpload.enabled){
                            window.customFunctions.setupCameraUpload(true)
                        }

                        return window.customFunctions.openCameraUploadModal(true)
                    }
                }
            ]
        })
    
        return toast.present()
    }

    window.customFunctions.openCameraUploadModal = async (returnFromSelection = false) => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "camera-upload-modal-" + utils.generateRandomClassName()
        let appSettings = self.state.settings
        let appState = self.state

        let uploadedCount = (Object.keys(window.customVariables.cameraUpload.uploadedIds).length + Object.keys(window.customVariables.cameraUpload.blockedIds).length)
        let progress = ((uploadedCount / window.customVariables.cameraUpload.cachedIds.length) * 100)

        if(progress >= 100){
            progress = 100
        }

        if(isNaN(progress)){
            progress = 0
        }

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "cameraUpload") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "enabled") + `
                                </ion-label>
                                <ion-toggle slot="end" id="camera-upload-enabled-toggle" onClick="window.customFunctions.toggleCameraUploadEnabled()" ` + (appSettings.cameraUpload.enabled && "checked") + `></ion-toggle>
                            </ion-item>
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "settings") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "photos") + `
                                </ion-label>
                                <ion-toggle slot="end" id="camera-upload-photos-toggle" onClick="window.customFunctions.toggleCameraUploadPhotos()" ` + (appSettings.cameraUpload.photos && "checked") + `></ion-toggle>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "videos") + `
                                </ion-label>
                                <ion-toggle slot="end" id="camera-upload-videos-toggle" onClick="window.customFunctions.toggleCameraUploadVideos()" ` + (appSettings.cameraUpload.videos && "checked") + `></ion-toggle>
                            </ion-item>
                            ` + (isPlatform("ios") ? `
                                <ion-item lines="none">
                                    <ion-label>
                                        ` + language.get(appLang, "includeHidden") + `
                                    </ion-label>
                                    <ion-toggle slot="end" id="camera-upload-hidden-toggle" onClick="window.customFunctions.toggleCameraUploadHidden()" ` + (appSettings.cameraUpload.hidden && "checked") + `></ion-toggle>
                                </ion-item>
                                <ion-item lines="none">
                                    <ion-label>
                                        ` + language.get(appLang, "includeBurst") + `
                                    </ion-label>
                                    <ion-toggle slot="end" id="camera-upload-burst-toggle" onClick="window.customFunctions.toggleCameraUploadBurst()" ` + (appSettings.cameraUpload.burst && "checked") + `></ion-toggle>
                                </ion-item>
                                <ion-item lines="none">
                                    <ion-label>
                                        ` + language.get(appLang, "includeICloud") + `
                                    </ion-label>
                                    <ion-toggle slot="end" id="camera-upload-icloud-toggle" onClick="window.customFunctions.toggleCameraUploadICloud()" ` + (appSettings.cameraUpload.icloud && "checked") + `></ion-toggle>
                                </ion-item>
                                <ion-item lines="none">
                                    <ion-label>
                                        ` + language.get(appLang, "includeCloudShared") + `
                                    </ion-label>
                                    <ion-toggle slot="end" id="camera-upload-shared-toggle" onClick="window.customFunctions.toggleCameraUploadShared()" ` + (appSettings.cameraUpload.shared && "checked") + `></ion-toggle>
                                </ion-item>
                                <ion-item lines="none">
                                    <ion-label>
                                        ` + language.get(appLang, "convertHEICToJPG") + `
                                    </ion-label>
                                    <ion-toggle slot="end" id="camera-upload-convert-heic-toggle" onClick="window.customFunctions.toggleCameraUploadConvertHeic()" ` + (appSettings.cameraUpload.convertHeic && "checked") + `></ion-toggle>
                                </ion-item>
                            ` : ``) + `
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "folder") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "folder") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        ` + (appSettings.cameraUpload.parentName.length > 0 ? appSettings.cameraUpload.parentName : language.get(appLang, "selectAFolder")) + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item button lines="none" onClick="window.customFunctions.selectCameraUploadFolder()" id="camera-upload-select-folder-btn" ` + (window.customVariables.cameraUploadRunning || window.customVariables.cameraUploadEnabled ? `style="display: none;"` : ``) + `>
                                <ion-buttons>
                                    <ion-button size="small" fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `">
                                        ` + language.get(appLang, "selectAFolder") + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item-divider style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `">
                                <ion-label>
                                    ` + language.get(appLang, "cameraUploadInfo") + `
                                </ion-label>
                            </ion-item-divider>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "cameraUploadInfoTotal") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        <text id="camera-upload-total-text">` + window.customVariables.cameraUpload.cachedIds.length + `</text>
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "cameraUploadInfoUploaded") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        <text id="camera-upload-uploaded-text">` + Object.keys(window.customVariables.cameraUpload.uploadedIds).length + `</text>
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "filesIgnored") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        <text id="camera-upload-ignored-text">` + Object.keys(window.customVariables.cameraUpload.blockedIds).length + `</text>
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "progress") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="none">
                                        <text id="camera-upload-progress-text">` + progress.toFixed(2) + `%</text>
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                        </ion-list>
                    </ion-content>
                    <br><br><br><br><br><br><br>
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

        setupStatusbar(self, "modal")

        try{
            let sModal = await modalController.getTop()
    
            sModal.onDidDismiss().then(() => {
                if(returnFromSelection){
                    setupStatusbar(self)
                }

                clearInterval(window.customVariables.updateCameraUploadModalInterval)
            })
        }
        catch(e){
            console.log(e)
        }

        clearInterval(window.customVariables.updateCameraUploadModalInterval)

        window.customVariables.updateCameraUploadModalInterval = setInterval(() => {
            document.getElementById("camera-upload-total-text").innerHTML = window.customVariables.cameraUpload.cachedIds.length
            document.getElementById("camera-upload-uploaded-text").innerHTML = Object.keys(window.customVariables.cameraUpload.uploadedIds).length
            document.getElementById("camera-upload-ignored-text").innerHTML = Object.keys(window.customVariables.cameraUpload.blockedIds).length

            let uploadedCount = (Object.keys(window.customVariables.cameraUpload.uploadedIds).length + Object.keys(window.customVariables.cameraUpload.blockedIds).length)
            let progress = ((uploadedCount / window.customVariables.cameraUpload.cachedIds.length) * 100)

            if(progress >= 100){
                progress = 100
            }

            if(isNaN(progress)){
                progress = 0
            }

            document.getElementById("camera-upload-progress-text").innerHTML = progress.toFixed(2) + "%"
        }, 1000)

        return true
    }

    window.customFunctions.openAdvancedModal = async () => {
        let appLang = self.state.lang
        let appDarkMode = self.state.darkMode
        let modalId = "advanced-modal-" + utils.generateRandomClassName()

        customElements.define(modalId, class ModalContent extends HTMLElement {
            connectedCallback(){
                this.innerHTML = `
                    <ion-header class="ion-header-no-shadow" style="--background: transparent;">
                        <ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
                            <ion-buttons slot="start">
                                <ion-button onClick="window.customFunctions.dismissModal()">
                                    <ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
                                </ion-button>
                            </ion-buttons>
                            <ion-title>
                                ` + language.get(appLang, "advanced") + `
                            </ion-title>
                        </ion-toolbar>
                    </ion-header>
                    <ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
                        <ion-list>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "settingsDeleteAccount") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteAccount()">
                                        ` + language.get(appLang, "settingsDeleteButton") + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "settingsDeleteVersioned") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteVersioned()">
                                        ` + language.get(appLang, "settingsDeleteAllButton") + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none">
                                <ion-label>
                                    ` + language.get(appLang, "settingsDeleteAll") + `
                                </ion-label>
                                <ion-buttons slot="end">
                                    <ion-button fill="solid" color="danger" onClick="window.customFunctions.deleteEverything()">
                                        ` + language.get(appLang, "settingsDeleteAllButton") + `
                                    </ion-button>
                                </ion-buttons>
                            </ion-item>
                            <ion-item lines="none" button onClick="window.customFunctions.showGDPR()">
                                <ion-label>
                                    ` + language.get(appLang, "settingsShowGDPR") + `
                                </ion-label>
                            </ion-item>
                        </ion-list>
                    </ion-content>
                    <br><br><br><br><br><br><br>
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

        setupStatusbar(self, "modal")

        return true
    }

    window.customFunctions.getFolderSizeFromCache = (item, url) => {
        let cacheKey = ""

        if(url.indexOf("shared-out") !== -1){
            cacheKey = "shared:" + item.sharerId + ":" + item.receiverId + ":" + item.uuid
        }
        else if(url.indexOf("shared-in") !== -1){
            cacheKey = "shared:" + item.sharerId + ":" + item.receiverId + ":" + item.uuid
        }
        else if(url.indexOf("trash") !== -1){
            cacheKey = "trash:" + item.uuid
        }
        else{
            cacheKey = "normal:" + item.uuid
        }

        if(typeof window.customVariables.folderSizeCache[cacheKey] !== "undefined"){
            return window.customVariables.folderSizeCache[cacheKey]
        }
        else{
            return 0
        }
    }

    window.customFunctions.getFolderSize = async (item, url) => {
        const gotSize = (size) => {
            let items = self.state.itemList

            for(let i = 0; i < items.length; i++){
                if(items[i].uuid == item.uuid){
                    items[i].size = size
                }
            }

            window.customVariables.itemList = items

            return self.setState({
                itemList: items
            }, () => {
                self.forceUpdate()
            })
        }
    
        let payload = {}
        let cacheKey = ""
        let endpoint = "/v1/dir/size"
        
        if(url.indexOf("shared-out") !== -1){
            payload = {
                apiKey: window.customVariables.apiKey,
                uuid: item.uuid,
                sharerId: item.sharerId,
                receiverId: item.receiverId
            }
    
            cacheKey = "shared:" + item.sharerId + ":" + item.receiverId + ":" + item.uuid
        }
        else if(url.indexOf("shared-in") !== -1){
            payload = {
                apiKey: window.customVariables.apiKey,
                uuid: item.uuid,
                sharerId: item.sharerId,
                receiverId: item.receiverId
            }
    
            cacheKey = "shared:" + item.sharerId + ":" + item.receiverId + ":" + item.uuid
        }
        else if(url.indexOf("trash") !== -1){
            payload = {
                apiKey: window.customVariables.apiKey,
                uuid: item.uuid,
                sharerId: 0,
                receiverId: 0,
                trash: 1
            }
    
            cacheKey = "trash:" + item.uuid
        }
        else{
            payload = {
                apiKey: window.customVariables.apiKey,
                uuid: item.uuid,
                sharerId: 0,
                receiverId: 0
            }
    
            cacheKey = "normal:" + item.uuid
        }
    
        try{
            var res = await utils.apiRequest("POST", endpoint, payload)
        }
        catch(e){
            console.log(e)
    
            return false
        }
    
        if(!res.status){
            console.log(res.message)
    
            return false
        }
    
        window.customVariables.folderSizeCache[cacheKey] = res.data.size
    
        gotSize(window.customVariables.folderSizeCache[cacheKey])
    
        return window.customFunctions.saveFolderSizeCache()
    }
}