import * as language from "../utils/language"
import { toastController, actionSheetController, popoverController, alertController, loadingController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons';
import { Capacitor } from "@capacitor/core";
import * as workers from "../utils/workers"
import { isPlatform } from "@ionic/react"
import { Toast } from "@capacitor/toast"
import { Camera, CameraResultType, CameraSource, CameraDirection } from "@capacitor/camera"
import { queueFileUpload } from "./upload";
import { updateItemList, dirExists } from "./items";

const utils = require("../utils/utils")
const chooser = require("cordova-plugin-simple-file-chooser/www/chooser")
const mime = require("mime-types")

export async function spawnToast(message, duration = 3000){
    if(window.customVariables.isAppActive){
        //return false
    }

    if(Capacitor.isNative){
        if(Math.floor((+new Date()) / 1000) >= window.customVariables.nextNativeToastAllowed){
            window.customVariables.nextNativeToastAllowed = (Math.floor((+new Date()) / 1000) + 2)

            try{
                await Toast.show({
                    text: message,
                    duration: "short",
                    position: "bottom"
                })
            }
            catch(e){
                return console.log(e)
            }
        }
        else{
            return false
        }
    }
    else{
        let toast = await toastController.create({
            message,
            duration
        })
    
        return toast.present()
    }
}

export async function spawnMoveToast(self, callback){
    let toast = await toastController.create({
        message: language.get(self.state.lang, "selectDestination"),
        animated: false,
        buttons: [
            {
                text: language.get(self.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(self.state.lang, "moveItem"),
                handler: () => {
                    return callback(false, utils.currentParentFolder())
                }
            }
        ]
    })

    return toast.present()
}

export async function spawnRenamePrompt(self, item, callback){
    let name = item.name

    if(item.type == "file"){
        if(name.indexOf(".") !== -1){
            let nameEx = name.split(".")
    
            nameEx.pop()
    
            name = nameEx.join(".")
        }
    }

    window.$("#main-searchbar").find("input").blur()

    self.setState({
        mainSearchbarDisabled: true
    }, () => {
        self.forceUpdate()
    })

    let alert = await alertController.create({
        header: item.type == "file" ? language.get(self.state.lang, "renameFile") : language.get(self.state.lang, "renameFolder"),
        inputs: [
            {
                type: "text",
                id: "rename-item-input",
                name: "rename-item-input",
                value: name,
                attributes: {
                    autoCapitalize: "off",
                    autoComplete: "off"
                }
            }
        ],
        buttons: [
            {
                text: language.get(self.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(self.state.lang, "alertOkButton"),
                handler: (inputs) => {
                    return callback(false, inputs['rename-item-input'])
                }
            }
        ]
    })

    await alert.present()

    alert.onWillDismiss(async () => {
        self.setState({
            mainSearchbarDisabled: false
        }, () => {
            self.forceUpdate()
        })
    })

    setTimeout(() => {
        try{
            //document.querySelector("ion-alert input").focus()

            window.$("input").each(function(){
                if(window.$(this).attr("id") !== "main-searchbar"){
                    window.$(this).focus()
                }
                else{
                    window.$(this).focus()
                }
            })
        } catch(e){ }
    }, 500)

    return true
}

export async function mainFabAction(self){
    let hasInternet = false
    let fabButtons = []

    if(Capacitor.isNative){
        let networkStatus = window.customVariables.networkStatus

        if(networkStatus.connected){
            hasInternet = true
        }

        window.customVariables.networkStatus = networkStatus
    }

    if(!hasInternet){
        fabButtons.push({
            text: language.get(self.state.lang, "cancel"),
            icon: Ionicons.close,
            handler: () => {
                return actionSheet.dismiss()
            }
        })
    
        let actionSheet = await actionSheetController.create({
            buttons: fabButtons,
            showBackdrop: false
        })
    
        return actionSheet.present()
    }

    let parent = utils.currentParentFolder()
    let folderCreateBtnText = language.get(self.state.lang, "fabCreateFolder")
    let folderCreateNewFolderNameText = language.get(self.state.lang, "newFolderName")
    let folderCreatePlaceholderText = language.get(self.state.lang, "newFolderNamePlaceholder")
    let folderCreateInvalidNameText = language.get(self.state.lang, "invalidFolderName")

    if(parent == "base"){
        folderCreateBtnText = language.get(self.state.lang, "fabCreateDrive")
        folderCreateNewFolderNameText = language.get(self.state.lang, "newDriveName")
        folderCreatePlaceholderText = language.get(self.state.lang, "newDriveNamePlaceholder")
        folderCreateInvalidNameText = language.get(self.state.lang, "invalidDriveName")
    }

    fabButtons.push({
        text: folderCreateBtnText,
        icon: Ionicons.addCircle,
        handler: async () => {
            let alert = await alertController.create({
                header: folderCreateNewFolderNameText,
                inputs: [
                    {
                        type: "text",
                        id: "new-folder-name-input",
                        name: "new-folder-name-input",
                        placeholder: folderCreatePlaceholderText,
                        attributes: {
                            autoCapitalize: "off",
                            autoComplete: "off"
                        }
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
                            if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1] !== "string"){
                                return spawnToast("No encryption keys found, try restarting the app")
                            }
                        
                            if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1].length <= 16){
                                return spawnToast("No encryption keys found, try restarting the app")
                            }

                            let name = inputs['new-folder-name-input']

                            name = name.replace(/\s*$/, "")

                            if(utils.fileNameValidationRegex(name)){
                                return spawnToast(folderCreateInvalidNameText)
                            }

                            if(!name || typeof name !== "string"){
                                return spawnToast(folderCreateInvalidNameText)
                            }

                            if(name.length <= 0){
                                return spawnToast(folderCreateInvalidNameText)
                            }
                            
                            let folderParent = null
                            let folderUUID = utils.uuidv4()

                            if(parent !== "base"){
                                folderParent = parent
                            }

                            let loading = await loadingController.create({
                                message: "",
                                showBackdrop: false
                            })

                            loading.present()

                            return dirExists(self, name, folderParent, async (err, exists, existsUUID) => {
                                if(err){
                                    console.log(err)

                                    loading.dismiss()
                
                                    return spawnToast(language.get(self.state.lang, "apiRequestError"))
                                }
                
                                if(exists){
                                    loading.dismiss()
                
                                    return spawnToast(language.get(self.state.lang, "folderNameAlreadyExistsCreate", true, ["__NAME__"], [name]))
                                }

                                try{
                                    if(parent == "base"){
                                        var res = await utils.apiRequest("POST", "/v1/dir/create", {
                                            apiKey: self.state.userAPIKey,
                                            uuid: folderUUID,
                                            name: await utils.encryptMetadata(JSON.stringify({
                                                name: name
                                            }), self.state.userMasterKeys[self.state.userMasterKeys.length - 1]),
                                            nameHashed: utils.hashFn(name.toLowerCase())
                                        })
                                    }
                                    else{
                                        var res = await utils.apiRequest("POST", "/v1/dir/sub/create", {
                                            apiKey: self.state.userAPIKey,
                                            uuid: folderUUID,
                                            name: await utils.encryptMetadata(JSON.stringify({
                                                name: name
                                            }), self.state.userMasterKeys[self.state.userMasterKeys.length - 1]),
                                            nameHashed: utils.hashFn(name.toLowerCase()),
                                            parent: folderParent
                                        })
                                    }
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

                                if(parent !== "base"){
                                    utils.checkIfItemParentIsBeingShared(folderParent, "folder", {
                                        uuid: folderUUID,
                                        name: name
                                    }, () => {
                                        loading.dismiss()

                                        spawnToast(language.get(self.state.lang, "folderCreated", true, ["__NAME__"], [name]))

                                        clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                        window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                            updateItemList(self)
                                        }, 500)
                                    })
                                }
                                else{
                                    loading.dismiss()

                                    spawnToast(language.get(self.state.lang, "driveCreated", true, ["__NAME__"], [name]))

                                    clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                    window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                        updateItemList(self)
                                    }, 500)
                                }
                            })
                        }
                    }
                ]
            })
        
            await alert.present()

            setTimeout(() => {
                try{
                    document.querySelector("ion-alert input").focus()
                } catch(e){ }
            }, 500)

            return true
        }
    })

    if(parent !== "base"){
        fabButtons.push({
            text: language.get(self.state.lang, "fabCreateTextFile"),
            icon: Ionicons.createOutline,
            handler: async () => {
                let alert = await alertController.create({
                    header: language.get(self.state.lang, "fabCreateTextFile"),
                    inputs: [
                        {
                            type: "text",
                            id: "new-text-file-name-input",
                            name: "new-text-file-name-input",
                            value: ".txt",
                            placeholder: language.get(self.state.lang, "fabCreateTextFilePlaceholder"),
                            attributes: {
                                autoCapitalize: "off",
                                autoComplete: "off"
                            }
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
                            text: language.get(self.state.lang, "fabCreateBtn"),
                            handler: async (inputs) => {
                                window.customFunctions.isIndexEmpty()
    
                                if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1] !== "string"){
                                    return spawnToast("No encryption keys found, try restarting the app")
                                }
                            
                                if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1].length <= 16){
                                    return spawnToast("No encryption keys found, try restarting the app")
                                }
    
                                let name = inputs['new-text-file-name-input']
    
                                name = name.replace(/\s*$/, "")
    
                                if(utils.fileNameValidationRegex(name)){
                                    return spawnToast(language.get(self.state.lang, "fabCreateTextFileInvalidName"))
                                }
    
                                if(!name || typeof name !== "string"){
                                    return spawnToast(language.get(self.state.lang, "fabCreateTextFileInvalidName"))
                                }
    
                                if(name.length <= 0){
                                    return spawnToast(language.get(self.state.lang, "fabCreateTextFileInvalidName"))
                                }
    
                                let ext = name.split(".")
                                ext = ext[ext.length - 1]
    
                                let fileType = utils.getFilePreviewType(ext)
    
                                if(!["code", "text"].includes(fileType)){
                                    return spawnToast(language.get(self.state.lang, "fabCreateTextFileInvalidName"))
                                }
    
                                let uploadParent = ""
    
                                if(utils.currentParentFolder() == "base"){
                                    let defaultFolderUUID = undefined
                    
                                    for(let i = 0; i < self.state.itemList.length; i++){
                                        if(self.state.itemList[i].isDefault){
                                            defaultFolderUUID = self.state.itemList[i].uuid
                                        }
                                    }
                    
                                    if(typeof defaultFolderUUID !== "undefined"){
                                        self.routeTo("/base/" + defaultFolderUUID)
                                    }
    
                                    uploadParent = defaultFolderUUID
                                }
                                else{
                                    uploadParent = utils.currentParentFolder()
                                }
                                
                                let item = {
                                    name: name,
                                    parent: uploadParent
                                }
    
                                return window.customFunctions.openTextEditor(item, "")
                            }
                        }
                    ]
                })
            
                await alert.present()
    
                setTimeout(() => {
                    try{
                        utils.moveCursorToStart("ion-alert input", true)
    
                        document.querySelector("ion-alert input").focus()
                    } catch(e){ }
                }, 500)
    
                return true
            }
        })
    
        fabButtons.push({
            text: language.get(self.state.lang, "fabTakeImage"),
            icon: Ionicons.camera,
            handler: async () => {
                window.customFunctions.isIndexEmpty()
    
                if(!Capacitor.isNative){
                    return false
                }
    
                if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1] !== "string"){
                    return spawnToast("No encryption keys found, try restarting the app")
                }
            
                if(typeof self.state.userMasterKeys[self.state.userMasterKeys.length - 1].length <= 16){
                    return spawnToast("No encryption keys found, try restarting the app")
                }
    
                if(Capacitor.isNative){
                    if(self.state.settings.onlyWifi){
                        let networkStatus = self.state.networkStatus
            
                        if(networkStatus.connectionType !== "wifi"){
                            return spawnToast(language.get(self.state.lang, "onlyWifiError"))
                        }
                    }
                }
    
                if(utils.currentParentFolder() == "base"){
                    let defaultFolderUUID = undefined
    
                    for(let i = 0; i < self.state.itemList.length; i++){
                        if(self.state.itemList[i].isDefault){
                            defaultFolderUUID = self.state.itemList[i].uuid
                        }
                    }
    
                    if(typeof defaultFolderUUID !== "undefined"){
                        self.routeTo("/base/" + defaultFolderUUID)
                    }
                }
    
                try{
                    var image = await Camera.getPhoto({
                        quality: 100,
                        allowEditing: false,
                        resultType: CameraResultType.Base64,
                        saveToGallery: false,
                        source: CameraSource.Camera,
                        direction: CameraDirection.Rear,
                        presentationStyle: "fullscreen"
                    })
                }
                catch(e){
                    console.log(e)
    
                    return false
                }
    
                workers.convertBase64ToArrayBuffer(image.base64String, async (err, arrayBuffer) => {
                    let fileObject = {}
    
                    fileObject.name = language.get(self.state.lang, "photo") + "_" + new Date().toDateString().split(" ").join("_") + "_" + utils.unixTimestamp() + ".jpg"
                    
                    try{
                        var blob = await workers.newBlob(arrayBuffer, {
                            name: fileObject.name,
                            lastModified: (+new Date())
                        })
    
                        blob.name = fileObject.name
                        blob.lastModified = (+new Date())
    
                        Object.defineProperty(blob, "type", {
                            writable: true,
                            value: "image/jpeg"
                        })
                    }
                    catch(e){
                        return console.log(e)
                    }
    
                    fileObject.size = blob.size
                    fileObject.fileEntry = blob
                    fileObject.type = "image/jpeg"
                    fileObject.lastModified = new Date()

                    blob = null
                    arrayBuffer = null
    
                    return queueFileUpload(self, fileObject)
                })
            }
        })
    
        if(isPlatform("ios")){
            fabButtons.push({
                text: language.get(self.state.lang, "fabUploadFromGallery"),
                icon: Ionicons.cloudUpload,
                handler: async () => {
                    window.customFunctions.isIndexEmpty()
    
                    if(Capacitor.isNative){
                        if(self.state.settings.onlyWifi){
                            let networkStatus = self.state.networkStatus
                
                            if(networkStatus.connectionType !== "wifi"){
                                return spawnToast(language.get(self.state.lang, "onlyWifiError"))
                            }
                        }
                    }
                    
                    if(utils.currentParentFolder() == "base"){
                        let defaultFolderUUID = undefined
        
                        for(let i = 0; i < self.state.itemList.length; i++){
                            if(self.state.itemList[i].isDefault){
                                defaultFolderUUID = self.state.itemList[i].uuid
                            }
                        }
        
                        if(typeof defaultFolderUUID !== "undefined"){
                            self.routeTo("/base/" + defaultFolderUUID)
                        }
                    }
        
                    actionSheet.dismiss()
    
                    try{
                        var files = await new Promise((resolve, reject) => {
                            window.MediaPicker.getMedias({
                                selectMode: 101,
                                maxSelectCount: 50,
                                maxSelectSize: 99999999999999999,
                                convertHeic: (self.state.settings.convertHeic ? 1 : 0)
                            }, (files) => {
                                return resolve(files)
                            }, (err) => {
                                return reject(err)
                            })
                        })
                    }
                    catch(e){
                        return console.log(e)
                    }
    
                    for(let i = 0; i < files.length; i++){
                        let sFile = files[i]

                        await window.customVariables.fsCopySemaphore.acquire()
    
                        try{
                            let fileObj = await new Promise((resolve, reject) => {
                                let tempName = "TEMP_UPLOAD_" + utils.uuidv4()
                                let fileObject = {}
    
                                fileObject.tempName = tempName
    
                                window.resolveLocalFileSystemURL(sFile.uri, (resolved) => {
                                    if(resolved.isFile){
                                        resolved.file((resolvedFile) => {
                                            let strippedName = resolvedFile.name
    
                                            if(isPlatform("ios")){
                                                if(strippedName.indexOf("IMG_") !== -1 && strippedName.length >= 59){
                                                    let ex = strippedName.split("IMG_")
    
                                                    strippedName = "IMG_" + ex[1]
                                                }
                                            }
    
                                            fileObject.name = strippedName
                                            fileObject.lastModified = Math.floor(resolvedFile.lastModified)
                                            fileObject.size = resolvedFile.size
                                            fileObject.type = resolvedFile.type
                
                                            window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (dirEntry) => {
                                                resolved.copyTo(dirEntry, tempName, () => {
                                                    window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory + "/" + tempName, (tempFile) => {
                                                        tempFile.file((file) => {
                                                            fileObject.fileEntry = file
                                                            fileObject.tempFileEntry = tempFile
                
                                                            return resolve(fileObject)
                                                        }, (err) => {
                                                            return reject(err)
                                                        })
                                                    }, (err) => {
                                                        return reject(err)
                                                    })
                                                }, (err) => {
                                                    return reject(err)
                                                })
                                            }, (err) => {
                                                return reject(err)
                                            })
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
    
                            queueFileUpload(self, fileObj)
                        }
                        catch(e){
                            console.log(e)
    
                            spawnToast(language.get(self.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], ["file"]))
                        }
    
                        window.customVariables.fsCopySemaphore.release()
                    }
    
                    return true
                }
            })
        }
    
        fabButtons.push({
            text: language.get(self.state.lang, "fabUploadFiles"),
            icon: Ionicons.cloudUpload,
            handler: async () => {
                window.customFunctions.isIndexEmpty()
    
                if(Capacitor.isNative){
                    if(self.state.settings.onlyWifi){
                        let networkStatus = self.state.networkStatus
            
                        if(networkStatus.connectionType !== "wifi"){
                            return spawnToast(language.get(self.state.lang, "onlyWifiError"))
                        }
                    }
                }
                
                if(utils.currentParentFolder() == "base"){
                    let defaultFolderUUID = undefined
    
                    for(let i = 0; i < self.state.itemList.length; i++){
                        if(self.state.itemList[i].isDefault){
                            defaultFolderUUID = self.state.itemList[i].uuid
                        }
                    }
    
                    if(typeof defaultFolderUUID !== "undefined"){
                        self.routeTo("/base/" + defaultFolderUUID)
                    }
                }
    
                actionSheet.dismiss()
    
                if(isPlatform("android")){
                    return window.$("#file-input-dummy").click()
                }
    
                try{
                    var selectedFilesChooser = await chooser.getFile()
                }
                catch(e){
                    return console.log(e)
                }
    
                let selectedFiles = []
    
                if(typeof selectedFilesChooser[0] == "object"){
                    for(let i = 0; i < selectedFilesChooser.length; i++){
                        selectedFiles.push(selectedFilesChooser[i])
                    }
                }
                else{
                    selectedFiles.push(selectedFilesChooser)
                }
    
                for(let i = 0; i < selectedFiles.length; i++){
                    let sFile = selectedFiles[i]
    
                    await window.customVariables.fsCopySemaphore.acquire()
    
                    try{
                        let fileObj = await new Promise((resolve, reject) => {
                            let tempName = "TEMP_UPLOAD_" + utils.uuidv4()
                            let fileObject = {}
    
                            fileObject.tempName = tempName
    
                            window.resolveLocalFileSystemURL(sFile.uri, (resolved) => {
                                if(resolved.isFile){
                                    resolved.file((resolvedFile) => {
                                        fileObject.name = resolvedFile.name
                                        fileObject.lastModified = Math.floor(resolvedFile.lastModified)
                                        fileObject.size = resolvedFile.size
                                        fileObject.type = resolvedFile.type
    
                                        window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory, (dirEntry) => {
                                            resolved.copyTo(dirEntry, tempName, () => {
                                                window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory + "/" + tempName, (tempFile) => {
                                                    tempFile.file((file) => {
                                                        fileObject.fileEntry = file
                                                        fileObject.tempFileEntry = tempFile
    
                                                        return resolve(fileObject)
                                                    }, (err) => {
                                                        return reject(err)
                                                    })
                                                }, (err) => {
                                                    return reject(err)
                                                })
                                            }, (err) => {
                                                return reject(err)
                                            })
                                        }, (err) => {
                                            return reject(err)
                                        })
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
    
                        queueFileUpload(self, fileObj)
                    }
                    catch(e){
                        console.log(e)
    
                        spawnToast(language.get(self.state.lang, "fileUploadCouldNotReadFile", true, ["__NAME__"], ["file"]))
                    }
    
                    window.customVariables.fsCopySemaphore.release()
                }

                return true
            }
        })
    }

    fabButtons.push({
        text: language.get(self.state.lang, "cancel"),
        icon: Ionicons.close,
        handler: () => {
            return actionSheet.dismiss()
        }
    })

    let actionSheet = await actionSheetController.create({
        buttons: fabButtons,
        showBackdrop: false
    })

    return actionSheet.present()
}

export async function mainMenuPopover(event){
    event.persist()

    let isDeviceOnline = window.customFunctions.isDeviceOnline()
    let customElementId = utils.generateRandomClassName()

    window.customElements.define(customElementId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-list>
                    ` + (window.location.href.indexOf("recent") !== -1 ? `` : `<ion-item lines="none" detail="false" button onClick="window.customFunctions.openOrderBy()">` + language.get(window.customVariables.lang, "orderBy") + `</ion-item>`) + `
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(window.customVariables.lang, "selectAll") + `</ion-item>
                    ` + (isDeviceOnline ? `<ion-item lines="none" detail="false" button onClick="window.customFunctions.refreshItemList()">` + language.get(window.customVariables.lang, "refresh") + `</ion-item>` : ``) + `
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.toggleGridMode()">` + language.get(window.customVariables.lang, "toggleGridMode") + `</ion-item>
                    <!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(window.customVariables.lang, "close") + `</ion-item>-->
                </ion-list>
            `
        }
    })

    let popover = await popoverController.create({
        component: customElementId,
        event: event,
        showBackdrop: false
    })

    return popover.present()
}