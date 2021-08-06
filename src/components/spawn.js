import * as language from "../utils/language"
import { toastController, actionSheetController, popoverController, alertController, loadingController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons';
import { Capacitor, Plugins, CameraResultType, CameraSource, CameraDirection } from "@capacitor/core";
import * as workers from "../utils/workers"

const utils = require("../utils/utils")

export async function spawnToast(message, duration = 3000){
    if(Capacitor.isNative){
        if(Math.floor((+new Date()) / 1000) >= window.customVariables.nextNativeToastAllowed){
            window.customVariables.nextNativeToastAllowed = (Math.floor((+new Date()) / 1000) + 2)

            try{
                await Plugins.Toast.show({
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

export async function spawnMoveToast(callback){
    let toast = await toastController.create({
        message: language.get(this.state.lang, "selectDestination"),
        animated: false,
        buttons: [
            {
                text: language.get(this.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(this.state.lang, "moveItem"),
                handler: () => {
                    return callback(false, utils.currentParentFolder())
                }
            }
        ]
    })

    return toast.present()
}

export async function spawnRenamePrompt(item, callback){
    let name = item.name

    if(item.type == "file"){
        if(name.indexOf(".") !== -1){
            let nameEx = name.split(".")
    
            nameEx.pop()
    
            name = nameEx.join(".")
        }
    }

    window.$("#main-searchbar").find("input").blur()

    this.setState({
        mainSearchbarDisabled: true
    })

    let alert = await alertController.create({
        header: item.type == "file" ? language.get(this.state.lang, "renameFile") : language.get(this.state.lang, "renameFolder"),
        inputs: [
            {
                type: "text",
                id: "rename-item-input",
                name: "rename-item-input",
                value: name
            }
        ],
        buttons: [
            {
                text: language.get(this.state.lang, "cancel"),
                role: "cancel",
                handler: () => {
                    return callback(true)
                }
            },
            {
                text: language.get(this.state.lang, "alertOkButton"),
                handler: (inputs) => {
                    return callback(false, inputs['rename-item-input'])
                }
            }
        ]
    })

    await alert.present()

    alert.onWillDismiss(() => {
        this.setState({
            mainSearchbarDisabled: false
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

export async function mainFabAction(){
    let actionSheet = await actionSheetController.create({
        buttons: [
            {
                text: language.get(this.state.lang, "fabCreateFolder"),
                icon: Ionicons.folderOpen,
                handler: async () => {
                    let alert = await alertController.create({
                        header: language.get(this.state.lang, "newFolderName"),
                        inputs: [
                            {
                                type: "text",
                                id: "new-folder-name-input",
                                name: "new-folder-name-input",
                                placeholder: language.get(this.state.lang, "newFolderNamePlaceholder")
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
                                    let name = inputs['new-folder-name-input']

                                    name = utils.removeIllegalCharsFromString(name)

                                    if(utils.checkIfNameIsBanned(name) || utils.folderNameRegex(name) || utils.fileNameValidationRegex(name)){
                                        return this.spawnToast(language.get(this.state.lang, "invalidFolderName"))
                                    }

                                    if(!name || typeof name !== "string"){
                                        return false
                                    }

                                    if(name.length <= 0){
                                        return false
                                    }

                                    let parent = utils.currentParentFolder()
                                    let folderParent = null
                                    let folderUUID = utils.uuidv4()

                                    if(parent !== "base"){
                                        folderParent = parent
                                    }

                                    let loading = await loadingController.create({
                                        message: ""
                                    })

                                    loading.present()

                                    this.dirExists(name, folderParent, async (err, exists, existsUUID) => {
                                        if(err){
                                            console.log(err)

                                            loading.dismiss()
                        
                                            return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
                                        }
                        
                                        if(exists){
                                            loading.dismiss()
                        
                                            return this.spawnToast(language.get(this.state.lang, "folderNameAlreadyExistsCreate", true, ["__NAME__"], [name]))
                                        }

                                        try{
                                            if(parent == "base"){
                                                var res = await utils.apiRequest("POST", "/v1/dir/create", {
                                                    apiKey: this.state.userAPIKey,
                                                    uuid: folderUUID,
                                                    name: await utils.encryptMetadata(JSON.stringify({
                                                        name: name
                                                    }), this.state.userMasterKeys[this.state.userMasterKeys.length - 1]),
                                                    nameHashed: utils.hashFn(name.toLowerCase())
                                                })
                                            }
                                            else{
                                                var res = await utils.apiRequest("POST", "/v1/dir/sub/create", {
                                                    apiKey: this.state.userAPIKey,
                                                    uuid: folderUUID,
                                                    name: await utils.encryptMetadata(JSON.stringify({
                                                        name: name
                                                    }), this.state.userMasterKeys[this.state.userMasterKeys.length - 1]),
                                                    nameHashed: utils.hashFn(name.toLowerCase()),
                                                    parent: folderParent
                                                })
                                            }
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

                                        if(parent !== "base"){
                                            utils.checkIfItemParentIsBeingShared(folderParent, "folder", {
                                                uuid: folderUUID,
                                                name: name
                                            }, () => {
                                                loading.dismiss()

                                                this.spawnToast(language.get(this.state.lang, "folderCreated", true, ["__NAME__"], [name]))

                                                clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                                window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                                    this.updateItemList()
                                                }, 500)
                                            })
                                        }
                                        else{
                                            loading.dismiss()

                                            this.spawnToast(language.get(this.state.lang, "folderCreated", true, ["__NAME__"], [name]))

                                            clearTimeout(window.customVariables.reloadAfterActionTimeout)

                                            window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
                                                this.updateItemList()
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
            },
            {
                text: language.get(this.state.lang, "fabTakeImage"),
                icon: Ionicons.camera,
                handler: async () => {
                    if(!Capacitor.isNative){
                        return false
                    }

                    if(utils.currentParentFolder() == "base"){
                        this.routeTo("/base/default")
                    }

                    try{
                        var image = await Plugins.Camera.getPhoto({
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

                    workers.convertBase64ToArrayBuffer(image.base64String, (arrayBuffer) => {
                        let name = language.get(this.state.lang, "photo") + "_" + new Date().toDateString().split(" ").join("_") + "_" + utils.unixTimestamp() + ".jpeg"

                        try{
                            var blob = new File([arrayBuffer], name, {
                                type: "image/jpeg",
                                size: arrayBuffer.byteLength,
                                lastModified: new Date()
                            })
                        }
                        catch(e){
                            return console.log(e)
                        }

                        return this.queueFileUpload(blob)
                    })
                }
            },
            {
                text: language.get(this.state.lang, "fabUploadFiles"),
                icon: Ionicons.cloudUpload,
                handler: async () => {
                    if(utils.currentParentFolder() == "base"){
                        this.routeTo("/base/default")
                    }

                    return document.getElementById("file-input-dummy").click()
                }
            },
            {
                text: language.get(this.state.lang, "cancel"),
                icon: Ionicons.close,
                handler: () => {
                    return actionSheet.dismiss()
                }
            }
        ]
    })

    return actionSheet.present()
}

export async function mainMenuPopover(event){
    event.persist()

    let customElementId = utils.generateRandomClassName()

    window.customElements.define(customElementId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = `
                <ion-list>
                    ` + (window.location.href.indexOf("recent") !== -1 ? `` : `<ion-item lines="none" detail="false" button onClick="window.customFunctions.openOrderBy()">` + language.get(window.customVariables.lang, "orderBy") + `</ion-item>`) + `
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(window.customVariables.lang, "selectAll") + `</ion-item>
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.refreshItemList()">` + language.get(window.customVariables.lang, "refresh") + `</ion-item>
                    <ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(window.customVariables.lang, "close") + `</ion-item>
                </ion-list>
            `
        }
    })

    let popover = await popoverController.create({
        component: customElementId,
        event: event
    })

    return popover.present()
}