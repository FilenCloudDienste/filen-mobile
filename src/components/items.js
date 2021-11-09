import * as language from "../utils/language"
import { loadingController, modalController, popoverController, alertController, actionSheetController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { Capacitor, HapticsImpactStyle, Plugins } from "@capacitor/core"
import { FileOpener } from "@ionic-native/file-opener"
import { isPlatform, getPlatforms } from "@ionic/react"
import { Media } from '@capacitor-community/media'

const utils = require("../utils/utils")
const safeAreaInsets = require('safe-area-insets')
const Hammer = require("hammerjs")

const media = new Media()

export async function updateItemList(showLoader = true, bypassItemsCache = false, isFollowUpRequest = false, windowLocationHref = undefined, callStack = 0){
	if(!this.state.isLoggedIn){
		return this.showLogin()
	}
	
	if(this.state.userAPIKey.length <= 16){
		return this.showLogin()
	}

	if(Capacitor.isNative){
		Capacitor.Plugins.Keyboard.hide()
	}

	if(Capacitor.isNative && window.customVariables.isDocumentReady){
        Plugins.SplashScreen.hide()
    }

	let isDeviceOnline = false

	if(Capacitor.isNative){
        try{
			let networkStatus = await Plugins.Network.getStatus()

			isDeviceOnline = (networkStatus.connected ? true : false)
		}
		catch(e){
			console.log(e)

			isDeviceOnline = true
		}
    }
	else{
		isDeviceOnline = (window.navigator.onLine ? true : false)
	}

	this.setState({
        searchbarOpen: false,
        mainSearchTerm: ""
    })

	let routeEx = window.location.hash.split("/")
	let parent = routeEx[routeEx.length - 1]

	if(!isDeviceOnline){
		bypassItemsCache = false
	}

	if(typeof window.customVariables.itemsCache[window.location.href] == "object" && !bypassItemsCache){
		if(callStack == 0 && isDeviceOnline){
			this.updateItemList(false, true, true, window.location.href, 1)
		}

		let items = window.customVariables.itemsCache[window.location.href]

		if(!this.state.settings.showThumbnails){
			let itemsWithoutThumbnails = []
	
			for(let i = 0; i < items.length; i++){
				let item = items[i]
	
				item.thumbnail = undefined
	
				itemsWithoutThumbnails.push(item)
			}
	
			items = itemsWithoutThumbnails
		}

		if(parent == "recent"){
			items = utils.orderItemsByType(items, "dateDesc")
		}
		else{
			items = utils.orderItemsByType(items, window.customVariables.orderBy)
		}

		window.customVariables.itemList = items
	
		let scrollTo = 0
	
		if(typeof window.customVariables.scrollToIndex[parent] !== "undefined"){
			scrollTo = window.customVariables.scrollToIndex[parent]
	
			delete window.customVariables.scrollToIndex[parent]
		}
	
		return this.setState({
			itemList: items,
			scrollToIndex: scrollTo
		}, () => {
			this.forceUpdate()
	
			window.customVariables.currentThumbnailURL = window.location.href
	
			for(let i = 0; i < items.length; i++){
				this.getFileThumbnail(items[i], window.customVariables.currentThumbnailURL, i)
			}

			setTimeout(window.customFunctions.saveCachedItems, 1000)
		})
	}

	if(!isDeviceOnline){
		window.customFunctions.dismissLoader()
	
		let alert = await alertController.create({
			header: "",
			subHeader: "",
			message: language.get(this.state.lang, "apiRequestError"),
			buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
		})

		return alert.present()
	}

    if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()

		/*let skeletonItems = []

		for(let i = 0; i < 10; i++){
			skeletonItems.push({
				type: "folder",
				uuid: "default" + i,
				name: "Default" + i,
				date: language.get(this.state.lang, "defaultFolder"),
				timestamp: (((+new Date()) / 1000) - (86400 * 3650)),
				parent: "base",
				receiverId: 0,
				receiverEmail: "",
				sharerId: 0,
				sharerEmail: "",
				color: null
			})
		}

		this.setState({
			showMainSkeletonPlaceholder: true,
			items: skeletonItems
		})*/
	}

	window.customVariables.currentThumbnailURL = window.location.href

	let items = []
	
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

			if(res.message.toLowerCase().indexOf("api key not found") !== -1){
				return window.customFunctions.logoutUser()
			}
	
			window.customFunctions.dismissLoader()
	
			let alert = await alertController.create({
				header: "",
				subHeader: "",
				message: language.get(this.state.lang, "apiRequestError"),
				buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
			})
	
			return alert.present()
		}

		for(let i = 0; i < res.data.folders.length; i++){
			let folder = res.data.folders[i]

			let folderName = await utils.decryptFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
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
				sharerEmail: "",
				color: folder.color || null,
				favorited: folder.favorited,
				isBase: true,
				isSync: folder.is_sync,
				isDefault: folder.is_default
			}

			items.push(item)

			window.customVariables.cachedFolders[folder.uuid] = item
		}
	}
	else if(parent == "recent"){
		try{
			var res = await utils.apiRequest("POST", "/v1/user/recent", {
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

			if(res.message.toLowerCase().indexOf("api key not found") !== -1){
				return window.customFunctions.logoutUser()
			}
	
			window.customFunctions.dismissLoader()
	
			let alert = await alertController.create({
				header: "",
				subHeader: "",
				message: language.get(this.state.lang, "apiRequestError"),
				buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
			})
	
			return alert.present()
		}

		for(let i = 0; i < res.data.length; i++){
			let file = res.data[i]

			let metadata = await utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)
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
				lastModified: (typeof metadata.lastModified == "number" ? metadata.lastModified : file.timestamp),
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
				offline: offline,
				version: file.version,
				favorited: file.favorited,
				thumbnail: (typeof window.customVariables.thumbnailBlobCache[file.uuid] !== "undefined" ? window.customVariables.thumbnailBlobCache[file.uuid] : undefined)
			}

			items.push(item)

			window.customVariables.cachedFiles[file.uuid] = item
		}
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

				if(res.message.toLowerCase().indexOf("api key not found") !== -1){
					return window.customFunctions.logoutUser()
				}
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "apiRequestError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				let folderName = await utils.decryptFolderNamePrivateKey(folder.metadata, usrPrivKey, folder.uuid)
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
					sharerEmail: folder.sharerEmail,
					color: folder.color || null,
					isSync: folder.is_sync,
					isDefault: folder.is_default
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				let decryptedMetadata = await utils.decryptFileMetadataPrivateKey(file.metadata, usrPrivKey, file.uuid)
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
					lastModified: (typeof decryptedMetadata.lastModified == "number" ? decryptedMetadata.lastModified : file.timestamp),
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
					offline: offline,
					version: file.version,
					thumbnail: (typeof window.customVariables.thumbnailBlobCache[file.uuid] !== "undefined" ? window.customVariables.thumbnailBlobCache[file.uuid] : undefined)
				}

				items.push(item)

				window.customVariables.cachedFiles[file.uuid] = item
			}
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

				if(res.message.toLowerCase().indexOf("api key not found") !== -1){
					return window.customFunctions.logoutUser()
				}
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(this.state.lang, "apiRequestError"),
					buttons: [language.get(this.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				let folderName = await utils.decryptFolderName(folder.metadata, this.state.userMasterKeys, folder.uuid)
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
					sharerEmail: "",
					color: folder.color || null,
					favorited: folder.favorited,
					isSync: folder.is_sync,
					isDefault: folder.is_default
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				let metadata = await utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)
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
					lastModified: (typeof metadata.lastModified == "number" ? metadata.lastModified : file.timestamp),
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
					offline: offline,
					version: file.version,
					favorited: file.favorited,
					thumbnail: (typeof window.customVariables.thumbnailBlobCache[file.uuid] !== "undefined" ? window.customVariables.thumbnailBlobCache[file.uuid] : undefined)
				}

				items.push(item)

				window.customVariables.cachedFiles[file.uuid] = item
			}
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

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				let folderName = await utils.decryptFolderName(folder.name, this.state.userMasterKeys, folder.uuid)
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
					sharerEmail: "",
					color: folder.color || null,
					favorited: folder.favorited,
					isSync: folder.is_sync,
					isDefault: folder.is_default
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				let metadata = await utils.decryptFileMetadata(file.metadata, this.state.userMasterKeys, file.uuid)
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
					lastModified: (typeof metadata.lastModified == "number" ? metadata.lastModified : file.timestamp),
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
					offline: offline,
					version: file.version,
					favorited: file.favorited,
					thumbnail: (typeof window.customVariables.thumbnailBlobCache[file.uuid] !== "undefined" ? window.customVariables.thumbnailBlobCache[file.uuid] : undefined)
				}

				items.push(item)

				window.customVariables.cachedFiles[file.uuid] = item
			}
		}
	}

	if(!this.state.settings.showThumbnails){
		let itemsWithoutThumbnails = []

		for(let i = 0; i < items.length; i++){
			let item = items[i]

			item.thumbnail = undefined

			itemsWithoutThumbnails.push(item)
		}

		items = itemsWithoutThumbnails
	}

	if(parent == "recent"){
		items = utils.orderItemsByType(items, "dateDesc")
	}
	else{
		items = utils.orderItemsByType(items, window.customVariables.orderBy)
	}

	window.customVariables.itemList = items
	window.customVariables.itemsCache[window.location.href] = items

	if(isFollowUpRequest){
		if(typeof windowLocationHref !== "undefined"){
			if(window.location.href !== windowLocationHref){
				return false
			}
		}
	}

	let scrollTo = 0

	if(typeof window.customVariables.scrollToIndex[parent] !== "undefined"){
		scrollTo = window.customVariables.scrollToIndex[parent]

		delete window.customVariables.scrollToIndex[parent]
	}

	let stateObj = { //
		itemList: items,
		scrollToIndex: scrollTo,
		showMainSkeletonPlaceholder: false
	}

	if(isFollowUpRequest){
		stateObj = {
			itemList: items,
			showMainSkeletonPlaceholder: false
		}
	}

	return this.setState(stateObj, () => {
		this.forceUpdate()

		window.customVariables.currentThumbnailURL = window.location.href

		for(let i = 0; i < items.length; i++){
			this.getFileThumbnail(items[i], window.customVariables.currentThumbnailURL, i)
		}

		setTimeout(window.customFunctions.saveCachedItems, 1000)
		setTimeout(window.customFunctions.saveItemsCache, 1000)

		window.customFunctions.dismissLoader()
	})
}

export function getFileThumbnail(file, thumbURL, index){
	if(!this.state.settings.showThumbnails){
		return false
	}

	if(file.type !== "file" || file.name.indexOf(".") == -1){
		return false
	}

	if(typeof window.customVariables.getThumbnailErrors[file.uuid] !== "undefined"){
		if(window.customVariables.getThumbnailErrors[file.uuid] >= 16){
			return false
		}
	}

	if(typeof window.customVariables.isGettingThumbnail[file.uuid] !== "undefined"){
		return false
	}

	let ext = file.name.toLowerCase().split(".")
	ext = ext[ext.length - 1]

	if(!utils.canShowThumbnail(ext)){
		return false
	}

	const gotThumbnail = async (thumbnail) => {
		//await window.customVariables.updateItemsSemaphore.acquire()

		let newItems = this.state.itemList

		for(let i = 0; i < newItems.length; i++){
			if(newItems[i].uuid == file.uuid){
				newItems[i].thumbnail = thumbnail
			}
		}

		window.customVariables.itemList = newItems

		if(thumbURL == window.location.href){
			return this.setState({
				itemList: newItems
			}, () => {
				this.forceUpdate()

				setTimeout(window.customFunctions.saveThumbnailCache, 1000)

				//window.customVariables.updateItemsSemaphore.release()

				delete window.customVariables.isGettingThumbnail[file.uuid]
			})
		}
		else{
			//window.customVariables.updateItemsSemaphore.release()

			delete window.customVariables.isGettingThumbnail[file.uuid]

			return false
		}
	}

	if(typeof file.thumbnail == "string"){
		return gotThumbnail(file.thumbnail)
	}

	window.customVariables.isGettingThumbnail[file.uuid] = true

	let intervalTimer = utils.getRandomArbitrary(10, 25)

	if(document.getElementById("item-thumbnail-" + file.uuid) !== null){
		intervalTimer = 1
	}

	let onScreenInterval = setInterval(async () => {
		if(thumbURL !== window.location.href){
			delete window.customVariables.isGettingThumbnail[file.uuid]

			return clearInterval(onScreenInterval)
		}
		else{
			if(document.getElementById("item-thumbnail-" + file.uuid) !== null){
				clearInterval(onScreenInterval)
		
				try{
					let thumbnail = await this.getThumbnail(file, thumbURL, ext)

					if(typeof thumbnail !== "undefined"){
						return gotThumbnail(thumbnail)
					}
					else{
						delete window.customVariables.isGettingThumbnail[file.uuid]
						
						return false
					}
				}
				catch(e){
					console.log(e)

					try{
						if(e.indexOf("url changed") == -1){
							if(typeof window.customVariables.getThumbnailErrors[file.uuid] !== "undefined"){
								window.customVariables.getThumbnailErrors[file.uuid] = window.customVariables.getThumbnailErrors[file.uuid] + 1
							}
							else{
								window.customVariables.getThumbnailErrors[file.uuid] = 1
							}
	
							window.customFunctions.saveGetThumbnailErrors()
						}
					}
					catch(err){  }

					delete window.customVariables.isGettingThumbnail[file.uuid]

					return false
				}
			}
		}
	}, intervalTimer)
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
    }, () => {
		this.forceUpdate()
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
    }, () => {
		this.forceUpdate()
	})
}

export async function selectItemsAction(event){
    event.persist()

	let appLang = this.state.lang
	let customElementId = utils.generateRandomClassName()
	let selectedItemsDoesNotContainFolder = utils.selectedItemsDoesNotContainFolder(this.state.itemList)
	let selectedItemsContainsDefaultFolder = utils.selectedItemsContainsDefaultFolder(this.state.itemList)

	let inner = ""

	if(window.location.href.indexOf("shared-in") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.removeSelectedItemsFromSharedIn()">` + language.get(appLang, "removeFromShared") + `</ion-item>
				<!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>-->
			</ion-list>
		`
	}
	else if(window.location.href.indexOf("shared-out") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				` + (selectedItemsDoesNotContainFolder ? `<ion-item lines="none" detail="false" button onClick="window.customFunctions.storeSelectedItemsOffline()">` + language.get(appLang, "storeSelectedItemsOffline") + `</ion-item>` : ``) + `
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.favoriteSelectedItems(1)">` + language.get(appLang, "favorite") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.favoriteSelectedItems(0)">` + language.get(appLang, "unfavorite") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.moveSelectedItems()">` + language.get(appLang, "moveItem") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.stopSharingSelectedItems()">` + language.get(appLang, "stopSharing") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.trashSelectedItems()">` + language.get(appLang, "trashItem") + `</ion-item>
				<!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>-->
			</ion-list>
		`
	}
	else if(window.location.href.indexOf("trash") !== -1){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.restoreSelectedItems()">` + language.get(appLang, "restoreItem") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.deleteSelectedItemsPermanently()">` + language.get(appLang, "deletePermanently") + `</ion-item>
				<!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>-->
			</ion-list>
		`
	}
	else{
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
				` + (selectedItemsDoesNotContainFolder ? `<ion-item lines="none" detail="false" button onClick="window.customFunctions.storeSelectedItemsOffline()">` + language.get(appLang, "storeSelectedItemsOffline") + `</ion-item>` : ``) + `
				` + (selectedItemsContainsDefaultFolder ? `` : `
					<ion-item lines="none" detail="false" button onClick="window.customFunctions.favoriteSelectedItems(1)">` + language.get(appLang, "favorite") + `</ion-item>
					<ion-item lines="none" detail="false" button onClick="window.customFunctions.favoriteSelectedItems(0)">` + language.get(appLang, "unfavorite") + `</ion-item>
					<ion-item lines="none" detail="false" button onClick="window.customFunctions.moveSelectedItems()">` + language.get(appLang, "moveItem") + `</ion-item>
					<ion-item lines="none" detail="false" button onClick="window.customFunctions.trashSelectedItems()">` + language.get(appLang, "trashItem") + `</ion-item>
				`) + `
				<!--<ion-item lines="none" detail="false" button onClick="window.customFunctions.dismissPopover()">` + language.get(appLang, "close") + `</ion-item>-->
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

export async function previewItem(item, lastModalPreviewType = undefined, isOuterPreview = false){
    if(item.type !== "file"){
		return false
	}

	if(Capacitor.isNative && typeof lastModalPreviewType == "undefined"){
        if(this.state.settings.onlyWifi){
            let networkStatus = await Plugins.Network.getStatus()

            if(networkStatus.connectionType !== "wifi"){
                return this.spawnToast(language.get(this.state.lang, "onlyWifiError"))
            }
        }
	}

	if(document.getElementById("main-searchbar") !== null){
		document.getElementById("main-searchbar").blur()
	}
	
	if(Capacitor.isNative){
		Capacitor.Plugins.Keyboard.hide()
	}

	if(typeof window.customVariables.offlineSavedFiles[item.uuid] !== "undefined" && typeof lastModalPreviewType == "undefined"){
		return window.customFunctions.openOfflineFile(item)
	}
	else{
		let nameEx = item.name.split(".")
		let previewType = utils.getFilePreviewType(nameEx[nameEx.length - 1])

		if(["pdf", "doc"].includes(previewType)){
			let loading = await loadingController.create({
				message: "",
				backdropDismiss: false
			})
	
			loading.present()

			return this.queueFileDownload(item, true, () => {
				loading.dismiss()

				window.customFunctions.openOfflineFile(item)
			}, true)
		}

		if(previewType == "none"){
			if(typeof lastModalPreviewType !== "undefined"){
				window.customFunctions.dismissModal()
			}

			return this.spawnItemActionSheet(item)
		}

		if(item.size > ((1024 * 1024) * 128)){
			if(typeof lastModalPreviewType !== "undefined"){
				window.customFunctions.dismissModal()
			}

			return this.spawnItemActionSheet(item)
		}

		const gotPreviewData = async (dataArray) => {
			window.customVariables.imagePreviewZoomedIn = false

			let blob = new Blob([dataArray], {
				type: item.mime,
				name: item.name
			})

			if(typeof window.customVariables.currentPreviewURL !== "undefined"){
				window.customVariables.urlCreator.revokeObjectURL(window.customVariables.currentPreviewURL)
			}

			window.customVariables.currentPreviewURL = window.customVariables.urlCreator.createObjectURL(blob)

			let previewModalContent = ``

			if(previewType == "image"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow preview-header-hidden" style="position: absolute; display: none; margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;" onClick="window.customFunctions.togglePreviewHeader(true)">
						<ion-toolbar style="--background: black; color: white;">
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
						<ion-slides pager="false" style="height: 100%; width: 100vw;" id="slider" scrollbar="false">
							<ion-slide>
								<center>
									<img id="preview-img" src="` + window.customVariables.currentPreviewURL + `" style="width: auto; height: auto; max-width: 100vw; max-height: 100vh;">
								<center>
							</ion-slide>
						</ion-slides>
					</ion-content>
				`
			}
			else if(previewType == "video"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow" style="position: absolute; margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
						<ion-toolbar style="--background: black; color: white;">
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
						<ion-slides pager="false" style="height: 100%; width: 100vw;" id="slider" scrollbar="false">
							<ion-slide>
								<center>
									<video id="preview-video" style="width: auto; height: auto; max-width: 100vw; max-height: 100vh; margin-top: 56px;" src="` + window.customVariables.currentPreviewURL + `" autoplay preload controls></video>
								</center>
							</ion-slide>
						</ion-slides>
					</ion-content>
				`
			}
			else if(previewType == "audio"){
				previewModalContent = `
					<ion-header class="ion-header-no-shadow" style="position: absolute; margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
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
						<ion-slides pager="false" style="height: 100%; width: 100vw;" id="slider" scrollbar="false">
							<ion-slide>
								<audio autoplay preload controls>
									<source src="` + window.customVariables.currentPreviewURL + `" type="audio/mpeg">
								</audio>
							</ion-slide>
						</ion-slides>
					</ion-content>
				`
			}
			else if(previewType == "code" || previewType == "text"){
				let text = new TextDecoder().decode(dataArray).split("<").join("&lt;")

				previewModalContent = `
					<ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
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
					<ion-content fullscreen style="-webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;">
						<pre style="width: 100vw; height: 100%; margin-top: 0px; padding: 10px; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;">` + text + `</pre>
					</ion-content>
				`
			}

			if(previewModalContent.length <= 8){
				if(typeof lastModalPreviewType !== "undefined"){
					window.customFunctions.dismissModal()
				}

				return this.spawnItemActionSheet(item)
			}

			const setupBars = async () => {
				if(previewType == "image" || previewType == "video" || previewType == "audio"){
					this.setupStatusbar("image/video")

					try{
						let modal = await modalController.getTop()
	
						modal.onDidDismiss().then(() => {
							this.setupStatusbar()
						})
					}
					catch(e){
						console.log(e)
					}
				}
				else{
					this.setupStatusbar("modal")

					try{
						let modal = await modalController.getTop()
	
						modal.onDidDismiss().then(() => {
							this.setupStatusbar()
						})
					}
					catch(e){
						console.log(e)
					}
				}
			}

			const setupSlider = (lastPreviewType) => {
				let slider = document.getElementById("slider")

				if(slider == null){
					return false
				}

				let itemList = this.state.itemList

				const getPrevOrNextItem = (type) => {
					let step = 1
					let max = 128
					let tries = 0

					const getItemRecursive = (type) => {
						if(tries > max){
							return undefined
						}

						tries += 1

						for(let i = 0; i < itemList.length; i++){
							if(itemList[i].uuid == item.uuid){
								let item = undefined
								let listIndex = undefined

								if(type == "prev"){
									listIndex = (i - step)

									item = itemList[listIndex]
								}
								else{
									listIndex = (i + step)

									item = itemList[listIndex]
								}

								if(typeof item == "undefined"){
									step += 1

									return getItemRecursive(type)
								}
								else{
									let thisNameEx = item.name.split(".")
									let thisPreviewType = utils.getFilePreviewType(thisNameEx[thisNameEx.length - 1])

									if(thisPreviewType == lastPreviewType){
										return {
											item,
											listIndex
										}
									}
									else{
										step += 1

										return getItemRecursive(type)
									}
								}
							}
						}
					}

					return getItemRecursive(type)
				}
        
				slider.options = {
					freeMode: false
				}

				let offset = 75
				let offsetY = 150
				let xDown, yDown

				slider.addEventListener("touchstart", (e) => {
					let firstTouch = getTouch(e)

					xDown = firstTouch.clientX
					yDown = firstTouch.clientY
				})

				slider.addEventListener("touchend", (e) => {
					if(!xDown || !yDown){
						return false
					}

					if(isOuterPreview){ //dont load new preview when item was not selected from main screen, remove when new swiper is enabled
						return false
					}

					if(window.customVariables.imagePreviewZoomedIn){
						return false
					}

					let {
						clientX: xUp,
						clientY: yUp
					} = getTouch(e)

					let xDiff = xDown - xUp
					let yDiff = yDown - yUp
					let xDiffAbs = Math.abs(xDown - xUp)
					let yDiffAbs = Math.abs(yDown - yUp)

					if(Math.max(xDiffAbs, yDiffAbs) < offset){
						return false
					}

					if(xDiffAbs > yDiffAbs){
						if(xDiff > 0){
							let nextItem = getPrevOrNextItem("next")

							if(typeof nextItem == "undefined"){
								return false
							}

							this.setState({
								scrollToIndex: nextItem.listIndex
							})

							return this.previewItem(nextItem.item, lastPreviewType)
						}
						else{
							let prevItem = getPrevOrNextItem("prev")

							if(typeof prevItem == "undefined"){
								return false
							}

							this.setState({
								scrollToIndex: prevItem.listIndex
							})

							return this.previewItem(prevItem.item, lastPreviewType)
						}
					}
					else{
						if(xDiffAbs < yDiffAbs && Math.max(xDiffAbs, yDiffAbs) > offsetY){
							window.customFunctions.dismissModal()
						}
					}

					return false
				})

				const getTouch = (e) => {
					return e.changedTouches[0]
				}
			}

			const hammerSetup = () => {
				let elm = document.getElementById("preview-img")

				let hammertime = new Hammer(elm, {})

				hammertime.get("pinch").set({
					enable: true
				})

				let posX = 0
				let posY = 0
				let scale = 1
				let last_scale = 1
				let last_posX = 0
				let last_posY = 0
				let max_pos_x = 0
				let max_pos_y = 0
				let transform = ""
				let el = elm

				hammertime.on("doubletap pan pinch panend pinchend", (ev) => {
					if(ev.type == "doubletap"){
						transform = "translate3d(0, 0, 0) " + "scale3d(2, 2, 1)"
						scale = 2
						last_scale = 2

						try{
							if(window.getComputedStyle(el, null).getPropertyValue("-webkit-transform").toString() != "matrix(1, 0, 0, 1, 0, 0)"){
								transform = "translate3d(0, 0, 0) " + "scale3d(1, 1, 1)"
								scale = 1
								last_scale = 1
							}
						}
						catch(e){ }

						el.style.webkitTransform = transform
						transform = ""
					}

					if(scale <= 1){
						window.customVariables.imagePreviewZoomedIn = false
					}
					else{
						window.customVariables.imagePreviewZoomedIn = true
					}

					if(scale != 1){
						posX = last_posX + ev.deltaX
						posY = last_posY + ev.deltaY
						max_pos_x = Math.ceil((scale - 1) * el.clientWidth / 2)
						max_pos_y = Math.ceil((scale - 1) * el.clientHeight / 2)

						if(posX > max_pos_x){
							posX = max_pos_x
						}

						if(posX < -max_pos_x){
							posX = -max_pos_x
						}

						if(posY > max_pos_y){
							posY = max_pos_y
						}

						if(posY < -max_pos_y){
							posY = -max_pos_y;
						}
					}

					if(ev.type == "pinch"){
						scale = Math.max(.999, Math.min(last_scale * (ev.scale), 4))
					}

					if(ev.type == "pinchend"){
						last_scale = scale
					}

					if(ev.type == "panend"){
						last_posX = posX < max_pos_x ? posX : max_pos_x
						last_posY = posY < max_pos_y ? posY : max_pos_y
					}

					if(scale != 1){
						transform = "translate3d(" + posX + "px," + posY + "px, 0) " + "scale3d(" + scale + ", " + scale + ", 1)"
					}

					if(transform){
						el.style.webkitTransform = transform
					}
				})
			}

			if(typeof lastModalPreviewType !== "undefined"){
				try{
					var currentModal = document.querySelectorAll(".modal-fullscreen > .modal-wrapper")[0].childNodes[0]
				}
				catch(e){
					window.customFunctions.dismissModal()

					return this.spawnItemActionSheet(item)
				}

				currentModal.innerHTML = previewModalContent

				if(previewType == "image"){
					hammerSetup()
				}

				setupBars()
				setupSlider(previewType)

				return true
			}
			else{
				let modalId = "preview-modal-" + utils.generateRandomClassName()

				customElements.define(modalId, class ModalContent extends HTMLElement {
					connectedCallback() {
						this.innerHTML = previewModalContent
					}
				})

				var modal = await modalController.create({
					component: modalId,
					swipeToClose: true,
					showBackdrop: false,
					backdropDismiss: false,
					cssClass: "modal-fullscreen"
				})

				await modal.present()

				if(Capacitor.isNative){
					Capacitor.Plugins.Keyboard.hide()
				}

				if(previewType == "image" || previewType == "video" || previewType == "audio"){
					try{
						document.querySelectorAll(".modal-fullscreen > .modal-wrapper")[0].childNodes[0].style.backgroundColor = "black"
					}
					catch(e){
						console.log(e)
					}
				}

				if(previewType == "image"){
					hammerSetup()
				}
	
				setupBars()
				setupSlider(previewType)
	
				return true
			}
		}

		let loading = await loadingController.create({
			message: "",
			backdropDismiss: true
		})

		loading.present()

		try{
			loading.onDidDismiss().then(() => {
				window.customVariables.stopGettingPreviewData = true
			})
		}
		catch(e){
			console.log(e)
		}

		window.customVariables.isGettingPreviewData = true
		window.customVariables.stopGettingPreviewData = false

		this.downloadPreview(item, (chunksDone) => {
			//console.log(chunksDone)
		}, (err, dataArray) => {
			window.customVariables.isGettingPreviewData = false

			loading.dismiss()

			if(err){
				if(err !== "stopped"){
					console.log(err)

					return this.spawnToast(language.get(this.state.lang, "fileNoPreviewAvailable", true, ["__NAME__"], [item.name]))
				}
				else{
					return false
				}
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

		if(!res.status){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(res.message)
		}

		utils.checkIfItemParentIsBeingShared(destination, "folder", {
			name: folder.name,
			uuid: folder.uuid
		}, () => {
			if(showLoader){
				loading.dismiss()
			}

			this.spawnToast(language.get(this.state.lang, "folderMoved", true, ["__NAME__"], [folder.name]))

			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				if(utils.currentParentFolder() == destination){
					this.updateItemList()
				}
			}, 500)

			return true
		})
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

		if(!res.status){
			if(showLoader){
				loading.dismiss()
			}

			return this.spawnToast(res.message)
		}

		utils.checkIfItemParentIsBeingShared(destination, "file", {
			uuid: file.uuid,
			name: file.name,
			size: parseInt(file.size),
			mime: file.mime,
			key: file.key
		}, () => {
			if(showLoader){
				loading.dismiss()
			}

			this.spawnToast(language.get(this.state.lang, "fileMoved", true, ["__NAME__"], [file.name]))

			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				if(utils.currentParentFolder() == destination){
					this.updateItemList()
				}
			}, 500)

			return true
		})
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
			if(utils.fileNameValidationRegex(newName)){
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
						name: await utils.encryptMetadata(newName, item.key),
						nameHashed: utils.hashFn(newName.toLowerCase()),
						metaData: await utils.encryptMetadata(JSON.stringify({
							name: newName,
							size: parseInt(item.size),
							mime: item.mime,
							key: item.key,
							lastModified: item.lastModified
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

				utils.checkIfItemIsBeingSharedForRename("file", item.uuid, {
					name: newName,
					size: parseInt(item.size),
					mime: item.mime,
					key: item.key
				}, () => {
					loading.dismiss()

					this.spawnToast(language.get(this.state.lang, "fileRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

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
			})
		}
		else{
			if(utils.fileNameValidationRegex(newName)){
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
						name: await utils.encryptMetadata(JSON.stringify({
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

				utils.checkIfItemIsBeingSharedForRename("folder", item.uuid, {
					name: newName
				}, () => {
					loading.dismiss()

					this.spawnToast(language.get(this.state.lang, "folderRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

					delete window.customVariables.cachedFolders[item.uuid]

					clearTimeout(window.customVariables.reloadAfterActionTimeout)

					window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
						if(utils.currentParentFolder() == parent){
							this.updateItemList()
						}
					}, 500)

					return true
				})
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

	let loading = await loadingController.create({
		message: ""
	})

	loading.present()

	try{
		var res = await utils.apiRequest("POST", "/v1/user/publicKey/get", {
			email
		})
	}
	catch(e){
		loading.dismiss()

		return callback(e)
	}

	if(!res.status){
		loading.dismiss()

		return callback(res.message)
	}

	let userPubKey = res.data.publicKey

	if(userPubKey == null){
		loading.dismiss()

		return callback(language.get(this.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
	}

	if(userPubKey.length <= 1){
		loading.dismiss()

		return callback(language.get(this.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
	}

	try{
		var usrPubKey = await window.crypto.subtle.importKey("spki", utils._base64ToArrayBuffer(userPubKey), {
			name: "RSA-OAEP",
		  	hash: "SHA-512"
	  	}, true, ["encrypt"])
	}
	catch(e){
		loading.dismiss()

		return callback(e)
	}

	if(type == "file"){
		if(typeof window.customVariables.cachedFiles[uuid] == "undefined"){
			loading.dismiss()

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
			loading.dismiss()

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
			loading.dismiss()

			return callback(e)
		}

		if(!res.status){
			loading.dismiss()

			return callback(res.message)
		}

		loading.dismiss()

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
			loading.dismiss()

			return callback(e)
		}

		if(!res.status){
			loading.dismiss()

			return callback(res.message)
		}

		let shareItems = []

		let files = res.data.files
		let folders = res.data.folders

		if((files.length + folders.length) > 10000){
			loading.dismiss()

			return callback(language.get(this.state.lang, "shareTooBigForApp"))
		}

		for(let i = 0; i < files.length; i++){
			let metadata = await utils.decryptFileMetadata(files[i].metadata, this.state.userMasterKeys, files[i].uuid)

			if(metadata.key.length > 0){
				shareItems.push({
					uuid: files[i].uuid,
					parent: files[i].parent,
					metadata: {
						name: metadata.name,
						size: parseInt(metadata.size),
						mime: metadata.mime,
						key: metadata.key,
						lastModified: metadata.lastModified
					},
					type: "file"
				})
			}
		}

		for(let i = 0; i < folders.length; i++){
			let dirName = await utils.decryptFolderName(folders[i].name, this.state.userMasterKeys, folders[i].uuid)

			if(dirName.length > 0){
				shareItems.push({
					uuid: folders[i].uuid,
					parent: (i == 0 ? "none" : folders[i].parent),
					metadata: dirName,
					type: "folder"
				})
			}
		}

		let itemsShared = 0
		let erroredItems = 0
		let isAlreadyShared = false

		const shareItemRequest = async (data, tries, maxTries, cb) => {
			if(tries >= maxTries){
				return cb(language.get(this.state.lang, "apiRequestError"))
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/share", data)
			}
			catch(e){
				console.log(e)

				return setTimeout(() => {
					shareItemRequest(data, (tries + 1), maxTries, cb)
				}, 1000)
			}

			return cb(null)
		}

		for(let i = 0; i < shareItems.length; i++){
			await window.customVariables.shareItemSemaphore.acquire()

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
				loading.dismiss()

				window.customVariables.shareItemSemaphore.release()

				return callback(e)
			}

			shareItemRequest({
				apiKey: this.state.userAPIKey,
				uuid: item.uuid,
				parent: item.parent,
				email: email,
				type: item.type,
				metadata: utils.base64ArrayBuffer(encrypted)
			}, 0, 32, (err) => {
				if(err){
					console.log(err)

					erroredItems += 1
				}

				window.customVariables.shareItemSemaphore.release()
				itemsShared += 1

				loading.message = language.get(this.state.lang, "sharedItemsCount", true, ["__SHARED__", "__TOTAL__"], [itemsShared, shareItems.length])

				if(itemsShared == shareItems.length){
					loading.dismiss()

					return callback(null)
				}
			})
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
				placeholder: language.get(this.state.lang, "receiverEmail"),
				attributes: {
					autoCapitalize: "off",
					autoComplete: "off"
				}
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
				placeholder: language.get(this.state.lang, "receiverEmail"),
				attributes: {
					autoCapitalize: "off",
					autoComplete: "off"
				}
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
	if(item.uuid == "default"){
		return this.spawnToast(language.get(this.state.lang, "cannotCreatePublicLinkFolder"))
	}

	let loading = await loadingController.create({
		message: ""
	})

	loading.present()

	if(item.type == "file"){
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
					<ion-header class="ion-no-border" style="margin-top: ` + (isPlatform("ipad") ? safeAreaInsets.top : 0) + `px;">
						<ion-toolbar style="--background: ` + (appDarkMode ? `#1e1e1e` : `white`) + `;">
							<ion-buttons slot="start">
								<ion-button onClick="window.customFunctions.dismissModal()">
									<ion-icon slot="icon-only" icon="` + Ionicons.arrowBack + `"></ion-icon>
								</ion-button>
							</ion-buttons>
							<ion-title>
								` + language.get(appLang, "publicLinkHeader", true, ["__NAME__"], [item.name]) + `
							</ion-title>
							<ion-buttons slot="end" id="public-link-enabled-share" ` + (!res.data.enabled && `style="display: none;"`) + `>
								<ion-button onClick="window.customFunctions.sharePublicLink('` + item.name + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.shareOutline + `"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
						<div id="enable-public-link-content" ` + (res.data.enabled && `style="display: none;"`) + `>
							<div style="position: absolute; left: 50%; top: 32%; transform: translate(-50%, -50%); width: 100%;"> 
								<center>
									<ion-icon icon="` + Ionicons.link + `" style="font-size: 65pt; color: ` + (appDarkMode ? "white" : "gray") + `;"></ion-icon>
									<br>
									<br>
									<ion-button color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'enable', false)">` + language.get(appLang, "enablePublicLink") + `</ion-button>	
								</center>
							</div>
						</div>
						<div id="public-link-enabled-content" ` + (!res.data.enabled && `style="display: none;"`) + `>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnabled") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enabled-toggle" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'disable', false)" checked></ion-toggle>
							</ion-item>
							<ion-item lines="none">
								<ion-input type="text" id="public-link-input" onClick="window.customFunctions.copyPublicLinkToClipboard()" value="https://filen.io/d/` + res.data.uuid + `#!` + item.key + `" disabled></ion-input>
								<ion-buttons slot="end" onClick="window.customFunctions.copyPublicLinkToClipboard()">
									<ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `">
										` + language.get(appLang, "copy") + `
									</ion-button>
								</ion-buttons>
							</ion-item>
							<ion-item lines="none" style="margin-top: 30px;">
								<ion-label>
									` + language.get(appLang, "publicLinkExpire") + `
								</ion-label>
								<ion-select id="public-link-expires-select" value="` + (typeof res.data.expirationText == "string" ? res.data.expirationText : `never`) + `" ok-text="` + language.get(appLang, "alertOkButton") + `" cancel-text="` + language.get(appLang, "close") + `">
									<ion-select-option value="never">` + language.get(appLang, "publicLinkExpiresNever") + `</ion-select-option>
									<ion-select-option value="1h">1 ` + language.get(appLang, "publicLinkExpiresHour") + `</ion-select-option>
									<ion-select-option value="6h">6 ` + language.get(appLang, "publicLinkExpiresHours") + `</ion-select-option>
									<ion-select-option value="1d">1 ` + language.get(appLang, "publicLinkExpiresDay") + `</ion-select-option>
									<ion-select-option value="3d">3 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="7d">7 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="14d">14 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="30d">30 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
								</ion-select>
							</ion-item>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkPassword") + `
								</ion-label>
								<ion-input slot="end" id="public-link-password-input-dummy" type="password" placeholder="` + language.get(appLang, "publicLinkPasswordPlaceholder") + `" oninput="window.$('#public-link-password-input').val(window.$('#public-link-password-input-dummy').val())"></ion-input>
								<input type="hidden" id="public-link-password-input" value="">
							</ion-item>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnableDownloadBtn") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enable-download-btn-toggle" ` + (res.data.downloadBtn == 1 ? `checked` : ``) + `></ion-toggle>
							</ion-item>
							<section style="padding-left: 15px; padding-right: 15px; margin-top: 30px;">
								<ion-button id="save-link-btn" data-currentlinkuuid="` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `" expand="block" size="small" color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'enable', true)">` + language.get(appLang, "savePublicLink") + `</ion-button>
							</section>
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
	else{
		try{
			var res = await utils.apiRequest("POST", "/v1/dir/link/status", {
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
			console.log(res.message)
	
			loading.dismiss()
	
			return this.spawnToast(res.message)
		}
	
		loading.dismiss()
	
		let appLang = this.state.lang
		let appDarkMode = this.state.darkMode
		let appUserMasterKeys = this.state.userMasterKeys
		let modalId = "public-link-modal-" + utils.generateRandomClassName()

		let linkKey = await utils.decryptFolderLinkKey(res.data.key, appUserMasterKeys)
	
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
								` + language.get(appLang, "publicLinkHeader", true, ["__NAME__"], [item.name]) + `
							</ion-title>
							<ion-buttons slot="end" id="public-link-enabled-share" ` + (!res.data.exists && `style="display: none;"`) + `>
								<ion-button onClick="window.customFunctions.sharePublicLink('` + item.name + `')">
									<ion-icon slot="icon-only" icon="` + Ionicons.shareOutline + `"></ion-icon>
								</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
						<div id="enable-public-link-content" ` + (res.data.exists && `style="display: none;"`) + `>
							<div style="position: absolute; left: 50%; top: 32%; transform: translate(-50%, -50%); width: 100%;"> 
								<center>
									<ion-icon icon="` + Ionicons.link + `" style="font-size: 65pt; color: ` + (appDarkMode ? "white" : "gray") + `;"></ion-icon>
									<br>
									<br>
									<ion-button color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'enable', false)">` + language.get(appLang, "enablePublicLink") + `</ion-button>	
								</center>
							</div>
						</div>
						<div id="public-link-enabled-content" ` + (!res.data.exists && `style="display: none;"`) + `>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnabled") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enabled-toggle" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'disable', true, '` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `')" checked></ion-toggle>
							</ion-item>
							<ion-item lines="none">
								<ion-input type="text" id="public-link-input" onClick="window.customFunctions.copyPublicLinkToClipboard()" value="https://filen.io/f/` + res.data.uuid + `#!` + linkKey + `" disabled></ion-input>
								<ion-buttons slot="end" onClick="window.customFunctions.copyPublicLinkToClipboard()">
									<ion-button fill="solid" color="` + (appDarkMode ? `dark` : `light`) + `">
										` + language.get(appLang, "copy") + `
									</ion-button>
								</ion-buttons>
							</ion-item>
							<ion-item lines="none" style="margin-top: 30px;">
								<ion-label>
									` + language.get(appLang, "publicLinkExpire") + `
								</ion-label>
								<ion-select id="public-link-expires-select" value="` + (typeof res.data.expirationText == "string" ? res.data.expirationText : `never`) + `" ok-text="` + language.get(appLang, "alertOkButton") + `" cancel-text="` + language.get(appLang, "close") + `">
									<ion-select-option value="never">` + language.get(appLang, "publicLinkExpiresNever") + `</ion-select-option>
									<ion-select-option value="1h">1 ` + language.get(appLang, "publicLinkExpiresHour") + `</ion-select-option>
									<ion-select-option value="6h">6 ` + language.get(appLang, "publicLinkExpiresHours") + `</ion-select-option>
									<ion-select-option value="1d">1 ` + language.get(appLang, "publicLinkExpiresDay") + `</ion-select-option>
									<ion-select-option value="3d">3 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="7d">7 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="14d">14 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
									<ion-select-option value="30d">30 ` + language.get(appLang, "publicLinkExpiresDays") + `</ion-select-option>
								</ion-select>
							</ion-item>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkPassword") + `
								</ion-label>
								<ion-input slot="end" id="public-link-password-input-dummy" type="password" placeholder="` + language.get(appLang, "publicLinkPasswordPlaceholder") + `" oninput="window.$('#public-link-password-input').val(window.$('#public-link-password-input-dummy').val())"></ion-input>
								<input type="hidden" id="public-link-password-input" value="">
							</ion-item>
							<!--<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnableDownloadBtn") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enable-download-btn-toggle" ` + (typeof res.data.downloadBtn !== "undefined" ? (res.data.downloadBtn == 1 ? `checked` : ``) : ``) + `></ion-toggle>
							</ion-item>-->
							<section style="padding-left: 15px; padding-right: 15px; margin-top: 30px;">
								<ion-button id="save-link-btn" data-currentlinkuuid="` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `" expand="block" size="small" color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + window.btoa(JSON.stringify(item)) + `', 'enable', true)">` + language.get(appLang, "savePublicLink") + `</ion-button>
							</section>
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
}

export function makeItemAvailableOffline(offline, item, openAfterDownload = false){
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

		return this.queueFileDownload(nItem, true, () => {
			if(openAfterDownload){
				window.customFunctions.openOfflineFile(nItem)
			}
		})
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
			this.queueFileDownload(item, true)
		}
	}

	return true
}

export async function colorItem(item){
	if(item.uuid == "default"){
		return this.spawnToast(language.get(this.state.lang, "thisFolderCannotBeColored")) 
	}

	let appLang = this.state.lang
	let appDarkMode = this.state.darkMode
	let modalId = "color-item-modal-" + utils.generateRandomClassName()

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
							` + language.get(appLang, "colorItemLinkHeader", true, ["__NAME__"], [item.name]) + `
						</ion-title>
					</ion-toolbar>
				</ion-header>
				<ion-content style="--background: ` + (appDarkMode ? "#1E1E1E" : "white") + `" fullscreen>
					<section style="padding: 15px;">
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'default')" style="--background: #F6C358;">` + language.get(appLang, "colorItemDefault") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'blue')" style="--background: #2992E5; margin-top: 10px;">` + language.get(appLang, "colorItemBlue") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'green')" style="--background: #57A15B; margin-top: 10px;">` + language.get(appLang, "colorItemGreen") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'purple')" style="--background: #8E3A9D; margin-top: 10px;">` + language.get(appLang, "colorItemPurple") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'red')" style="--background: #CB2E35; margin-top: 10px;">` + language.get(appLang, "colorItemRed") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + window.btoa(JSON.stringify(item)) + `', 'gray')" style="--background: gray; margin-top: 10px;">` + language.get(appLang, "colorItemGray") + `</ion-button>
					</section>
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

export async function favoriteItemRequest(item, value, showLoader = true){
	if(showLoader){
		var loading = await loadingController.create({
			message: ""
		})
	
		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/item/favorite", {
			apiKey: this.state.userAPIKey,
			uuid: item.uuid,
			type: item.type,
			value
		})
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return {
			err: language.get(this.state.lang, "apiRequestError")
		}
	}

	if(!res.status){
		console.log(res.message)

		if(showLoader){
			loading.dismiss()
		}

		return {
			err: res.message
		}
	}

	if(showLoader){
		loading.dismiss()
	}

	return {
		err: null
	}
}

export async function favoriteItem(item, value, showLoader = true){
	if(item.uuid == "default" || item.uuid == null){
		return false
	}

	let req = await this.favoriteItemRequest(item, value, showLoader)

	if(req.err){
		this.spawnToast(req.err)

		return false
	}

	if(utils.currentParentFolder() == "favorites"){
		if(value == 0){
			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				this.updateItemList()
			}, 500)
		}
	}

	let items = this.state.itemList

	for(let i = 0; i < items.length; i++){
		if(items[i].uuid == item.uuid){
			items[i].favorited = value
		}
	}

	window.customVariables.itemList = items

	this.setState({
		itemList: items
	}, () => {
		this.forceUpdate()
	})

	return true
}

export async function spawnItemActionSheet(item){
	window.$("#main-searchbar").find("input").blur()

	let ext = item.name.split(".")
	ext = ext[ext.length - 1]

	let previewType = utils.getFilePreviewType(ext)

	let canSaveToGallery = false

	if(isPlatform("ios")){
		if(["jpg", "jpeg", "heif", "heic", "png", "gif", "mp4", "mov", "hevc"].includes(ext)){
			canSaveToGallery = true
		}
	}
	else{
		if(["jpg", "jpeg", "png", "gif", "mp4", "mov"].includes(ext)){
			canSaveToGallery = true
		}
	}

	if(Capacitor.isNative){
		Capacitor.Plugins.Keyboard.hide()
	}

	let buttons = []
	let options = {}

	options['removeFromShared'] = {
		text: language.get(this.state.lang, "removeFromShared"),
		icon: Ionicons.stopCircleOutline,
		handler: () => {
			this.removeSharedInItem(item, false)
		}
	}

	options['cancel'] = {
		text: language.get(this.state.lang, "cancel"),
		icon: Ionicons.closeOutline,
		handler: () => {
			return actionSheet.dismiss()
		}
	}

	options['stopSharing'] = {
		text: language.get(this.state.lang, "stopSharing"),
		icon: Ionicons.stopCircleOutline,
		handler: () => {
			this.stopSharingItem(item, false)
		}
	}

	options['restore'] = {
		text: language.get(this.state.lang, "restoreItem"),
		icon: Ionicons.bagAddOutline,
		handler: () => {
			return this.restoreItem(item, false)
		}
	}

	options['publicLink'] = {
		text: language.get(this.state.lang, "itemPublicLink"),
		icon: Ionicons.linkOutline,
		handler: () => {
			window.customFunctions.dismissModal()

			return this.openPublicLinkModal(item)
		}
	}

	options['share'] = {
		text: language.get(this.state.lang, "shareItem"),
		icon: Ionicons.shareSocialOutline,
		handler: () => {
			return this.shareItem(item)
		}
	}

	options['move'] = {
		text: language.get(this.state.lang, "moveItem"),
		icon: Ionicons.moveOutline,
		handler: () => {
			return this.moveItem(item)
		}
	}

	options['rename'] = {
		text: language.get(this.state.lang, "renameItem"),
		icon: Ionicons.textOutline,
		handler: () => {
			return this.renameItem(item)
		}
	}

	options['color'] = {
		text: language.get(this.state.lang, "colorItem"),
		icon: Ionicons.colorFillOutline,
		handler: () => {
			return this.colorItem(item)
		}
	}

	options['trash'] = {
		text: language.get(this.state.lang, "trashItem"),
		icon: Ionicons.trashOutline,
		handler: () => {
			return this.trashItem(item, false)
		}
	}

	options['versions'] = {
		text: language.get(this.state.lang, "itemVersions"),
		icon: Ionicons.timeOutline,
		handler: () => {
			window.customFunctions.dismissActionSheet()

			return window.customFunctions.openVersionHistoryModal(item)
		}
	}

	options['download'] = {
		text: language.get(this.state.lang, "downloadItem"),
		icon: Ionicons.downloadOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			//return this.queueFileDownload(item)

			if(item.offline){
				return window.customFunctions.openOfflineFile(item)
			}
			else{
				return this.makeItemAvailableOffline(true, item, true)
			}
		}
	}

	options['saveToGallery'] = {
		text: language.get(this.state.lang, "saveToGallery"),
		icon: Ionicons.imageOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			this.queueFileDownload(item, false, undefined, false, (err, downloadedPath) => {
				if(err){
					return console.log(err)
				}

				window.resolveLocalFileSystemURL(downloadedPath.uri, (resolved) => {
					if(previewType == "video"){
						media.saveVideo({
							path: downloadedPath.uri
						}).then(() => {
							this.spawnToast(language.get(this.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

							resolved.remove(() => {
								console.log(item.name + " saved to gallery")
							}, (err) => {
								this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))

								return console.log(err)
							})
						}).catch((err) => {
							this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))

							return console.log(err)
						})
					}
					else{
						if(ext == "gif"){
							media.saveGif({
								path: downloadedPath.uri
							}).then(() => {
								this.spawnToast(language.get(this.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

								resolved.remove(() => {
									console.log(item.name + " saved to gallery")
								}, (err) => {
									this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
									return console.log(err)
								})
							}).catch((err) => {
								this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
								return console.log(err)
							})
						}
						else{
							media.savePhoto({
								path: downloadedPath.uri
							}).then(() => {
								this.spawnToast(language.get(this.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

								resolved.remove(() => {
									console.log(item.name + " saved to gallery")
								}, (err) => {
									this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
									return console.log(err)
								})
							}).catch((err) => {
								this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
								return console.log(err)
							})
						}
					}
				}, (err) => {
					this.spawnToast(language.get(this.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
					return console.log(err)
				})
			})
		}
	}

	options['offline'] = {
		text: item.offline ? language.get(this.state.lang, "removeItemFromOffline") : language.get(this.state.lang, "makeItemAvailableOffline"),
		icon: Ionicons.saveOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			if(item.offline){
				return this.makeItemAvailableOffline(false, item, false)
			}
			else{
				return this.makeItemAvailableOffline(true, item, false)
			}
		}
	}

	options['favorite'] = {
		text: item.favorited == 1 ? language.get(this.state.lang, "unfavorite") : language.get(this.state.lang, "favorite"),
		icon: Ionicons.starOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			if(typeof item.favorited == "undefined"){
				return false
			}

			if(item.favorited == 1){
				return this.favoriteItem(item, 0)
			}
			else{
				return this.favoriteItem(item, 1)
			}
		}
	}

	options['deletePermanently'] ={
		text: language.get(this.state.lang, "deletePermanently"),
		icon: Ionicons.trashBinOutline,
		handler: async () => {
			let alert = await alertController.create({
				header: language.get(this.state.lang, "deletePermanently"),
				message: language.get(this.state.lang, "deletePermanentlyConfirmation", true, ["__NAME__"], [item.name]),
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
					
							loading.present()
				
							try{
								if(item.type == "file"){
									var res = await utils.apiRequest("POST", "/v1/file/delete/permanent", {
										apiKey: window.customVariables.apiKey,
										uuid: item.uuid
									})
								}
								else{
									var res = await utils.apiRequest("POST", "/v1/dir/delete/permanent", {
										apiKey: window.customVariables.apiKey,
										uuid: item.uuid
									})
								}
							}
							catch(e){
								console.log(e)
				
								loading.dismiss()
				
								return this.spawnToast(language.get(this.state.lang, "apiRequestError"))
							}
				
							loading.dismiss()
						
							if(!res.status){
								console.log(res.message)
				
								return this.spawnToast(res.message)
							}

							let itemList = []

							for(let i = 0; i < this.state.itemList.length; i++){
								if(this.state.itemList[i].uuid !== item.uuid){
									itemList.push(this.state.itemList[i])
								}
							}

							this.setState({
								itemList: itemList
							}, () => {
								this.forceUpdate()
							})
				
							return this.spawnToast(language.get(this.state.lang, "itemDeletedPermanently", true, ["__NAME__"], [item.name]))
						}
					}
				]
			})
		
			return alert.present()
		}
	}

	options['edit'] = {
		text: language.get(this.state.lang, "edit"),
		icon: Ionicons.createOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			let loading = await loadingController.create({
				message: "", //language.get(this.state.lang, "loadingPreview")
				backdropDismiss: true
			})
	
			loading.present()
	
			try{
				loading.onDidDismiss().then(() => {
					window.customVariables.stopGettingPreviewData = true
				})
			}
			catch(e){
				console.log(e)
			}
	
			window.customVariables.isGettingPreviewData = true
			window.customVariables.stopGettingPreviewData = false
	
			this.downloadPreview(item, (chunksDone) => {
				//console.log(chunksDone)
			}, (err, dataArray) => {
				window.customVariables.isGettingPreviewData = false
	
				loading.dismiss()
	
				if(err){
					if(err !== "stopped"){
						console.log(err)
	
						return this.spawnToast(language.get(this.state.lang, "fileNoPreviewAvailable", true, ["__NAME__"], [item.name]))
					}
					else{
						return false
					}
				}
	
				return window.customFunctions.openTextEditor(item, new TextDecoder().decode(dataArray))
			}, Infinity)
		}
	}

	if(item.type == "folder"){
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				options['removeFromShared'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			if(item.isSync){
				buttons = [
					options['share'],
					options['publicLink'],
					options['color'],
					options['favorite'],
					options['stopSharing'],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					options['share'],
					options['publicLink'],
					options['rename'],
					options['color'],
					options['favorite'],
					options['stopSharing'],
					options['cancel']
				]
			}
			else{
				buttons = [
					options['share'],
					options['publicLink'],
					options['rename'],
					options['color'],
					options['trash'],
					options['stopSharing'],
					options['cancel']
				]
			}
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				options['restore'],
				options['deletePermanently'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("links") !== -1){
			if(item.isSync){
				buttons = [
					options['share'],
					options['publicLink'],
					options['color'],
					options['favorite'],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					options['share'],
					options['publicLink'],
					options['rename'],
					options['color'],
					options['favorite'],
					options['cancel']
				]
			}
			else{
				buttons = [
					options['share'],
					options['publicLink'],
					//options['move'],
					options['rename'],
					options['color'],
					options['favorite'],
					options['trash'],
					options['cancel']
				]
			}
		}
		else if(utils.currentParentFolder() == "base"){
			if(item.isSync){
				buttons = [
					options['share'],
					options['publicLink'],
					options['color'],
					options['favorite'],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					options['share'],
					options['publicLink'],
					options['rename'],
					options['color'],
					options['favorite'],
					options['cancel']
				]
			}
			else{
				buttons = [
					options['share'],
					options['publicLink'],
					options['move'],
					options['rename'],
					options['color'],
					options['favorite'],
					options['trash'],
					options['cancel']
				]
			}
		}
		else{
			buttons = [
				options['share'],
				options['publicLink'],
				options['move'],
				options['rename'],
				options['color'],
				options['favorite'],
				options['trash'],
				options['cancel']
			]
		}
	}
	/*
	conditional
	...(!isPlatform("ioss") ? [{
		text: language.get(this.state.lang, "downloadItem"),
		icon: Ionicons.download,
		handler: () => {
			window.customFunctions.dismissModal()

			return this.queueFileDownload(item)
		}
	}] : [])
	*/
	else{
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['offline'],
				options['removeFromShared'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) ? options['edit'] : [])],
				options['share'],
				options['publicLink'],
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['offline'],
				options['versions'],
				//options['favorite'],
				//options['move'],
				options['rename'],
				options['trash'],
				options['stopSharing'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['restore'],
				options['deletePermanently'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("links") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) ? options['edit'] : [])],
				options['share'],
				options['publicLink'],
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['offline'],
				options['versions'],
				options['favorite'],
				//options['move'],
				options['rename'],
				options['trash'],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("recent") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) ? options['edit'] : [])],
				options['share'],
				options['publicLink'],
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['offline'],
				options['versions'],
				options['favorite'],
				options['rename'],
				options['trash'],
				options['cancel']
			]
		}
		else{
			buttons = [
				...[(["code", "text"].includes(previewType) ? options['edit'] : [])],
				options['share'],
				options['publicLink'],
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				options['download'],
				options['offline'],
				options['versions'],
				options['favorite'],
				options['move'],
				options['rename'],
				options['trash'],
				options['cancel']
			]
		}
	}

	let presentButtons = []

	for(let i = 0; i < buttons.length; i++){
		if(typeof buttons[i].text !== "undefined"){
			presentButtons.push(buttons[i])
		}
	}

	let headerName = item.name

	if(headerName.length >= 32){
		headerName = headerName.substring(0, 32) + "..."
	}

    let actionSheet = await actionSheetController.create({
        header: headerName,
        buttons: presentButtons
    })

	await actionSheet.present()
	
	if(Capacitor.isNative){
		setTimeout(() => {
			Capacitor.Plugins.Keyboard.hide()
		}, 500)
	}

	return true
}