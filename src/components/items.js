import * as language from "../utils/language"
import { loadingController, modalController, popoverController, alertController, actionSheetController } from "@ionic/core"
import * as Ionicons from 'ionicons/icons'
import { Capacitor } from "@capacitor/core"
import { isPlatform } from "@ionic/react"
import { SplashScreen } from "@capacitor/splash-screen"
import { Keyboard } from "@capacitor/keyboard"
import { Haptics, HapticsImpactStyle } from "@capacitor/haptics"
import { Media } from "@capacitor-community/media"
import { Mediastore } from "@agorapulse/capacitor-mediastore"
import { Base64 } from "js-base64"
import * as workers from "../utils/workers"
import { queueFileDownload, downloadPreview } from "./download"
import { fileExists } from "./upload"
import { setupStatusbar } from "./setup"
import { spawnToast, spawnMoveToast, spawnRenamePrompt } from "./spawn"

const utils = require("../utils/utils")
const safeAreaInsets = require("safe-area-insets")
const Hammer = require("hammerjs")

export async function updateItemList(self, showLoader = true, bypassItemsCache = false, isFollowUpRequest = false, windowLocationHref = undefined, callStack = 0){
	if(!self.state.isLoggedIn){
		return self.showLogin()
	}
	
	if(self.state.userAPIKey.length <= 16){
		return self.showLogin()
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			backdropDismiss: false,
			showBackdrop: false
		})
	
		loading.present()
	}

	if(Capacitor.isNative){
		Keyboard.hide()
	}

	if(Capacitor.isNative && window.customVariables.isDocumentReady){
        SplashScreen.hide()
    }

	let isDeviceOnline = window.customFunctions.isDeviceOnline()

	self.setState({
        searchbarOpen: false,
        mainSearchTerm: ""
    })

	let routeEx = window.location.hash.split("/")
	let parent = routeEx[routeEx.length - 1]
	let requestedFolderSizes = {}

	if(!isDeviceOnline){
		bypassItemsCache = false
	}

	if(typeof window.customVariables.itemsCache[window.location.href] == "object" && !bypassItemsCache){
		if(callStack == 0 && isDeviceOnline){
			updateItemList(self, false, true, true, window.location.href, 1)
		}

		let items = window.customVariables.itemsCache[window.location.href]

		if(!self.state.settings.showThumbnails){
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
		else if(parent == self.state.settings.cameraUpload.parent && window.customVariables.orderBy == "nameAsc"){
			items = utils.orderItemsByType(items, "dateAsc")
		}
		else{
			items = utils.orderItemsByType(items, window.customVariables.orderBy)
		}

		window.customVariables.itemList = items
	
		let scrollTo = undefined
	
		if(typeof window.customVariables.scrollToIndex[parent] !== "undefined"){
			scrollTo = window.customVariables.scrollToIndex[parent]
	
			delete window.customVariables.scrollToIndex[parent]
		}

		let counter = self.state.itemListChangeCounter

		var stateObj = {
			itemList: items,
			scrollToIndex: scrollTo,
			itemListChangeCounter: (counter + 1)
		}
	
		return self.setState(stateObj, () => {
			self.forceUpdate()

			setTimeout(window.customFunctions.saveCachedItems, 1000)

			if(showLoader){
				setTimeout(() => {
					loading.dismiss()
				}, 1)
			}

			for(let i = 0; i < items.length; i++){
				if(typeof requestedFolderSizes[items[i].uuid] == "undefined" && items[i].type !== "file"){
					requestedFolderSizes[items[i].uuid] = true
	
					let canRequest = false
	
					if(typeof window.customVariables.requestFolderSizesTimeout[items[i].uuid] == "number"){
						if(Math.floor((+new Date()) / 1000) > window.customVariables.requestFolderSizesTimeout[items[i].uuid]){
							canRequest = true
						}
					}
					else{
						canRequest = true
					}
	
					if(canRequest){
						window.customVariables.requestFolderSizesTimeout[items[i].uuid] = (Math.floor((+new Date()) / 1000) + 60)
	
						window.customFunctions.getFolderSize(items[i], window.location.href)
					}
				}
			}

			items = null
			stateObj = null

			return true
		})
	}

	if(!isDeviceOnline){
		window.customFunctions.dismissLoader()

		let counter = self.state.itemListChangeCounter

		return self.setState({
			itemList: [],
			showMainSkeletonPlaceholder: false,
			itemListChangeCounter: (counter + 1),
			scrollToIndex: 0
		}, () => {
			self.forceUpdate()
		})

		/*if(!bypassItemsCache){
			return self.setState({
				itemList: [],
				showMainSkeletonPlaceholder: false
			}, () => {
				self.forceUpdate()
			})
		}
	
		let alert = await alertController.create({
			header: "",
			subHeader: "",
			message: language.get(self.state.lang, "apiRequestError"),
			buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
		})

		return alert.present()*/
	}

	window.customVariables.currentThumbnailURL = window.location.href

	let items = []
	
	if(parent == "base"){
		try{
			var res = await utils.apiRequest("POST", "/v1/user/baseFolders", {
				apiKey: self.state.userAPIKey
			})
		}
		catch(e){
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
			console.log(res.message)

			if(res.message.toLowerCase().indexOf("api key not found") !== -1){
				return window.customFunctions.logoutUser()
			}
	
			window.customFunctions.dismissLoader()
	
			let alert = await alertController.create({
				header: "",
				subHeader: "",
				message: language.get(self.state.lang, "apiRequestError"),
				buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
			})
	
			return alert.present()
		}

		for(let i = 0; i < res.data.folders.length; i++){
			let folder = res.data.folders[i]

			if(showLoader){
				loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [i, res.data.folders.length])
			}

			let folderName = await utils.decryptFolderName(folder.name, self.state.userMasterKeys, folder.uuid)
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
				isDefault: folder.is_default,
				size: window.customFunctions.getFolderSizeFromCache({
					uuid: folder.uuid
				}, window.location.href)
			}

			items.push(item)

			window.customVariables.cachedFolders[folder.uuid] = item
		}
	}
	else if(parent == "recent"){
		try{
			var res = await utils.apiRequest("POST", "/v1/user/recent", {
				apiKey: self.state.userAPIKey
			})
		}
		catch(e){
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
			console.log(res.message)

			if(res.message.toLowerCase().indexOf("api key not found") !== -1){
				return window.customFunctions.logoutUser()
			}
	
			window.customFunctions.dismissLoader()
	
			let alert = await alertController.create({
				header: "",
				subHeader: "",
				message: language.get(self.state.lang, "apiRequestError"),
				buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
			})
	
			return alert.present()
		}

		for(let i = 0; i < res.data.length; i++){
			let file = res.data[i]

			if(showLoader){
				loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [i, res.data.length])
			}

			let metadata = await utils.decryptFileMetadata(file.metadata, self.state.userMasterKeys, file.uuid)
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
				size: file.size,
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
				var usrPrivKey = await window.crypto.subtle.importKey("pkcs8", utils._base64ToArrayBuffer(self.state.userPrivateKey), {
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
					message: language.get(self.state.lang, "unknownDeviceError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/user/shared/in", {
					apiKey: self.state.userAPIKey,
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
					message: language.get(self.state.lang, "apiRequestError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
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
					message: language.get(self.state.lang, "apiRequestError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let decrypted = 0

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

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
					isDefault: folder.is_default,
					size: window.customFunctions.getFolderSizeFromCache({
						uuid: folder.uuid,
						sharerId: folder.sharerId,
						receiverId: window.customVariables.cachedUserInfo.id
					}, window.location.href)
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

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
					size: file.size,
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
					apiKey: self.state.userAPIKey,
					uuid: parent,
					folders: JSON.stringify(["default"]),
					page: 1,
					app: "true",
					receiverId: self.state.currentReceiverId
				})
			}
			catch(e){
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
				console.log(res.message)

				if(res.message.toLowerCase().indexOf("api key not found") !== -1){
					return window.customFunctions.logoutUser()
				}
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(self.state.lang, "apiRequestError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let decrypted = 0

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

				let folderName = await utils.decryptFolderName(folder.metadata, self.state.userMasterKeys, folder.uuid)
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
					isDefault: folder.is_default,
					size: window.customFunctions.getFolderSizeFromCache({
						uuid: folder.uuid,
						sharerId: window.customVariables.cachedUserInfo.id,
						receiverId: folder.receiverId
					}, window.location.href)
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

				let metadata = await utils.decryptFileMetadata(file.metadata, self.state.userMasterKeys, file.uuid)
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
					size: file.size,
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
					apiKey: self.state.userAPIKey,
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
					message: language.get(self.state.lang, "apiRequestError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			if(!res.status){
				console.log(res.message)
		
				window.customFunctions.dismissLoader()
		
				let alert = await alertController.create({
					header: "",
					subHeader: "",
					message: language.get(self.state.lang, "apiRequestError"),
					buttons: [language.get(self.state.lang, "alertOkButton").toUpperCase()]
				})
		
				return alert.present()
			}

			let decrypted = 0

			for(let i = 0; i < res.data.folders.length; i++){
				let folder = res.data.folders[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

				let folderName = await utils.decryptFolderName(folder.name, self.state.userMasterKeys, folder.uuid)
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
					isDefault: folder.is_default,
					size: window.customFunctions.getFolderSizeFromCache({
						uuid: folder.uuid
					}, window.location.href)
				}

				items.push(item)

				window.customVariables.cachedFolders[folder.uuid] = item
			}

			for(let i = 0; i < res.data.uploads.length; i++){
				let file = res.data.uploads[i]

				decrypted += 1

				if(showLoader){
					loading.message = language.get(self.state.lang, "decryptingItems", true, ["__COUNT__", "__TOTAL__"], [decrypted, (res.data.folders.length + res.data.uploads.length)])
				}

				let metadata = await utils.decryptFileMetadata(file.metadata, self.state.userMasterKeys, file.uuid)
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
					size: file.size,
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

	if(!self.state.settings.showThumbnails){
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
	else if(parent == self.state.settings.cameraUpload.parent){
		items = utils.orderItemsByType(items, "dateAsc")
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

	let scrollTo = undefined

	if(typeof window.customVariables.scrollToIndex[parent] !== "undefined"){
		scrollTo = window.customVariables.scrollToIndex[parent]

		delete window.customVariables.scrollToIndex[parent]
	}

	let counter = self.state.itemListChangeCounter

	var stateObj = {
		itemList: items,
		scrollToIndex: scrollTo,
		showMainSkeletonPlaceholder: false,
		itemListChangeCounter: (counter + 1)
	}

	if(isFollowUpRequest){
		stateObj = {
			itemList: items,
			showMainSkeletonPlaceholder: false
		}
	}

	return self.setState(stateObj, () => {
		self.forceUpdate()

		window.customFunctions.saveCachedItems()
		window.customFunctions.saveItemsCache()
		window.customFunctions.dismissLoader()

		for(let i = 0; i < items.length; i++){
			if(typeof requestedFolderSizes[items[i].uuid] == "undefined" && items[i].type !== "file"){
				requestedFolderSizes[items[i].uuid] = true

				let canRequest = false

				if(typeof window.customVariables.requestFolderSizesTimeout[items[i].uuid] == "number"){
					if(Math.floor((+new Date()) / 1000) > window.customVariables.requestFolderSizesTimeout[items[i].uuid]){
						canRequest = true
					}
				}
				else{
					canRequest = true
				}

				if(canRequest){
					window.customVariables.requestFolderSizesTimeout[items[i].uuid] = (Math.floor((+new Date()) / 1000) + 60)

					window.customFunctions.getFolderSize(items[i], window.location.href)
				}
			}
		}

		items = null
		stateObj = null

		return true
	})
}

export function selectItem(self, type, index){
    let items = self.state.itemList
    let selectedItems = self.state.selectedItems

    if(type){
        if(!items[index].selected){
            items[index].selected = type
            selectedItems = selectedItems + 1
		}
		
		if(selectedItems == 1 && Capacitor.isNative){
			Haptics.impact(HapticsImpactStyle.Light)
		}
    }
    else{
        if(items[index].selected){
            items[index].selected = type
            selectedItems = selectedItems - 1
        }
    }

    return self.setState({
        itemList: items,
        selectedItems
    }, () => {
		self.forceUpdate()
	})
}

export function clearSelectedItems(self){
    let items = self.state.itemList

    for(let i = 0; i < items.length; i++){
        items[i].selected = false
    }

    return self.setState({
        itemList: items,
        selectedItems: 0
    }, () => {
		self.forceUpdate()
	})
}

export async function selectItemsAction(self, event){
    event.persist()

	let appLang = self.state.lang
	let customElementId = utils.generateRandomClassName()
	let selectedItemsDoesNotContainFolder = utils.selectedItemsDoesNotContainFolder(self.state.itemList)
	let selectedItemsContainsDefaultFolder = utils.selectedItemsContainsDefaultFolder(self.state.itemList)

	let isDeviceOnline = window.customFunctions.isDeviceOnline()

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

	if(!isDeviceOnline){
		inner = `
			<ion-list>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.selectAllItems()">` + language.get(appLang, "selectAll") + `</ion-item>
				<ion-item lines="none" detail="false" button onClick="window.customFunctions.unselectAllItems()">` + language.get(appLang, "unselectAll") + `</ion-item>
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
        event: event,
		showBackdrop: false
    })

    return popover.present()
}

export async function previewItem(self, item, lastModalPreviewType = undefined, isOuterPreview = false){
	if(!window.customFunctions.isDeviceOnline()){
		if(typeof window.customVariables.offlineSavedFiles[item.uuid] !== "undefined" && typeof lastModalPreviewType == "undefined"){
			return window.customFunctions.openOfflineFile(item)
		}
		else{
			return false
		}
	}

    if(item.type !== "file"){
		return false
	}

	if(Capacitor.isNative && typeof lastModalPreviewType == "undefined"){
        if(self.state.settings.onlyWifi){
            let networkStatus = self.state.networkStatus

            if(networkStatus.connectionType !== "wifi"){
                return spawnToast(language.get(self.state.lang, "onlyWifiError"))
            }
        }
	}

	if(document.getElementById("main-searchbar") !== null){
		document.getElementById("main-searchbar").blur()
	}
	
	if(Capacitor.isNative){
		Keyboard.hide()
	}

	if(typeof window.customVariables.offlineSavedFiles[item.uuid] !== "undefined" && typeof lastModalPreviewType == "undefined"){
		return window.customFunctions.openOfflineFile(item)
	}
	else{
		let nameEx = item.name.split(".")
		let previewType = utils.getFilePreviewType(nameEx[nameEx.length - 1])

		let previewLocally = false

		if(isPlatform("ios")){
			if(["pdf", "doc", "heic", "heif", "hevc"].includes(previewType)){
				previewLocally = true
			}
		}
		else{
			if(["pdf", "doc"].includes(previewType)){
				previewLocally = true
			}
		}

		if(previewLocally){
			let loading = await loadingController.create({
				message: "",
				backdropDismiss: false,
				showBackdrop: false
			})
	
			loading.present()

			return queueFileDownload(self, item, true, () => {
				loading.dismiss()

				window.customFunctions.openOfflineFile(item)
			}, true)
		}

		if(previewType == "none"){
			if(typeof lastModalPreviewType !== "undefined"){
				window.customFunctions.dismissModal()
			}

			return spawnItemActionSheet(self, item)
		}

		if(item.size > ((1024 * 1024) * 128)){
			if(typeof lastModalPreviewType !== "undefined"){
				window.customFunctions.dismissModal()
			}

			return spawnItemActionSheet(self, item)
		}

		const gotPreviewData = async (dataArray) => {
			window.customVariables.imagePreviewZoomedIn = false

			try{
				var blob = await workers.newBlob(dataArray, {
					type: item.mime,
					name: item.name
				})
			}
			catch(e){
				return console.log(e)
			}

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
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + Base64.encode(JSON.stringify(item)) + `')">
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
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + Base64.encode(JSON.stringify(item)) + `')">
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
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + Base64.encode(JSON.stringify(item)) + `')">
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
								<ion-button onclick="window.customFunctions.openItemActionSheetFromJSON('` + Base64.encode(JSON.stringify(item)) + `')">
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

			blob = null
			dataArray = null

			if(previewModalContent.length <= 8){
				if(typeof lastModalPreviewType !== "undefined"){
					window.customFunctions.dismissModal()
				}

				return spawnItemActionSheet(self, item)
			}

			const setupBars = async () => {
				if(previewType == "image" || previewType == "video" || previewType == "audio"){
					setupStatusbar(self, "image/video")

					try{
						let modal = await modalController.getTop()
	
						modal.onDidDismiss().then(() => {
							setupStatusbar(self)
						})
					}
					catch(e){
						console.log(e)
					}
				}
				else{
					setupStatusbar(self, "modal")

					try{
						let modal = await modalController.getTop()
	
						modal.onDidDismiss().then(() => {
							setupStatusbar(self)
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

				let itemList = self.state.itemList

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

							let scrollTo = 0

							if(self.state.settings.gridModeEnabled){
								scrollTo = Math.floor(nextItem.listIndex / 2)

								if(scrollTo <= 0){
									scrollTo = 0
								}
							}
							else{
								scrollTo = nextItem.listIndex
							}

							self.setState({
								scrollToIndex: scrollTo
							})

							return previewItem(self, nextItem.item, lastPreviewType)
						}
						else{
							let prevItem = getPrevOrNextItem("prev")

							if(typeof prevItem == "undefined"){
								return false
							}

							let scrollTo = 0

							if(self.state.settings.gridModeEnabled){
								scrollTo = Math.floor(prevItem.listIndex / 2)

								if(scrollTo <= 0){
									scrollTo = 0
								}
							}
							else{
								scrollTo = prevItem.listIndex
							}

							self.setState({
								scrollToIndex: scrollTo
							})

							return previewItem(self, prevItem.item, lastPreviewType)
						}
					}
					else{
						if(xDiffAbs < yDiffAbs && Math.max(xDiffAbs, yDiffAbs) > offsetY){
							//window.customFunctions.dismissModal()
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

					return self.spawnItemActionSheet(item)
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
					Keyboard.hide()
				}

				try{
					modal.onDidDismiss(() => {
						if(typeof window.customVariables.currentPreviewURL !== "undefined"){
							window.customVariables.urlCreator.revokeObjectURL(window.customVariables.currentPreviewURL)
						}
					})
				}
				catch(e){
					console.log(e)
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
			backdropDismiss: true,
			showBackdrop: false
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

		downloadPreview(item, (chunksDone) => {
			//console.log(chunksDone)
		}, (err, dataArray) => {
			window.customVariables.isGettingPreviewData = false

			loading.dismiss()

			if(err){
				if(err !== "stopped"){
					console.log(err)

					return spawnToast(language.get(self.state.lang, "fileNoPreviewAvailable", true, ["__NAME__"], [item.name]))
				}
				else{
					return false
				}
			}

			gotPreviewData(dataArray)

			return dataArray = null
		})
	}
}

export async function dirExists(self, name, parent, callback){
	if(parent == null){
		parent = "base"
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/dir/exists", {
			apiKey: self.state.userAPIKey,
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

export async function moveFolder(self, folder, destination, showLoader){
	if(folder.parent == destination){
		return spawnToast(language.get(self.state.lang, "moveFileOrFolderSameDestination"))
	}

	if(utils.currentParentFolder() == "base"){
		if(folder.uuid == "default" || folder.name.toLowerCase() == "filen sync"){
			return spawnToast(language.get(self.state.lang, "thisFolderCannotBeMoved")) 
		}
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()
	}

	return dirExists(self, folder.name, destination, async (err, exists, existsUUID) => {
		if(err){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "apiRequestError"))
		}

		if(exists){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "folderMoveAlreadyExistsHere", true, ["__NAME__"], [folder.name]))
		}

		try{
			var res = await utils.apiRequest("POST", "/v1/dir/move", {
				apiKey: self.state.userAPIKey,
				uuid: folder.uuid,
				folderUUID: destination
			})
		}
		catch(e){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "apiRequestError"))
		}

		if(!res.status){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(res.message)
		}

		return utils.checkIfItemParentIsBeingShared(destination, "folder", {
			name: folder.name,
			uuid: folder.uuid
		}, () => {
			if(showLoader){
				loading.dismiss()
			}

			spawnToast(language.get(self.state.lang, "folderMoved", true, ["__NAME__"], [folder.name]))

			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				if(utils.currentParentFolder() == destination){
					updateItemList(self)
				}
			}, 500)

			return true
		})
	})
}

export async function moveFile(self, file, destination, showLoader){
	if(file.parent == destination){
		return spawnToast(language.get(self.state.lang, "moveFileOrFolderSameDestination"))
	}

	if(destination == "trash" || destination == "base" || destination == "shared-in" || destination == "shared-out"){
		return spawnToast(language.get(self.state.lang, "cannotMoveFileHere"))
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()
	}

	return fileExists(self, file.name, destination, async (err, exists, existsUUID) => {
		if(err){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "apiRequestError"))
		}

		if(exists){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "fileMoveAlreadyExistsHere", true, ["__NAME__"], [file.name]))
		}

		try{
			var res = await utils.apiRequest("POST", "/v1/file/move", {
				apiKey: self.state.userAPIKey,
				fileUUID: file.uuid,
				folderUUID: destination
			})
		}
		catch(e){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(language.get(self.state.lang, "apiRequestError"))
		}

		if(!res.status){
			if(showLoader){
				loading.dismiss()
			}

			return spawnToast(res.message)
		}

		return utils.checkIfItemParentIsBeingShared(destination, "file", {
			uuid: file.uuid,
			name: file.name,
			size: parseInt(file.size),
			mime: file.mime,
			key: file.key,
			lastModified: file.lastModified
		}, () => {
			if(showLoader){
				loading.dismiss()
			}

			spawnToast(language.get(self.state.lang, "fileMoved", true, ["__NAME__"], [file.name]))

			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				if(utils.currentParentFolder() == destination){
					updateItemList(self)
				}
			}, 500)

			return true
		})
	})
}

export function moveItem(self, item){
	return self.spawnMoveToast((cancelled, destination) => {
		if(cancelled){
			return false
		}

		if(item.type == "file"){
			return moveFile(self, item, destination, true)
		}
		else{
			return moveFolder(self, item, destination, true)
		}
	})
}

export async function renameItem(self, item){
	let parent = utils.currentParentFolder()

	if(parent == "base"){
		if(item.uuid == "default" || item.name.toLowerCase() == "filen sync"){
			return spawnToast(language.get(self.state.lang, "cannotRenameItem", true, ["__NAME__"], [item.name]))
		}
	}

	return spawnRenamePrompt(self, item, async (cancelled, newName) => {
		if(cancelled){
			return false
		}

		if(item.name == newName){
			return false
		}

		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()

		if(item.type == "file"){
			if(utils.fileNameValidationRegex(newName)){
				loading.dismiss()

				return spawnToast(language.get(self.state.lang, "invalidFileName"))
			}

			if(newName.length >= 250){
				loading.dismiss()

				return spawnToast(language.get(self.state.lang, "invalidFileName"))
			}

			let nameEx = item.name.split(".")
			let fileExt = nameEx[nameEx.length - 1]
			let renameWithDot = false

			if(item.name.indexOf(".") !== -1){
				renameWithDot = true
			}

			return fileExists(self, newName, parent, async (err, exists, existsUUID) => {
				if(err){
					console.log(err)

					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "apiRequestError"))
				}

				if(exists){
					if(item.uuid !== existsUUID){
						loading.dismiss()

						return spawnToast(language.get(self.state.lang, "fileRenameAlreadyExists", true, ["__NAME__"], [newName]))
					}
				}

				if(renameWithDot){
					newName = newName + "." + fileExt
				}

				try{
					var res = await utils.apiRequest("POST", "/v1/file/rename", {
						apiKey: self.state.userAPIKey,
						uuid: item.uuid,
						name: await utils.encryptMetadata(newName, item.key),
						nameHashed: utils.hashFn(newName.toLowerCase()),
						metaData: await utils.encryptMetadata(JSON.stringify({
							name: newName,
							size: parseInt(item.size),
							mime: item.mime,
							key: item.key,
							lastModified: item.lastModified
						}), self.state.userMasterKeys[self.state.userMasterKeys.length - 1])
					})
				}
				catch(e){
					console.log(e)

					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "apiRequestError"))
				}

				if(!res.status){
					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "couldNotRenameFile"))
				}

				return utils.checkIfItemIsBeingSharedForRename("file", item.uuid, {
					name: newName,
					size: parseInt(item.size),
					mime: item.mime,
					key: item.key
				}, () => {
					loading.dismiss()

					spawnToast(language.get(self.state.lang, "fileRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

					delete window.customVariables.cachedFiles[item.uuid]

					clearTimeout(window.customVariables.reloadAfterActionTimeout)

					window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
						if(utils.currentParentFolder() == parent){
							updateItemList(self)
						}
					}, 500)

					return true
				})
			})
		}
		else{
			if(utils.fileNameValidationRegex(newName)){
				loading.dismiss()

				return spawnToast(language.get(self.state.lang, "invalidFolderName"))
			}

			if(newName.length >= 250){
				loading.dismiss()

				return spawnToast(language.get(self.state.lang, "invalidFolderName"))
			}

			return dirExists(newName, parent, async (err, exists, existsUUID) => {
				if(err){
					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "apiRequestError"))
				}

				if(exists){
					if(item.uuid !== existsUUID){
						loading.dismiss()

						return spawnToast(language.get(self.state.lang, "folderRenameAlreadyExists", true, ["__NAME__"], [newName]))
					}
				}

				try{
					var res = await utils.apiRequest("POST", "/v1/dir/rename", {
						apiKey: self.state.userAPIKey,
						uuid: item.uuid,
						name: await utils.encryptMetadata(JSON.stringify({
							name: newName,
						}), self.state.userMasterKeys[self.state.userMasterKeys.length - 1]),
						nameHashed: utils.hashFn(newName.toLowerCase())
					})
				}
				catch(e){
					console.log(e)

					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "apiRequestError"))
				}

				if(!res.status){
					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "couldNotRenameFolder"))
				}

				return utils.checkIfItemIsBeingSharedForRename("folder", item.uuid, {
					name: newName
				}, () => {
					loading.dismiss()

					spawnToast(language.get(self.state.lang, "folderRenamed", true, ["__NAME__", "__TO__"], [item.name, newName]))

					delete window.customVariables.cachedFolders[item.uuid]

					clearTimeout(window.customVariables.reloadAfterActionTimeout)

					window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
						if(utils.currentParentFolder() == parent){
							updateItemList(self)
						}
					}, 500)

					return true
				})
			})
		}
	})
}

export async function moveSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	return spawnMoveToast(self, (cancelled, destination) => {
		if(cancelled){
			return false
		}

		for(let i = 0; i < items.length; i++){
			if(items[i].type == "file"){
				moveFile(self, items[i], destination, true)
			}
			else{
				moveFolder(self, items[i], destination, true)
			}
		}
	})
}

export async function trashSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
		header: language.get(self.state.lang, "trashItemHeader"),
		message: language.get(self.state.lang, "trashItemsConfirmMessage", true, ["__COUNT__"], [items.length]),
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
					return items.forEach((item) => {
						trashItem(self, item, false)
					})
				}
			}
		]
	})

	return alert.present()
}

export async function restoreSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
		header: language.get(self.state.lang, "restoreItemsHeader"),
		message: language.get(self.state.lang, "restoreItemsConfirmMessage", true, ["__COUNT__"], [items.length]),
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
					return items.forEach((item) => {
						restoreItem(self, item, false)
					})
				}
			}
		]
	})

	return alert.present()
}

export function getSelectedItems(self){
	return new Promise((resolve, reject) => {
		let items = self.state.itemList.filter((item) => {
			return item.selected === true
		})

		return resolve(items)
	})
}

export async function restoreItem(self, item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()
	}

	if(item.type == "file"){
		return fileExists(self, item.name, item.parent, async (err, exists, existsUUID) => {
			if(err){
				console.log(err)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "apiRequestError"))
			}

			if(exists){
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "fileExistsAtRestoreDestination", true, ["__NAME__"], [item.name]))
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/file/restore", {
					apiKey: self.state.userAPIKey,
					uuid: item.uuid
				})
			}
			catch(e){
				console.log(e)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "apiRequestError"))
			}
		
			if(!res.status){
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "couldNotRestoreItem", true, ["__NAME__"], [item.name]))
			}
		
			if(showLoader){
				loading.dismiss()
			}
		
			clearTimeout(window.customVariables.reloadAfterActionTimeout)
		
			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				updateItemList(self)
			}, 500)
		
			return spawnToast(language.get(self.state.lang, "itemRestored", true, ["__NAME__"], [item.name]))
		})
	}
	else{
		return dirExists(self, item.name, item.parent, async (err, exists, existsUUID) => {
			if(err){
				console.log(err)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "apiRequestError"))
			}

			if(exists){
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "folderExistsAtRestoreDestination", true, ["__NAME__"], [item.name]))
			}

			try{
				var res = await utils.apiRequest("POST", "/v1/dir/restore", {
					apiKey: self.state.userAPIKey,
					uuid: item.uuid
				})
			}
			catch(e){
				console.log(e)
		
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "apiRequestError"))
			}
		
			if(!res.status){
				if(showLoader){
					loading.dismiss()
				}
		
				return spawnToast(language.get(self.state.lang, "couldNotRestoreItem", true, ["__NAME__"], [item.name]))
			}
		
			if(showLoader){
				loading.dismiss()
			}
		
			clearTimeout(window.customVariables.reloadAfterActionTimeout)
		
			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				updateItemList(self)
			}, 500)
		
			return spawnToast(language.get(self.state.lang, "itemRestored", true, ["__NAME__"], [item.name]))
		})
	}
}

export async function trashItem(self, item, showLoader){
	if(utils.currentParentFolder() == "base"){
		if(item.uuid == "default" || item.name.toLowerCase() == "filen sync"){
			return spawnToast(language.get(self.state.lang, "cannotTrashItem", true, ["__NAME__"], [item.name]))
		}
	}

	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()
	}

	try{
		if(item.type == "file"){
			var res = await utils.apiRequest("POST", "/v1/file/trash", {
				apiKey: self.state.userAPIKey,
				uuid: item.uuid
			})
		}
		else{
			var res = await utils.apiRequest("POST", "/v1/dir/trash", {
				apiKey: self.state.userAPIKey,
				uuid: item.uuid
			})
		}
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(language.get(self.state.lang, "apiRequestError"))
	}

	if(!res.status){
		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(language.get(self.state.lang, "couldNotTrashItem", true, ["__NAME__"], [item.name]))
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		updateItemList(self)
	}, 500)

	return spawnToast(language.get(self.state.lang, "itemTrashed", true, ["__NAME__"], [item.name]))
}

export async function shareItemWithEmail(self, email, uuid, type, callback){
	if(email == self.state.userEmail){
		return callback(language.get(self.state.lang, "cannotShareWithSelf"))
	}

	let loading = await loadingController.create({
		message: "",
		showBackdrop: false
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

		return callback(language.get(self.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
	}

	if(userPubKey.length <= 1){
		loading.dismiss()

		return callback(language.get(self.state.lang, "shareItemUserNotFound", true, ["__EMAIL__"], [email]))
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

			return callback(language.get(self.state.lang, "shareItemFileNotFound", true, ["__NAME__"], [uuid]))
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
				apiKey: self.state.userAPIKey,
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
				apiKey: self.state.userAPIKey,
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

			return callback(language.get(self.state.lang, "shareTooBigForApp"))
		}

		for(let i = 0; i < files.length; i++){
			let metadata = await utils.decryptFileMetadata(files[i].metadata, self.state.userMasterKeys, files[i].uuid)

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
			let dirName = await utils.decryptFolderName(folders[i].name, self.state.userMasterKeys, folders[i].uuid)

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
				return cb(language.get(self.state.lang, "apiRequestError"))
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
				apiKey: self.state.userAPIKey,
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

				loading.message = language.get(self.state.lang, "sharedItemsCount", true, ["__SHARED__", "__TOTAL__"], [itemsShared, shareItems.length])

				if(itemsShared == shareItems.length){
					loading.dismiss()

					return callback(null)
				}
			})
		}
	}
}

export async function shareSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	let alert = await alertController.create({
        header: language.get(self.state.lang, "shareItems"),
        inputs: [
            {
                type: "text",
                id: "share-items-email-input",
				name: "share-items-email-input",
				placeholder: language.get(self.state.lang, "receiverEmail"),
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
					let email = inputs['share-items-email-input']

					let itemsShared = 0

					for(let i = 0; i < items.length; i++){
						let item = items[i]

						if(item.type == "folder" && item.uuid == "default"){
							spawnToast(language.get(self.state.lang, "cannotShareDefaultFolder"))
						}
						else{
							shareItemWithEmail(self, email, item.uuid, item.type, (err) => {
								if(err){
									console.log(err)
	
									spawnToast(err.toString())
								}
	
								itemsShared += 1
	
								if(itemsShared >= items.length){
									return spawnToast(language.get(self.state.lang, "itemsShared", true, ["__COUNT__", "__EMAIL__"], [items.length, email]))
								}
							})
						}
					}

					return true
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

export async function shareItem(self, item){
	if(item.type == "folder" && item.uuid == "default"){
		return spawnToast(language.get(self.state.lang, "cannotShareDefaultFolder"))
	}

	let alert = await alertController.create({
        header: item.type == "file" ? language.get(self.state.lang, "shareFile") : language.get(self.state.lang, "shareFolder"),
        inputs: [
            {
                type: "text",
                id: "share-item-email-input",
				name: "share-item-email-input",
				placeholder: language.get(self.state.lang, "receiverEmail"),
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
                handler: (inputs) => {
					let email = inputs['share-item-email-input']

                    return shareItemWithEmail(self, email, item.uuid, item.type, (err) => {
						if(err){
							console.log(err)

							return spawnToast(err.toString())
						}

						return spawnToast(language.get(self.state.lang, "itemShared", true, ["__NAME__", "__WITH__"], [item.name, email]))
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

export async function openPublicLinkModal(self, item){
	if(item.uuid == "default"){
		return spawnToast(language.get(self.state.lang, "cannotCreatePublicLinkFolder"))
	}

	let loading = await loadingController.create({
		message: "",
		showBackdrop: false
	})

	loading.present()

	if(item.type == "file"){
		try{
			var res = await utils.apiRequest("POST", "/v1/link/status", {
				apiKey: self.state.userAPIKey,
				fileUUID: item.uuid
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
	
		let appLang = self.state.lang
		let appDarkMode = self.state.darkMode
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
									<ion-button color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'enable', false)">` + language.get(appLang, "enablePublicLink") + `</ion-button>	
								</center>
							</div>
						</div>
						<div id="public-link-enabled-content" ` + (!res.data.enabled && `style="display: none;"`) + `>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnabled") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enabled-toggle" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'disable', false)" checked></ion-toggle>
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
								<ion-button id="save-link-btn" data-currentlinkuuid="` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `" expand="block" size="small" color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'enable', true)">` + language.get(appLang, "savePublicLink") + `</ion-button>
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
	else{
		try{
			var res = await utils.apiRequest("POST", "/v1/dir/link/status", {
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
			console.log(res.message)
	
			loading.dismiss()
	
			return spawnToast(res.message)
		}
	
		loading.dismiss()
	
		let appLang = self.state.lang
		let appDarkMode = self.state.darkMode
		let appUserMasterKeys = self.state.userMasterKeys
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
									<ion-button color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'enable', false)">` + language.get(appLang, "enablePublicLink") + `</ion-button>	
								</center>
							</div>
						</div>
						<div id="public-link-enabled-content" ` + (!res.data.exists && `style="display: none;"`) + `>
							<ion-item lines="none">
								<ion-label>
									` + language.get(appLang, "publicLinkEnabled") + `
								</ion-label>
								<ion-toggle slot="end" id="public-link-enabled-toggle" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'disable', true, '` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `')" checked></ion-toggle>
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
								<ion-button id="save-link-btn" data-currentlinkuuid="` + (typeof res.data.uuid !== "undefined" ? res.data.uuid : ``) + `" expand="block" size="small" color="primary" fill="solid" onClick="window.customFunctions.editItemPublicLink('` + Base64.encode(JSON.stringify(item)) + `', 'enable', true)">` + language.get(appLang, "savePublicLink") + `</ion-button>
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
}

export function makeItemAvailableOffline(self, offline, item, openAfterDownload = false){
	if(!offline){
		return window.resolveLocalFileSystemURL(window.cordova.file.dataDirectory + "/offlineFiles/" + item.uuid, (resolved) => {
			return resolved.remove(() => {
				delete window.customVariables.offlineSavedFiles[item.uuid]

				let items = self.state.itemList
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

				self.setState({
					itemList: items
				})

				window.customVariables.itemList = windowItems
				
				if(typeof window.customVariables.cachedFiles[item.uuid] !== "undefined"){
					window.customVariables.cachedFiles[item.uuid].offline = false
				}

				spawnToast(language.get(self.state.lang, "fileDeletedFromOfflineStorage", true, ["__NAME__"], [item.name]))

				window.customFunctions.saveOfflineSavedFiles()

				return self.forceUpdate()
			}, (err) => {
				console.log(err)
	
				return spawnToast(language.get(self.state.lang, "couldNotDeleteDownloadedFile", true, ["__NAME__"], [item.name]))
			})
		}, (err) => {
			console.log(err)
	
			return spawnToast(language.get(self.state.lang, "couldNotGetDownloadDir"))
		})
	}
	else{
		let nItem = item

		return queueFileDownload(self, nItem, true, () => {
			if(openAfterDownload){
				window.customFunctions.openOfflineFile(nItem)
			}
		})
	}
}

export async function removeSharedInItem(self, item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})

		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/user/shared/item/in/remove", {
			apiKey: self.state.userAPIKey,
			uuid: item.uuid,
			receiverId: 0
		})
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(language.get(self.state.lang, "apiRequestError"))
	}

	if(!res.status){
		console.log(res.message)

		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(res.message)
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		updateItemList(self)
	}, 500)

	return spawnToast(language.get(self.state.lang, "itemRemovedFromSharedIn", true, ["__NAME__"], [item.name]))
}

export async function stopSharingItem(self, item, showLoader){
	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})

		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/user/shared/item/out/remove", {
			apiKey: self.state.userAPIKey,
			uuid: item.uuid,
			receiverId: item.receiverId
		})
	}
	catch(e){
		console.log(e)

		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(language.get(self.state.lang, "apiRequestError"))
	}

	if(!res.status){
		console.log(res.message)

		if(showLoader){
			loading.dismiss()
		}

		return spawnToast(res.message)
	}

	if(showLoader){
		loading.dismiss()
	}

	clearTimeout(window.customVariables.reloadAfterActionTimeout)

	window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
		updateItemList(self)
	}, 500)

	return spawnToast(language.get(self.state.lang, "itemStoppedSharing", true, ["__NAME__"], [item.name]))
}

export async function removeSelectedItemsFromSharedIn(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		removeSharedInItem(self, item, false)
	}

	return true
}

export async function stopSharingSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		stopSharingItem(self, item, false)
	}

	return true
}

export async function downloadSelectedItems(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		if(item.type == "file"){
			queueFileDownload(self, item)
		}
	}

	return true
}

export async function storeSelectedItemsOffline(self){
	let items = await getSelectedItems(self)

	window.customFunctions.dismissPopover()
	window.customFunctions.unselectAllItems()

	for(let i = 0; i < items.length; i++){
		let item = items[i]

		if(item.type == "file"){
			queueFileDownload(self, item, true)
		}
	}

	return true
}

export async function colorItem(self, item){
	if(item.uuid == "default"){
		return spawnToast(language.get(self.state.lang, "thisFolderCannotBeColored")) 
	}

	let appLang = self.state.lang
	let appDarkMode = self.state.darkMode
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
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'default')" style="--background: #F6C358;">` + language.get(appLang, "colorItemDefault") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'blue')" style="--background: #2992E5; margin-top: 10px;">` + language.get(appLang, "colorItemBlue") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'green')" style="--background: #57A15B; margin-top: 10px;">` + language.get(appLang, "colorItemGreen") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'purple')" style="--background: #8E3A9D; margin-top: 10px;">` + language.get(appLang, "colorItemPurple") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'red')" style="--background: #CB2E35; margin-top: 10px;">` + language.get(appLang, "colorItemRed") + `</ion-button>
						<ion-button expand="block" size="small" onClick="window.customFunctions.changeItemColor('` + Base64.encode(JSON.stringify(item)) + `', 'gray')" style="--background: gray; margin-top: 10px;">` + language.get(appLang, "colorItemGray") + `</ion-button>
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

export async function favoriteItemRequest(self, item, value, showLoader = true){
	if(showLoader){
		var loading = await loadingController.create({
			message: "",
			showBackdrop: false
		})
	
		loading.present()
	}

	try{
		var res = await utils.apiRequest("POST", "/v1/item/favorite", {
			apiKey: self.state.userAPIKey,
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
			err: language.get(self.state.lang, "apiRequestError")
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

export async function favoriteItem(self, item, value, showLoader = true){
	if(item.uuid == "default" || item.uuid == null){
		return false
	}

	let req = await favoriteItemRequest(self, item, value, showLoader)

	if(req.err){
		spawnToast(req.err)

		return false
	}

	if(utils.currentParentFolder() == "favorites"){
		if(value == 0){
			clearTimeout(window.customVariables.reloadAfterActionTimeout)

			window.customVariables.reloadAfterActionTimeout = setTimeout(() => {
				updateItemList(self)
			}, 500)
		}
	}

	let items = self.state.itemList

	for(let i = 0; i < items.length; i++){
		if(items[i].uuid == item.uuid){
			items[i].favorited = value
		}
	}

	window.customVariables.itemList = items

	self.setState({
		itemList: items
	}, () => {
		self.forceUpdate()
	})

	return true
}

export async function spawnItemActionSheet(self, item){
	window.$("#main-searchbar").find("input").blur()

	let isDeviceOnline = window.customFunctions.isDeviceOnline()

	let ext = item.name.split(".")
	ext = ext[ext.length - 1]

	let previewType = utils.getFilePreviewType(ext)

	let canSaveToGallery = false

	if(isPlatform("ios")){
		if(["jpg", "jpeg", "heif", "heic", "png", "gif", "mp4", "mov", "hevc"].includes(ext) && item.size <= (1024 * 1024 * 32)){
			canSaveToGallery = true
		}
	}
	else{
		if(["jpg", "jpeg", "png", "gif", "mp4", "mov"].includes(ext) && item.size <= (1024 * 1024 * 32)){
			canSaveToGallery = true
		}
	}

	if(Capacitor.isNative){
		Keyboard.hide()
	}

	let buttons = []
	let options = {}

	options['removeFromShared'] = {
		text: language.get(self.state.lang, "removeFromShared"),
		icon: Ionicons.stopCircleOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			removeSharedInItem(self, item, false)
		}
	}

	options['cancel'] = {
		text: language.get(self.state.lang, "cancel"),
		icon: Ionicons.closeOutline,
		handler: async () => {
			return actionSheet.dismiss()
		}
	}

	options['stopSharing'] = {
		text: language.get(self.state.lang, "stopSharing"),
		icon: Ionicons.stopCircleOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			stopSharingItem(self, item, false)
		}
	}

	options['restore'] = {
		text: language.get(self.state.lang, "restoreItem"),
		icon: Ionicons.bagAddOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			return restoreItem(self, item, false)
		}
	}

	options['publicLink'] = {
		text: language.get(self.state.lang, "itemPublicLink"),
		icon: Ionicons.linkOutline,
		handler: async () => {
			await window.customFunctions.dismissModal()
			await window.customFunctions.dismissActionSheet()

			return openPublicLinkModal(self, item)
		}
	}

	options['share'] = {
		text: language.get(self.state.lang, "shareItem"),
		icon: Ionicons.shareSocialOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			return shareItem(self, item)
		}
	}

	options['move'] = {
		text: language.get(self.state.lang, "moveItem"),
		icon: Ionicons.moveOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			return moveItem(self, item)
		}
	}

	options['rename'] = {
		text: language.get(self.state.lang, "renameItem"),
		icon: Ionicons.textOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			return renameItem(self, item)
		}
	}

	options['color'] = {
		text: language.get(self.state.lang, "colorItem"),
		icon: Ionicons.colorFillOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			return colorItem(self, item)
		}
	}

	options['trash'] = {
		text: language.get(self.state.lang, "trashItem"),
		icon: Ionicons.trashOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			return trashItem(self, item, false)
		}
	}

	options['versions'] = {
		text: language.get(self.state.lang, "itemVersions"),
		icon: Ionicons.timeOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			return window.customFunctions.openVersionHistoryModal(item)
		}
	}

	options['download'] = {
		text: language.get(self.state.lang, "downloadItem"),
		icon: Ionicons.downloadOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			if(isPlatform("ios")){
				return queueFileDownload(self, item)
			}

			queueFileDownload(self, item, true, undefined, false, async (err, downloadedPath) => {
				if(err){
					return console.log(err)
				}

				window.resolveLocalFileSystemURL(downloadedPath, (resolved) => {
					Mediastore.saveToDownloads({
						path: downloadedPath,
						filename: item.name
					}).then(() => {
						spawnToast(language.get(self.state.lang, "fileDownloadDone", true, ["__NAME__"], [item.name]))
					
						resolved.remove(() => {
							console.log(item.name + " downloaded")
						}, (err) => {
							return console.log(err)
						})
					}).catch((err) => {
						console.log(err)

						return spawnToast(language.get(self.state.lang, "fileDownloadError", true, ["__NAME__"], [item.name]))
					})
				}, (err) => {
					spawnToast(language.get(self.state.lang, "fileDownloadError", true, ["__NAME__"], [item.name]))
								
					return console.log(err)
				})
			})
		}
	}

	options['saveToGallery'] = {
		text: language.get(self.state.lang, "saveToGallery"),
		icon: Ionicons.imageOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			queueFileDownload(self, item, true, undefined, false, async (err, downloadedPath, doDelete) => {
				if(err){
					return console.log(err)
				}

				let loading = await loadingController.create({
					message: "",
					showBackdrop: false
				})
		
				loading.present()

				let albumId = ""
				let albumName = "Filen"

				try{
					var albums  = await Media.getAlbums()

					albumId = albums.albums.find((a) => a.name === albumName)?.identifier || null
			
					if(!albumId){
					  	await Media.createAlbum({
							name: albumName
						})
						
					  	albums = await Media.getAlbums()

					  	albumId = albums.albums.find((a) => a.name === albumName)?.identifier || ""
					}
				}
				catch(e){
					console.log(e)

					loading.dismiss()

					return spawnToast(language.get(self.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
				}

				let savePayload = {
					path: downloadedPath,
					album: {
						id: albumId,
						name: albumName
					}
				}

				window.resolveLocalFileSystemURL(downloadedPath, (resolved) => {
					if(previewType == "video"){
						Media.saveVideo(savePayload).then(() => {
							spawnToast(language.get(self.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

							if(doDelete){
								resolved.remove(() => {
									loading.dismiss()
								}, (err) => {
									loading.dismiss()

									return console.log(err)
								})
							}
						}).catch((err) => {
							spawnToast(language.get(self.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))

							loading.dismiss()

							return console.log(err)
						})
					}
					else{
						if(ext == "gif"){
							Media.saveGif(savePayload).then(() => {
								spawnToast(language.get(self.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

								if(doDelete){
									resolved.remove(() => {
										loading.dismiss()
									}, (err) => {
										loading.dismiss()

										return console.log(err)
									})
								}
							}).catch((err) => {
								spawnToast(language.get(self.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
								
								return console.log(err)
							})
						}
						else{
							Media.savePhoto(savePayload).then(() => {
								spawnToast(language.get(self.state.lang, "fileSavedToGallery", true, ["__NAME__"], [item.name]))

								if(doDelete){
									resolved.remove(() => {
										loading.dismiss()
									}, (err) => {
										loading.dismiss()

										return console.log(err)
									})
								}
							}).catch((err) => {
								spawnToast(language.get(self.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))

								loading.dismiss()

								return console.log(err)
							})
						}
					}
				}, (err) => {
					spawnToast(language.get(self.state.lang, "fileSavedToGalleryError", true, ["__NAME__"], [item.name]))
							
					loading.dismiss()

					return console.log(err)
				})
			})
		}
	}

	options['offline'] = {
		text: item.offline ? language.get(self.state.lang, "removeItemFromOffline") : language.get(self.state.lang, "makeItemAvailableOffline"),
		icon: Ionicons.saveOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			if(item.offline){
				return makeItemAvailableOffline(self, false, item, false)
			}
			else{
				return makeItemAvailableOffline(self, true, item, false)
			}
		}
	}

	options['favorite'] = {
		text: item.favorited == 1 ? language.get(self.state.lang, "unfavorite") : language.get(self.state.lang, "favorite"),
		icon: Ionicons.starOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()

			if(typeof item.favorited == "undefined"){
				return false
			}

			if(item.favorited == 1){
				return favoriteItem(self, item, 0)
			}
			else{
				return favoriteItem(self, item, 1)
			}
		}
	}

	options['deletePermanently'] ={
		text: language.get(self.state.lang, "deletePermanently"),
		icon: Ionicons.trashBinOutline,
		handler: async () => {
			window.customFunctions.dismissActionSheet()
			
			let alert = await alertController.create({
				header: language.get(self.state.lang, "deletePermanently"),
				message: language.get(self.state.lang, "deletePermanentlyConfirmation", true, ["__NAME__"], [item.name]),
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
				
								return spawnToast(language.get(self.state.lang, "apiRequestError"))
							}
				
							loading.dismiss()
						
							if(!res.status){
								console.log(res.message)
				
								return spawnToast(res.message)
							}

							let itemList = []

							for(let i = 0; i < self.state.itemList.length; i++){
								if(self.state.itemList[i].uuid !== item.uuid){
									itemList.push(self.state.itemList[i])
								}
							}

							self.setState({
								itemList: itemList
							}, () => {
								self.forceUpdate()
							})
				
							return spawnToast(language.get(self.state.lang, "itemDeletedPermanently", true, ["__NAME__"], [item.name]))
						}
					}
				]
			})
		
			return alert.present()
		}
	}

	options['edit'] = {
		text: language.get(self.state.lang, "edit"),
		icon: Ionicons.createOutline,
		handler: async () => {
			await window.customFunctions.dismissActionSheet()

			let loading = await loadingController.create({
				message: "", //language.get(self.state.lang, "loadingPreview")
				backdropDismiss: true,
				showBackdrop: false
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
	
			downloadPreview(item, (chunksDone) => {
				//console.log(chunksDone)
			}, (err, dataArray) => {
				window.customVariables.isGettingPreviewData = false
	
				loading.dismiss()
	
				if(err){
					if(err !== "stopped"){
						console.log(err)
	
						return spawnToast(language.get(self.state.lang, "fileNoPreviewAvailable", true, ["__NAME__"], [item.name]))
					}
					else{
						return false
					}
				}
	
				return window.customFunctions.openTextEditor(item, new TextDecoder().decode(dataArray))
			}, Infinity)
		}
	}

	options['deviceOffline'] = {
		text: language.get(self.state.lang, "deviceOfflineAS"),
		icon: Ionicons.cloudOfflineOutline,
		handler: async () => {
			return window.customFunctions.dismissActionSheet()
		}
	}

	if(item.type == "folder"){
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				...[(isDeviceOnline ? options['removeFromShared'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			if(item.isSync){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(isDeviceOnline ? options['stopSharing'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(isDeviceOnline ? options['stopSharing'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else{
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['trash'] : [])],
					...[(isDeviceOnline ? options['stopSharing'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				...[(isDeviceOnline ? options['restore'] : [])],
				...[(isDeviceOnline ? options['deletePermanently'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("links") !== -1){
			if(item.isSync){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else{
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					//options['move'],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(isDeviceOnline ? options['trash'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
		}
		else if(utils.currentParentFolder() == "base"){
			if(item.isSync){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else if(item.isDefault){
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
			else{
				buttons = [
					...[(isDeviceOnline ? options['share'] : [])],
					...[(isDeviceOnline ? options['publicLink'] : [])],
					...[(isDeviceOnline ? options['move'] : [])],
					...[(isDeviceOnline ? options['rename'] : [])],
					...[(isDeviceOnline ? options['color'] : [])],
					...[(isDeviceOnline ? options['favorite'] : [])],
					...[(isDeviceOnline ? options['trash'] : [])],
					...[(!isDeviceOnline ? options['deviceOffline'] : [])],
					options['cancel']
				]
			}
		}
		else{
			buttons = [
				...[(isDeviceOnline ? options['share'] : [])],
				...[(isDeviceOnline ? options['publicLink'] : [])],
				...[(isDeviceOnline ? options['move'] : [])],
				...[(isDeviceOnline ? options['rename'] : [])],
				...[(isDeviceOnline ? options['color'] : [])],
				...[(isDeviceOnline ? options['favorite'] : [])],
				...[(isDeviceOnline ? options['trash'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
	}
	/*
	conditional
	...(!isPlatform("ioss") ? [{
		text: language.get(self.state.lang, "downloadItem"),
		icon: Ionicons.download,
		handler: () => {
			window.customFunctions.dismissModal()

			return queueFileDownload(self, item)
		}
	}] : [])
	*/
	else{
		if(window.location.href.indexOf("shared-in") !== -1){
			buttons = [
				...[(canSaveToGallery ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['offline'] : [])],
				...[(isDeviceOnline ? options['removeFromShared'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("shared-out") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) && isDeviceOnline ? options['edit'] : [])],
				...[(isDeviceOnline ? options['share'] : [])],
				...[(isDeviceOnline ? options['publicLink'] : [])],
				...[(canSaveToGallery && isDeviceOnline ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['offline'] : [])],
				...[(isDeviceOnline ? options['versions'] : [])],
				//options['favorite'],
				//options['move'],
				...[(isDeviceOnline ? options['rename'] : [])],
				...[(isDeviceOnline ? options['trash'] : [])],
				...[(isDeviceOnline ? options['stopSharing'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("trash") !== -1){
			buttons = [
				...[(canSaveToGallery && isDeviceOnline ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['restore'] : [])],
				...[(isDeviceOnline ? options['deletePermanently'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("links") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) && isDeviceOnline ? options['edit'] : [])],
				...[(isDeviceOnline ? options['share'] : [])],
				...[(isDeviceOnline ? options['publicLink'] : [])],
				...[(canSaveToGallery && isDeviceOnline ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['offline'] : [])],
				...[(isDeviceOnline ? options['versions'] : [])],
				...[(isDeviceOnline ? options['favorite'] : [])],
				//options['move'],
				...[(isDeviceOnline ? options['rename'] : [])],
				...[(isDeviceOnline ? options['trash'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else if(window.location.href.indexOf("recent") !== -1){
			buttons = [
				...[(["code", "text"].includes(previewType) && isDeviceOnline ? options['edit'] : [])],
				...[(isDeviceOnline ? options['share'] : [])],
				...[(isDeviceOnline ? options['publicLink'] : [])],
				...[(canSaveToGallery && isDeviceOnline ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['offline'] : [])],
				...[(isDeviceOnline ? options['versions'] : [])],
				...[(isDeviceOnline ? options['favorite'] : [])],
				...[(isDeviceOnline ? options['rename'] : [])],
				...[(isDeviceOnline ? options['trash'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
				options['cancel']
			]
		}
		else{
			buttons = [
				...[(["code", "text"].includes(previewType) && isDeviceOnline ? options['edit'] : [])],
				...[(isDeviceOnline ? options['share'] : [])],
				...[(isDeviceOnline ? options['publicLink'] : [])],
				...[(canSaveToGallery && isDeviceOnline ? options['saveToGallery'] : [])],
				...[(isDeviceOnline ? options['download'] : [])],
				...[(isDeviceOnline ? options['offline'] : [])],
				...[(isDeviceOnline ? options['versions'] : [])],
				...[(isDeviceOnline ? options['favorite'] : [])],
				...[(isDeviceOnline ? options['move'] : [])],
				...[(isDeviceOnline ? options['rename'] : [])],
				...[(isDeviceOnline ? options['trash'] : [])],
				...[(!isDeviceOnline ? options['deviceOffline'] : [])],
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
        buttons: presentButtons,
		showBackdrop: false
    })

	await actionSheet.present()
	
	if(Capacitor.isNative){
		setTimeout(() => {
			Keyboard.hide()
		}, 500)
	}

	return true
}