import * as language from "../utils/language"
import { loadingController, modalController, popoverController, alertController, actionSheetController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { Capacitor, HapticsImpactStyle, Plugins } from "@capacitor/core"
import { FileOpener } from "@ionic-native/file-opener"

const utils = require("../utils/utils")

export async function updateItemList(){
	if(!this.state.isLoggedIn){
		return this.showLogin()
	}
	
	if(this.state.userAPIKey.length <= 16){
		return this.showLogin()
	}

	this.setState({
        searchbarOpen: false,
        mainSearchTerm: ""
    })

	let routeEx = window.location.hash.split("/")
	let parent = routeEx[routeEx.length - 1]

	if(Capacitor.isNative){
		setTimeout(() => {
			Capacitor.Plugins.Keyboard.hide()
		}, 100)
	}

    let loading = await loadingController.create({
        message: ""
    })

	loading.present()
	
	if(parent == "base"){
		try{
			var res = await utils.apiRequest("POST", "/v1/user/baseFolders", {
				apiKey: this.state.userAPIKey
			})
		}
		catch(e){
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
			console.log(res.message)
	
			window.customFunctions.dismissLoader()
	
			let alert = await alertController.create({
				header: "",
				subHeader: "",
				message: language.get(this.state.lang, "apiRequestError"),
				buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
			})
	
			return alert.present()
		}

		let items = []

		items.push({
			type: "folder",
			uuid: "default",
			name: "Default",
			date: language.get(this.state.lang, "defaultFolder"),
			timestamp: ((+new Date()) / 1000),
			parent: "base",
			receiverId: 0,
			receiverEmail: "",
			sharerId: 0,
			sharerEmail: ""
		})

		for(let i = 0; i < res.data.folders.length; i++){
			let folder = res.data.folders[i]

			let folderName = utils.decryptCryptoJSFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
			let uploadDate = (new Date(folder.timestamp * 1000)).toString().split(" ")

			let item = {
				type: "folder",
				uuid: folder.uuid,
				name: utils.sanitizeHTML(folderName),
				date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
				timestamp: folder.timestamp,
				parent: "base",
				receiverId: 0,
				receiverEmail: "",
				sharerId: 0,
				sharerEmail: ""
			}

			items.push(item)

			window.customVariables.cachedFolders[folder.uuid] = item
		}

		window.customVariables.itemList = items

		this.setState({
			itemList: items
		})

		loading.dismiss()

		return true
	}
	else{
		if(routeEx[1] == "shared-in"){
			try{
				var usrPrivKey = await window.crypto.subtle.importKey("pkcs8", utils._base64ToArrayBuffer(this.state.userPrivateKey), {
					name: "RSA-OAEP",
					hash: "SHA-512"
				}, true, ["decrypt"])
			}
			catch(e){
				console.log(e)
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "unknownDeviceError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/user/shared/in", {
					apiKey: this.state.userAPIKey,
					uuid: parent,
					folders: JSON.stringify(["shred-in"]),
					page: 1,
					app: "true"
				})
			}
			catch(e){
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
				console.log(res.message)
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "apiRequestError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let items = []

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				try{
					let folderName = undefined

					if(window.customVariables.cachedFolders[folder.uuid]){
						folderName = window.customVariables.cachedFolders[folder.uuid]
					}
					else{
						let decrypted = await window.crypto.subtle.decrypt({
							name: "RSA-OAEP"
						}, usrPrivKey, utils._base64ToArrayBuffer(folder.metadata))

						decrypted = JSON.parse(new TextDecoder().decode(decrypted))

						window.customVariables.cachedFolders[folder.uuid] = decrypted
	
						folderName = decrypted
					}

					folderName = folderName.name

					let uploadDate = (new Date(folder.timestamp * 1000)).toString().split(" ")

					let item = {
						type: "folder",
						uuid: folder.uuid,
						name: utils.sanitizeHTML(folderName),
						date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
						timestamp: folder.timestamp,
						parent: folder.parent,
						receiverId: 0,
						receiverEmail: "",
						sharerId: folder.sharerId,
						sharerEmail: folder.sharerEmail
					}

					items.push(item)

					window.customVariables.cachedFolders[folder.uuid] = item
				}
				catch(e){
					console.log(e)
				}
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				try{
					let decryptedMetadata = undefined

					if(window.customVariables.cachedFiles[file.uuid]){
						decryptedMetadata = window.customVariables.cachedFiles[file.uuid]
					}
					else{
						let decrypted = await window.crypto.subtle.decrypt({
							name: "RSA-OAEP"
						}, usrPrivKey, utils._base64ToArrayBuffer(file.metadata))

						decrypted = JSON.parse(new TextDecoder().decode(decrypted))

						window.customVariables.cachedFiles[file.uuid] = decrypted
	
						decryptedMetadata = decrypted
					}

					let uploadDate = (new Date(file.timestamp * 1000)).toString().split(" ")

					let offline = false

					if(typeof window.customVariables.offlineSavedFiles[file.uuid] !== "undefined"){
						offline = true
					}

					let item = {
						type: "file",
						uuid: file.uuid,
						name: utils.sanitizeHTML(decryptedMetadata.name),
						mime: utils.sanitizeHTML(decryptedMetadata.mime),
						size: parseInt(decryptedMetadata.size),
						key: utils.sanitizeHTML(decryptedMetadata.key),
						bucket: file.bucket,
						region: file.region,
						parent: file.parent,
						rm: file.rm,
						chunks: file.chunks,
						date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
						timestamp: file.timestamp,
						receiverId: 0,
						receiverEmail: "",
						sharerId: file.sharerId,
						sharerEmail: file.sharerEmail,
						offline: offline
					}

					items.push(item)

					window.customVariables.cachedFiles[file.uuid] = item
				}
				catch(e){
					console.log(e)
				}
			}

			window.customVariables.itemList = items

			this.setState({
				itemList: items
			})

			loading.dismiss()

			return true
		}
		else if(routeEx[1] == "shared-out"){
			try{
				var res = await utils.apiRequest("POST", "/v1/user/shared/out", {
					apiKey: this.state.userAPIKey,
					uuid: parent,
					folders: JSON.stringify(["default"]),
					page: 1,
					app: "true",
					receiverId: this.state.currentReceiverId
				})
			}
			catch(e){
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
				console.log(res.message)
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "apiRequestError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let items = []

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				let folderName = utils.decryptCryptoJSFolderName(folder.metadata, this.state.userMasterKeys, folder.uuid)
				let uploadDate = (new Date(folder.timestamp * 1000)).toString().split(" ")

				let item = {
					type: "folder",
					uuid: folder.uuid,
					name: utils.sanitizeHTML(folderName),
					date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
					timestamp: folder.timestamp,
					parent: folder.parent,
					receiverId: folder.receiverId,
					receiverEmail: folder.receiverEmail,
					sharerId: 0,
					sharerEmail: ""
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				let metadata = utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)
				let uploadDate = (new Date(file.timestamp * 1000)).toString().split(" ")

				let offline = false

				if(typeof window.customVariables.offlineSavedFiles[file.uuid] !== "undefined"){
					offline = true
				}

				let item = {
					type: "file",
					uuid: file.uuid,
					name: utils.sanitizeHTML(metadata.name),
					mime: utils.sanitizeHTML(metadata.mime),
					size: parseInt(metadata.size),
					key: utils.sanitizeHTML(metadata.key),
					bucket: file.bucket,
					region: file.region,
					parent: file.parent,
					rm: file.rm,
					chunks: file.chunks,
					date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
					timestamp: file.timestamp,
					receiverId: file.receiverId,
					receiverEmail: file.receiverEmail,
					sharerId: 0,
					sharerEmail: "",
					offline: offline
				}

				items.push(item)

				window.customVariables.cachedFiles[file.uuid] = item
			}

			window.customVariables.itemList = items

			this.setState({
				itemList: items
			})

			loading.dismiss()

			return true
		}
		else{
			try{
				var res = await utils.apiRequest("POST", "/v1/dir/content", {
					apiKey: this.state.userAPIKey,
					uuid: parent,
					folders: JSON.stringify(["default"]),
					page: 1,
					app: "true"
				})
			}
			catch(e){
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
				console.log(res.message)
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "apiRequestError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let items = []

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				let folderName = utils.decryptCryptoJSFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
				let uploadDate = (new Date(folder.timestamp * 1000)).toString().split(" ")

				let item = {
					type: "folder",
					uuid: folder.uuid,
					name: utils.sanitizeHTML(folderName),
					date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
					timestamp: folder.timestamp,
					parent: folder.parent,
					receiverId: 0,
					receiverEmail: "",
					sharerId: 0,
					sharerEmail: ""
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				let metadata = utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)
				let uploadDate = (new Date(file.timestamp * 1000)).toString().split(" ")

				let offline = false

				if(typeof window.customVariables.offlineSavedFiles[file.uuid] !== "undefined"){
					offline = true
				}

				let item = {
					type: "file",
					uuid: file.uuid,
					name: utils.sanitizeHTML(metadata.name),
					mime: utils.sanitizeHTML(metadata.mime),
					size: parseInt(metadata.size),
					key: utils.sanitizeHTML(metadata.key),
					bucket: file.bucket,
					region: file.region,
					parent: file.parent,
					rm: file.rm,
					chunks: file.chunks,
					date: uploadDate[1] + " " + uploadDate[2] + " " + uploadDate[3] + " " + uploadDate[4],
					timestamp: file.timestamp,
					receiverId: 0,
					receiverEmail: "",
					sharerId: 0,
					sharerEmail: "",
					offline: offline
				}

				items.push(item)

				window.customVariables.cachedFiles[file.uuid] = item
			}

			window.customVariables.itemList = items

			this.setState({
				itemList: items
			})

			loading.dismiss()

			window.customFunctions.saveCachedItems()

			return true
		}
	}
}

export async function refreshMainList(event){
    await this.updateItemList()

    return event.detail.complete()
}

export function selectItem(type, index){
    let items = this.state.itemList
    let selectedItems = this.state.selectedItems

    if(type){
        if(!items[index].selected){
            items[index].selected = type
            selectedItems = selectedItems + 1
		}
		
		if(selectedItems == 1 && Capacitor.isNative){
			Plugins.Haptics.impact(HapticsImpactStyle.Light)
		}
    }
    else{
        if(items[index].selected){
            items[index].selected = type
            selectedItems = selectedItems - 1
        }
    }

    return this.setState({
        itemList: items,
        selectedItems
    })
}

export function clearSelectedItems(){
    let items = this.state.itemList

    for(let i = 0; i < items.length; i++){
        items[i].selected = false
    }

    return this.setState({
        itemList: items,
        selectedItems: 0
    })
}

export async function selectItemsAction(event){
    event.persist()

	let appLang = this.state.lang
	let customElementId = utils.generateRandomClassName()
	let selectedItemsDoesNotContainFolder = utils.selectedItemsDoesNotContainFolder(this.state.itemList)
	
	let inner = ""

	if(window.location.href.indexOf("shared-in") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.removeSelectedItemsFromSharedIn()">` + language.get(appLang, "removeFromShared") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>
			</ion-list>
		`
	}
	else if(window.location.href.indexOf("shared-out") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.stopSharingSelectedItems()">` + language.get(appLang, "stopSharing") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>
			</ion-list>
		`
	}
	else if(window.location.href.indexOf("trash") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.restoreSelectedItems()">` + language.get(appLang, "restoreItem") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>
			</ion-list>
		`
	}
	else{
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				` + (selectedItemsDoesNotContainFolder ? `<ion-item lines="none" detail="false" button onClick="window.customFunctions.storeSelectedItemsOffline()">` + language.get(appLang, "storeSelectedItemsOffline") + `</ion-item>` : ``) + `
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.moveSelectedItems()">` + language.get(appLang, "moveItem") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.trashSelectedItems()">` + language.get(appLang, "trashItem") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>
			</ion-list>
		`
	}

    window.customElements.define(customElementId, class ModalContent extends HTMLElement {
        connectedCallback(){
            this.innerHTML = inner
        }
    })

    let popover = await popoverController.create({
        component: customElementId,
        event: event
    })

    return popover.present()
}

export async function previewItem(item){
    if(item.type !== "file"){
		return false
	}

	if(Capacitor.isNative){
        if(this.state.settings.onlyWifi){
            let networkStatus = await Plugins.Network.getStatus()

            if(networkStatus.connectionType !== "wifi"){
                return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
            }
        }
    }

	if(typeof window.customVariables.offlineSavedFiles[item.uuid] !== "undefined"){
		this.getDownloadDir(true, item.uuid, (err, dirObj) => {
			if(err){
				console.log(err)

				return this.spawnToast(language.get(this.state.lang, "couldNotGetDownloadDir"))
			}

			FileOpener.open(dirObj.uri.uri + "/" + item.name, item.mime).then(() => {
				console.log(dirObj.uri.uri + "/" + item.name, item.mime)
			}).catch((err) => {
				console.log(err)
				console.log(dirObj.uri.uri + "/" + item.name, item.mime)

				return this.spawnToast(language.get(this.state.lang, "noAppFoundToOpenFile", true, ["__NAME__"], [item.name]))
			})
		})
	}
	else{
		let nameEx = item.name.split(".")
		let previewType = utils.getFilePreviewType(nameEx[nameEx.length - 1])

		if(previewType == "none"){
			return this.spawnItemActionSheet(item)
		}

		if(item.size > ((1024 * 1024) * 32)){
			return this.spawnItemActionSheet(item)
		}

		const gotPreviewData = async (dataArray) => {
			let blob = new Blob([dataArray], {
				type: item.mime,
				name: item.name
			})

			console.log(item)

			if(typeof window.customVariables.currentPreviewURL !== "undefined"){
				window.customVariables.urlCreator.revokeObjectURL(window.customVariables.currentPreviewURL)
			}

			window.customVariables.currentPreviewURL = window.customVariables.urlCreator.createObjectURL(blob)

			let previewModalContent = ``

			if(previewType == "image"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow preview-header-hidden" style="position: absolute;">
						<ion-toolbar style="--background: transparent; color: white;">
							<ion-buttons slot="start">
								<ion-button onclick="window.customFunctions.dismissModal()">
									<ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
							<ion-title>
								` + item.name + `
							</ion-title>
							<ion-buttons slot="end">
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + window.btoa(JSON.stringify(item)) + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.ellipsisVertical + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content style="--background: black;" fullscreen>
						<div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
							<center>
								<img id="preview-img" src="` + window.customVariables.currentPreviewURL + `" style="width: auto; height: auto; max-width: 100vw; max-height: 100vh;">
							<center>
						</div>
					</ion-content>
				`
			}
			else if(previewType == "video"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow preview-header-hidden" style="position: absolute;">
						<ion-toolbar style="--background: transparent; color: white;">
							<ion-buttons slot="start">
								<ion-button onclick="window.customFunctions.dismissModal()">
									<ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
							<ion-title>
								` + item.name + `
							</ion-title>
							<ion-buttons slot="end">
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + window.btoa(JSON.stringify(item)) + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.ellipsisVertical + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content style="--background: black;" fullscreen>
						<div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
							<center>
								<video id="preview-video" style="width: auto; height: auto; max-width: 100vw; max-height: 100vh;" src="` + window.customVariables.currentPreviewURL + `" autoplay preload controls></video>
							</center>
						</div>
					</ion-content>
				`
			}
			else if(previewType == "audio"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow" style="position: absolute;">
						<ion-toolbar style="--background: transparent; color: white;">
							<ion-buttons slot="start">
								<ion-button onclick="window.customFunctions.dismissModal()">
									<ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
							<ion-title>
								` + item.name + `
							</ion-title>
							<ion-buttons slot="end">
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + window.btoa(JSON.stringify(item)) + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.ellipsisVertical + `" style="color: white;"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content style="--background: black;" fullscreen>
						<div style="position: absolute; left: 50%; top: 50%; -webkit-transform: translate(-50%, -50%); transform: translate(-50%, -50%); width: 100%;">
							<audio autoplay preload controls>
								<source src="` + window.customVariables.currentPreviewURL + `" type="audio/mpeg">
							</audio>
						</div>
					</ion-content>
				`
			}
			else if(previewType == "code" || previewType == "text"){
				let text = new TextDecoder().decode(dataArray).split("<").join("&lt;")

				previewModalContent = `
					<ion-header>
						<ion-toolbar>
							<ion-buttons slot="start">
								<ion-button onclick="window.customFunctions.dismissModal()">
									<ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
								</ion-button>
							</ion-buttons>
							<ion-title>
								` + item.name + `
							</ion-title>
							<ion-buttons slot="end">
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + window.btoa(JSON.stringify(item)) + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.ellipsisVertical + `"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content fullscreen>
						<pre style="width: 100vw; height: auto; margin-top: 0px; padding: 10px;">` + text + `</pre>
					</ion-content>
				`
			}

			if(previewModalContent.length <= 8){
				return this.spawnItemActionSheet(item)
			}

			if(Capacitor.isNative){
				setTimeout(() => {
					Capacitor.Plugins.Keyboard.hide()
				}, 100)
			}

			let modalId = "preview-modal-" + utils.generateRandomClassName()

			customElements.define(modalId, class ModalContent extends HTMLElement {
				connectedCallback() {
					this.innerHTML = previewModalContent
				}
			})

			let modal = await modalController.create({
				component: modalId,
				swipeToClose: true,
				showBackdrop: false,
				backdropDismiss: false,
				mode: (previewType == "image" || previewType == "video" ? "md" : "md"),
				cssClass: "modal-fullscreen"
			})

			await modal.present()

			if(previewType == "image" || previewType == "video"){
				this.setupStatusbar("image/video")

				modal.onDidDismiss().then(() => {
					this.setupStatusbar()
				})
			}
			else if(previewType == "pdf"){
				document.getElementById("pdf-preview").src = window.customVariables.currentPreviewURL
			}

			return true
		}

		let loading = await loadingController.create({
			message: language.get(this.state.lang, "loadingPreview")
		})

		loading.present()

		this.downloadPreview(item, (chunksDone) => {
			console.log(chunksDone)
		}, (err, dataArray) => {
			loading.dismiss()

			if(err){
				console.log(err)

				return this.spawnToast(language.get(this.state.lang, "fileNoPreviewAvailable", true, ["__NAME__"], [item.name]))
			}

			return gotPreviewData(dataArray)
		})
	}
}

export async function dirExists(name, parent, callback){
	if(parent == null){
		parent = "base"
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/dir/exists", {
			apiKey: this.state.userAPIKey,
			parent,
			nameHashed: utils.hashFn(name.toLowerCase())
		})
	}
	catch(e){
		return callback(e)
	}

	if(!res.status){
		return callback(res.message)
	}

	return callback(null, res.data.exists, res.data.uuid)
}

export async function moveFolder(folder, destination, showLoader){
	if(folder.parent == destination){
		return this.spawnToast(language.get(this.state.lang, "moveFileOrFolderSameDestination"))
	}

	if(utils.currentParentFolder() == "base"){
		if(folder.uuid == "default" || folder.name.toLowerCase() == "filen sync"){
			return this.spawnToast(language.get(this.state.lang, "thisFolderCannotBeMoved")) 
		}
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()
	}

	this.dirExists(folder.name, destination, async (err, exists, existsUUID) => {
		if(err){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
		}

		if(exists){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "folderMoveAlreadyExistsHere", true, ["__NAME__"], [folder.name]))
		}

		try{
			var res = await utils.apiRequest("POST", "/v1/dir/move", {
				apiKey: this.state.userAPIKey,
				uuid: folder.uuid,
				folderUUID: destination
			})
		}
		catch(e){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
		}

		if(showLoader){
			loading.dismiss()
		}

		if(!res.status){
			return this.spawnToast(res.message)
		}

		this.spawnToast(language.get(this.state.lang, "folderMoved", true, ["__NAME__"], [folder.name]))

		utils.checkIfItemParentIsBeingShared(destination, "folder", {
			name: folder.name
		})

		clearTimeout(window.customVariables.reloadAfterActionTimeout)

		window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
			if(utils.currentParentFolder() == destination){
				this.updateItemList()
			}
		}, 500)

		return true
	})
}

export async function moveFile(file, destination, showLoader){
	if(file.parent == destination){
		return this.spawnToast(language.get(this.state.lang, "moveFileOrFolderSameDestination"))
	}

	if(destination == "trash" || destination == "base" || destination == "shared-in" || destination == "shared-out"){
		return this.spawnToast(language.get(this.state.lang, "cannotMoveFileHere"))
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()
	}

	this.fileExists(file.name, destination, async (err, exists, existsUUID) => {
		if(err){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
		}

		if(exists){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "fileMoveAlreadyExistsHere", true, ["__NAME__"], [file.name]))
		}

		try{
			var res = await utils.apiRequest("POST", "/v1/file/move", {
				apiKey: this.state.userAPIKey,
				fileUUID: file.uuid,
				folderUUID: destination
			})
		}
		catch(e){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
		}

		if(showLoader){
			loading.dismiss()
		}

		if(!res.status){
			return this.spawnToast(res.message)
		}

		this.spawnToast(language.get(this.state.lang, "fileMoved", true, ["__NAME__"], [file.name]))

		utils.checkIfItemParentIsBeingShared(destination, "file", {
			uuid: file.uuid,
			name: file.name,
			size: parseInt(file.size),
			mime: file.mime,
			key: file.key
		})

		clearTimeout(window.customVariables.reloadAfterActionTimeout)

		window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
			if(utils.currentParentFolder() == destination){
				this.updateItemList()
			}
		}, 500)

		return true
	})
}

export function moveItem(item){
	this.spawnMoveToast((cancelled, destination) => {
		if(cancelled){
			return false
		}

		if(item.type == "file"){
			return this.moveFile(item, destination, true)
		}
		else{
			return this.moveFolder(item, destination, true)
		}
	})
}

export async function renameItem(item){
	let parent = utils.currentParentFolder()

	if(parent == "base"){
		if(item.uuid == "default" || item.name.toLowerCase() == "filen sync"){
			return this.spawnToast(language.get(this.state.lang, "cannotRenameItem", true, ["__NAME__"], [item.name]))
		}
	}

	this.spawnRenamePrompt(item, async (cancelled, newName) => {
		if(cancelled){
			return false
		}

		if(item.name == newName){
			return false
		}

		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()

		if(item.type == "file"){
			newName = utils.removeIllegalCharsFromString(newName)

			if(utils.nameRegex(newName) || utils.checkIfNameIsBanned(newName) || utils.fileNameValidationRegex(newName)){
				loading.dismiss()

				return this.spawnToast(language.get(this.state.lang, "invalidFileName"))
			}

			let nameEx = item.name.split(".")
			let fileExt = nameEx[nameEx.length - 1]
			let renameWithDot = false

			if(item.name.indexOf(".") !== -1){
				renameWithDot = true
			}

			this.fileExists(newName, parent, async (err, exists, existsUUID) => {
				if(err){
					console.log(err)

					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
				}

				if(exists){
					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "fileRenameAlreadyExists", true, ["__NAME__"], [item.name]))
				}

				if(renameWithDot){
					newName = newName + "." + fileExt
				}

				try{
					var res = await utils.apiRequest("POST", "/v1/file/rename", {
						apiKey: this.state.userAPIKey,
						uuid: item.uuid,
						name: utils.cryptoJSEncrypt(newName, item.key),
						nameHashed: utils.hashFn(newName.toLowerCase()),
						metaData: utils.cryptoJSEncrypt(JSON.stringify({
							name: newName,
							size: parseInt(item.size),
							mime: item.mime,
							key: item.key
						}), this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
					})
				}
				catch(e){
					console.log(e)

					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
				}

				if(!res.status){
					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "couldNotRenameFile"))
				}

				loading.dismiss()

				this.spawnToast(language.get(this.state.lang, "fileRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

				utils.checkIfItemIsBeingSharedForRename("file", parent, {
					name: newName,
					size: parseInt(item.size),
					mime: item.mime,
					key: item.key
				})

				delete window.customVariables.cachedFiles[item.uuid]

				clearTimeout(window.customVariables.reloadAfterActionTimeout)

				window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
					if(utils.currentParentFolder() == parent){
						this.updateItemList()
					}
				}, 500)

				if(typeof window.customVariables.offlineSavedFiles !== "undefined" && Capacitor.isNative){
					this.getDownloadDir(true, item.uuid, async (err, dirObj) => {
						if(err){
							console.log(err)

							return this.spawnToast(language.get(this.state.lang, "couldNotGetDownloadDir"))
						}

						try{
							await Plugins.Filesystem.rename({
								from: dirObj + "/" + item.name,
								to: dirObj + "/" +  newName,
								directory: dirObj.directory
							})
						}
						catch(e){
							console.log(err)

							return this.spawnToast(language.get(this.state.lang, "couldNotRenameFileLocally"))
						}

						return console.log("File renamed locally")
					})
				}

				return true
			})
		}
		else{
			newName = utils.removeIllegalCharsFromString(newName)

			if(utils.checkIfNameIsBanned(newName) || utils.folderNameRegex(newName) || utils.fileNameValidationRegex(newName)){
				loading.dismiss()

				return this.spawnToast(language.get(this.state.lang, "invalidFolderName"))
			}

			this.dirExists(newName, parent, async (err, exists, existsUUID) => {
				if(err){
					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
				}

				if(exists){
					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "folderRenameAlreadyExists", true, ["__NAME__"], [item.name]))
				}

				try{
					var res = await utils.apiRequest("POST", "/v1/dir/rename", {
						apiKey: this.state.userAPIKey,
						uuid: item.uuid,
						name: utils.cryptoJSEncrypt(JSON.stringify({
							name: newName,
						}), this.state.userMasterKeys[this.state.userMasterKeys.length - 1]),
						nameHashed: utils.hashFn(newName.toLowerCase())
					})
				}
				catch(e){
					console.log(e)

					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
				}

				if(!res.status){
					loading.dismiss()

					return this.spawnToast(language.get(this.state.lang, "couldNotRenameFolder"))
				}

				loading.dismiss()

				this.spawnToast(language.get(this.state.lang, "folderRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

				utils.checkIfItemIsBeingSharedForRename("folder", parent, {
					name: newName
				})

				delete window.customVariables.cachedFolders[item.uuid]

				clearTimeout(window.customVariables.reloadAfterActionTimeout)

				window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
					if(utils.currentParentFolder() == parent){
						this.updateItemList()
					}
				}, 500)

				return true
			})
		}
	})
}

export async function moveSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	this.spawnMoveToast((cancelled, destination) => {
		if(cancelled){
			return false
		}

		for(let i = 0; i < items.length; i++){
			if(items[i].type == "file"){
				this.moveFile(items[i], destination, true)
			}
			else{
				this.moveFolder(items[i], destination, true)
			}
		}
	})
}

export async function trashSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
		header: language.get(this.state.lang, "trashItemHeader"),
		message: language.get(this.state.lang, "trashItemsConfirmMessage", true, ["__COUNT__"], [items.length]),
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
					items.forEach((item) => {
						this.trashItem(item, false)
					})
				}
			}
		]
	})

	return alert.present()
}

export async function restoreSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
		header: language.get(this.state.lang, "restoreItemsHeader"),
		message: language.get(this.state.lang, "restoreItemsConfirmMessage", true, ["__COUNT__"], [items.length]),
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
					items.forEach((item) => {
						this.restoreItem(item, false)
					})
				}
			}
		]
	})

	return alert.present()
}

export function getSelectedItems(){
	return new Promise((resolve, reject) => {
		let items = this.state.itemList.filter((item) => {
			return item.selected === true
		})

		return resolve(items)
	})
}

export async function restoreItem(item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()
	}

	if(item.type == "file"){
		this.fileExists(item.name, item.parent, async (err, exists, existsUUID) => {
			if(err){
				console.log(err)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
			}

			if(exists){
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "fileExistsAtRestoreDestination", true, ["__NAME__"], [item.name]))
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/file/restore", {
					apiKey: this.state.userAPIKey,
					uuid: item.uuid
				})
			}
			catch(e){
				console.log(e)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
			}
		
			if(!res.status){
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "couldNotRestoreItem", true, ["__NAME__"], [item.name]))
			}
		
			if(showLoader){
				loading.dismiss()
			}
		
			clearTimeout(window.customVariables.reloadAfterActionTimeout)
		
			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				this.updateItemList()
			}, 500)
		
			return this.spawnToast(language.get(this.state.lang, "itemRestored", true, ["__NAME__"], [item.name]))
		})
	}
	else{
		this.dirExists(item.name, item.parent, async (err, exists, existsUUID) => {
			if(err){
				console.log(err)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
			}

			if(exists){
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "folderExistsAtRestoreDestination", true, ["__NAME__"], [item.name]))
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/dir/restore", {
					apiKey: this.state.userAPIKey,
					uuid: item.uuid
				})
			}
			catch(e){
				console.log(e)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
			}
		
			if(!res.status){
				if(showLoader){
					loading.dismiss()
				}
		
				return this.spawnToast(language.get(this.state.lang, "couldNotRestoreItem", true, ["__NAME__"], [item.name]))
			}
		
			if(showLoader){
				loading.dismiss()
			}
		
			clearTimeout(window.customVariables.reloadAfterActionTimeout)
		
			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				this.updateItemList()
			}, 500)
		
			return this.spawnToast(language.get(this.state.lang, "itemRestored", true, ["__NAME__"], [item.name]))
		})
	}
}

export async function trashItem(item, showLoader){
	if(utils.currentParentFolder() == "base"){
		if(item.uuid == "default" || item.name.toLowerCase() == "filen sync"){
			return this.spawnToast(language.get(this.state.lang, "cannotTrashItem", true, ["__NAME__"], [item.name]))
		}
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()
	}

	try{
		if(item.type == "file"){
			var res = await utils.apiRequest("POST", "/v1/file/trash", {
				apiKey: this.state.userAPIKey,
				uuid: item.uuid
			})
		}
		else{
			var res = await utils.apiRequest("POST", "/v1/dir/trash", {
				apiKey: this.state.userAPIKey,
				uuid: item.uuid
			})
		}
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
	}

	if(!res.status){
		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(language.get(this.state.lang, "couldNotTrashItem", true, ["__NAME__"], [item.name]))
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		this.updateItemList()
	}, 500)

	return this.spawnToast(language.get(this.state.lang, "itemTrashed", true, ["__NAME__"], [item.name]))
}

export async function shareItemWithEmail(email, uuid, type, callback){
	if(email == this.state.userEmail){
		return callback(language.get(this.state.lang, "cannotShareWithSelf"))
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/user/publicKey/get", {
			email
		})
	}
	catch(e){
		return callback(e)
	}

	if(!res.status){
		return callback(res.message)
	}

	let userPubKey = res.data.publicKey

	if(userPubKey == null){
		return callback(language.get(this.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
	}

	if(userPubKey.length <= 1){
		return callback(language.get(this.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
	}

	try{
		var usrPubKey = await window.crypto.subtle.importKey("spki", utils._base64ToArrayBuffer(userPubKey), {
			name: "RSA-OAEP",
		  	hash: "SHA-512"
	  	}, true, ["encrypt"])
	}
	catch(e){
		return callback(e)
	}

	if(type == "file"){
		if(typeof window.customVariables.cachedFiles[uuid] == "undefined"){
			return callback(language.get(this.state.lang, "shareItemFileNotFound", true, ["__NAME__"], [uuid]))
		}

		let fileName = window.customVariables.cachedFiles[uuid].name
		let fileSize = window.customVariables.cachedFiles[uuid].size
		let fileMime = window.customVariables.cachedFiles[uuid].mime
		let fileKey = window.customVariables.cachedFiles[uuid].key

		try{
			var encrypted = await window.crypto.subtle.encrypt({
				name: "RSA-OAEP"
			}, usrPubKey, new TextEncoder().encode(JSON.stringify({
				name: fileName,
				size: fileSize,
				mime: fileMime,
				key: fileKey
			})))
		}
		catch(e){
			return console.log(e)
		}

		try{
			var res = await utils.apiRequest("POST", "/v1/share", {
				apiKey: this.state.userAPIKey,
				uuid,
				parent: "none",
				email,
				type: "file",
				metadata: utils.base64ArrayBuffer(encrypted)
			})
		}
		catch(e){
			return callback(e)
		}

		if(!res.status){
			return callback(res.message)
		}

		return callback(null)
	}
	else{
		try{
			var res = await utils.apiRequest("POST", "/v1/download/dir", {
				apiKey: this.state.userAPIKey,
				uuid
			})
		}
		catch(e){
			return callback(e)
		}

		if(!res.status){
			return callback(res.message)
		}

		let shareItems = []

		let files = res.data.files
		let folders = res.data.folders

		if((files.length + folders.length) > 2500){
			return callback(language.get(this.state.lang, "shareTooBigForApp"))
		}

		for(let i = 0; i < files.length; i++){
			let metadata = utils.decryptFileMetadata(files[i].metadata, this.state.userMasterKeys, files[i].uuid)

			if(metadata.key.length > 0){
				shareItems.push({
					uuid: files[i].uuid,
					parent: files[i].parent,
					metadata: {
						name: metadata.name,
						size: parseInt(metadata.size),
						mime: metadata.mime,
						key: metadata.key
					},
					type: "file"
				})
			}
		}

		for(let i = 0; i < folders.length; i++){
			let dirName = utils.decryptCryptoJSFolderName(folders[i].name, this.state.userMasterKeys, folders[i].uuid)

			if(dirName !== "CON_NO_DECRYPT_POSSIBLE_NO_NAME_FOUND_FOR_FOLDER"){
				shareItems.push({
					uuid: folders[i].uuid,
					parent: (i == 0 ? "none" : folders[i].parent),
					metadata: dirName,
					type: "folder"
				})
			}
		}

		let itemsShared = 0

		for(let i = 0; i < shareItems.length; i++){
			let item = shareItems[i]
			let itemMetadata = ""

			if(item.type == "file"){
				itemMetadata = JSON.stringify(item.metadata)
			}
			else{
				itemMetadata = JSON.stringify({
					name: item.metadata
				})
			}

			try{
				var encrypted = await window.crypto.subtle.encrypt({
					name: "RSA-OAEP"
				}, usrPubKey, new TextEncoder().encode(itemMetadata))
			}
			catch(e){
				return callback(e)
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/share", {
					apiKey: this.state.userAPIKey,
					uuid: item.uuid,
					parent: item.parent,
					email: email,
					type: item.type,
					metadata: utils.base64ArrayBuffer(encrypted)
				})
			}
			catch(e){
				console.log(e)
			}
	
			if(!res.status){
				console.log(res.message)
			}

			itemsShared += 1

			if(itemsShared == shareItems.length){
				return callback(null)
			}
		}
	}
}

export async function shareSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
        header: language.get(this.state.lang, "shareItems"),
        inputs: [
            {
                type: "text",
                id: "share-items-email-input",
				name: "share-items-email-input",
				placeholder: language.get(this.state.lang, "receiverEmail")
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
					let email = inputs['share-items-email-input']

					let itemsShared = 0

					let loading = await loadingController.create({
						message: ""
					})

					loading.present()

					for(let i = 0; i < items.length; i++){
						let item = items[i]

						if(item.type == "folder" && item.uuid == "default"){
							this.spawnToast(language.get(this.state.lang, "cannotShareDefaultFolder"))
						}
						else{
							this.shareItemWithEmail(email, item.uuid, item.type, (err) => {
								if(err){
									console.log(err)
	
									this.spawnToast(err.toString())
								}
	
								itemsShared += 1
	
								if(itemsShared >= items.length){
									loading.dismiss()

									return this.spawnToast(language.get(this.state.lang, "itemsShared", true, ["__COUNT__", "__EMAIL__"], [items.length, email]))
								}
							})
						}
					}
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

export async function shareItem(item){
	if(item.type == "folder" && item.uuid == "default"){
		return this.spawnToast(language.get(this.state.lang, "cannotShareDefaultFolder"))
	}

	let alert = await alertController.create({
        header: item.type == "file" ? language.get(this.state.lang, "shareFile") : language.get(this.state.lang, "shareFolder"),
        inputs: [
            {
                type: "text",
                id: "share-item-email-input",
				name: "share-item-email-input",
				placeholder: language.get(this.state.lang, "receiverEmail")
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
                handler: (inputs) => {
					let email = inputs['share-item-email-input']

                    this.shareItemWithEmail(email, item.uuid, item.type, (err) => {
						if(err){
							console.log(err)

							return this.spawnToast(err.toString())
						}

						return this.spawnToast(language.get(this.state.lang, "itemShared", true, ["__NAME__", "__WITH__"], [item.name, email]))
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

export async function openPublicLinkModal(item){
	let loading = await loadingController.create({
		message: ""
	})

	loading.present()

	try{
		var res = await utils.apiRequest("POST", "/v1/link/status", {
			apiKey: this.state.userAPIKey,
			fileUUID: item.uuid
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

	let appLang = this.state.lang
	let appDarkMode = this.state.darkMode
	let modalId = "public-link-modal-" + utils.generateRandomClassName()

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
							` + language.get(appLang, "publicLinkHeader", true, ["__NAME__"], [item.name]) + `
						</ion-title>
					</ion-toolbar>
				</ion-header>
				<ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
					<div id="enable-public-link-content" ` + (res.data.enabled && `style="display: none;"`) + `>
						<div style="position: absolute; left: 50%; top: 32%; transform: translate(-50%, -50%); width: 100%;"> 
							<center>
								<ion-icon icon="` + Ionicons.link + `" style="font-size: 65pt; color: ` + (appDarkMode ? "white" : "gray") + `;"></ion-icon>
								<br>
								<br>
								<ion-button color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'enable')">` + language.get(appLang, "enablePublicLink") + `</ion-button>	
							</center>
						</div>
					</div>
					<div id="public-link-enabled-content" ` + (!res.data.enabled && `style="display: none;"`) + `>
						<ion-item lines="none">
							<ion-label>
								` + language.get(appLang, "publicLinkEnabled") + `
							</ion-label>
							<ion-toggle slot="end" id="public-link-enabled-toggle" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'disable')" checked></ion-toggle>
						</ion-item>
						<ion-item lines="none">
							<ion-input type="text" id="public-link-input" onClick="window.customFunctions.copyPublicLinkToClipboard()" value="https://filen.io/d/` + res.data.uuid + `#!` + item.key + `" disabled></ion-input>
                            <ion-buttons slot="end" onClick="window.customFunctions.copyPublicLinkToClipboard()">
                                <ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `">
                                    ` + language.get(appLang, "copy") + `
                                </ion-button>
                            </ion-buttons>
                        </ion-item>
					</div>
				</ion-content>
			`
		}
	})

	let modal = await modalController.create({
		component: modalId,
		swipeToClose: false,
		showBackdrop: false,
		backdropDismiss: false,
		cssClass: "modal-fullscreen"
	})

	return modal.present()
}

export function makeItemAvailableOffline(offline, item){
	if(!offline){
		this.getDownloadDir(true, item.uuid, async (err, dirObj) => {
			if(err){
				console.log(err)
	
				return this.spawnToast(language.get(this.state.lang, "couldNotGetDownloadDir"))
			}

			try{
				await Plugins.Filesystem.rmdir({
					path: dirObj.path,
					directory: dirObj.directory,
					recursive: true
				})

				delete window.customVariables.offlineSavedFiles[item.uuid]
			}
			catch(e){
				console.log(e)
	
				return this.spawnToast(language.get(this.state.lang, "couldNotDeleteDownloadedFile", true, ["__NAME__"], [item.name]))
			}

			let items = this.state.itemList
			let windowItems = window.customVariables.itemList

			for(let i = 0; i < items.length; i++){
				if(items[i].uuid == item.uuid){
					items[i].offline = false
				}
			}

			for(let i = 0; i < windowItems.length; i++){
				if(windowItems[i].uuid == item.uuid){
					windowItems[i].offline = false
				}
			}

			this.setState({
				itemList: items
			})

			window.customVariables.itemList = windowItems
			
			if(typeof window.customVariables.cachedFiles[item.uuid] !== "undefined"){
				window.customVariables.cachedFiles[item.uuid].offline = false
			}

			this.spawnToast(language.get(this.state.lang, "fileDeletedFromOfflineStorage", true, ["__NAME__"], [item.name]))

			window.customFunctions.saveOfflineSavedFiles()

			return this.forceUpdate()
		})
	}
	else{
		let nItem = item

		nItem.makeOffline = true

		return this.queueFileDownload(nItem)
	}
}

export async function removeSharedInItem(item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})

		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/user/shared/item/in/remove", {
			apiKey: this.state.userAPIKey,
			uuid: item.uuid,
			receiverId: 0
		})
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
	}

	if(!res.status){
		console.log(res.message)

		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(res.message)
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		this.updateItemList()
	}, 500)

	return this.spawnToast(language.get(this.state.lang, "itemRemovedFromSharedIn", true, ["__NAME__"], [item.name]))
}

export async function stopSharingItem(item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})

		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/user/shared/item/out/remove", {
			apiKey: this.state.userAPIKey,
			uuid: item.uuid,
			receiverId: item.receiverId
		})
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
	}

	if(!res.status){
		console.log(res.message)

		if(showLoader){
			loading.dismiss()
		}

		return this.spawnToast(res.message)
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		this.updateItemList()
	}, 500)

	return this.spawnToast(language.get(this.state.lang, "itemStoppedSharing", true, ["__NAME__"], [item.name]))
}

export async function removeSelectedItemsFromSharedIn(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		this.removeSharedInItem(item, false)
	}

	return true
}

export async function stopSharingSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		this.stopSharingItem(item, false)
	}

	return true
}

export async function downloadSelectedItems(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		if(item.type == "file"){
			this.queueFileDownload(item)
		}
	}

	return true
}

export async function storeSelectedItemsOffline(){
	let items = await this.getSelectedItems()

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		if(item.type == "file"){
			item.makeOffline = true

			this.queueFileDownload(item)
		}
	}

	return true
}

export async function spawnItemActionSheet(item){
	let buttons = undefined

	if(item.type == "folder"){
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "removeFromShared"),
					icon: Ionicons.stopCircle,
					handler: () => {
						this.removeSharedInItem(item, false)
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
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "stopSharing"),
					icon: Ionicons.stopCircle,
					handler: () => {
						this.stopSharingItem(item, false)
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
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "restoreItem"),
					icon: Ionicons.bagAdd,
					handler: () => {
						return this.restoreItem(item, false)
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
		}
		else{
			buttons = [
				{
					text: language.get(this.state.lang, "shareItem"),
					icon: Ionicons.shareSocial,
					handler: () => {
						return this.shareItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "moveItem"),
					icon: Ionicons.move,
					handler: () => {
						return this.moveItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "renameItem"),
					icon: Ionicons.text,
					handler: () => {
						return this.renameItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "trashItem"),
					icon: Ionicons.trash,
					handler: () => {
						return this.trashItem(item, false)
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
		}
	}
	else{
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "downloadItem"),
					icon: Ionicons.download,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.queueFileDownload(item)
					}
				},
				{
					text: item.offline ? language.get(this.state.lang, "removeItemFromOffline") : language.get(this.state.lang, "makeItemAvailableOffline"),
					icon: Ionicons.save,
					handler: () => {
						window.customFunctions.dismissModal()
	
						if(item.offline){
							return this.makeItemAvailableOffline(false, item)
						}
						else{
							return this.makeItemAvailableOffline(true, item)
						}
					}
				},
				{
					text: language.get(this.state.lang, "removeFromShared"),
					icon: Ionicons.stopCircle,
					handler: () => {
						this.removeSharedInItem(item, false)
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
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "downloadItem"),
					icon: Ionicons.download,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.queueFileDownload(item)
					}
				},
				{
					text: item.offline ? language.get(this.state.lang, "removeItemFromOffline") : language.get(this.state.lang, "makeItemAvailableOffline"),
					icon: Ionicons.save,
					handler: () => {
						window.customFunctions.dismissModal()
	
						if(item.offline){
							return this.makeItemAvailableOffline(false, item)
						}
						else{
							return this.makeItemAvailableOffline(true, item)
						}
					}
				},
				{
					text: language.get(this.state.lang, "stopSharing"),
					icon: Ionicons.stopCircle,
					handler: () => {
						this.stopSharingItem(item, false)
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
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				{
					text: language.get(this.state.lang, "downloadItem"),
					icon: Ionicons.download,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.queueFileDownload(item)
					}
				},
				{
					text: language.get(this.state.lang, "restoreItem"),
					icon: Ionicons.bagAdd,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.restoreItem(item, false)
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
		}
		else{
			buttons = [
				{
					text: language.get(this.state.lang, "shareItem"),
					icon: Ionicons.shareSocial,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.shareItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "itemPublicLink"),
					icon: Ionicons.link,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.openPublicLinkModal(item)
					}
				},
				{
					text: language.get(this.state.lang, "downloadItem"),
					icon: Ionicons.download,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.queueFileDownload(item)
					}
				},
				{
					text: item.offline ? language.get(this.state.lang, "removeItemFromOffline") : language.get(this.state.lang, "makeItemAvailableOffline"),
					icon: Ionicons.save,
					handler: () => {
						window.customFunctions.dismissModal()
	
						if(item.offline){
							return this.makeItemAvailableOffline(false, item)
						}
						else{
							return this.makeItemAvailableOffline(true, item)
						}
					}
				},
				{
					text: language.get(this.state.lang, "moveItem"),
					icon: Ionicons.move,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.moveItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "renameItem"),
					icon: Ionicons.text,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.renameItem(item)
					}
				},
				{
					text: language.get(this.state.lang, "trashItem"),
					icon: Ionicons.trash,
					handler: () => {
						window.customFunctions.dismissModal()
	
						return this.trashItem(item, false)
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
		}
	}

	let headerName = item.name

	if(headerName.length >= 32){
		headerName = headerName.substring(0, 32) + "..."
	}

    let actionSheet = await actionSheetController.create({
        header: headerName,
        buttons
    })

	await actionSheet.present()
	
	if(Capacitor.isNative){
		Capacitor.Plugins.Keyboard.hide()
	}

	return true
}