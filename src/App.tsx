import React from "react"

import * as windowComponents from "./components/window"
import * as setupComponents from "./components/setup"
import * as routerComponents from "./components/router"
import * as loginComponents from "./components/login"
import * as itemsComponents from "./components/items"
import * as spawnComponents from "./components/spawn"
import * as searchComponents from "./components/search"
import * as renderComponents from "./components/render"
import * as registerComponents from "./components/register"
import * as userComponents from "./components/user"
import * as uploadComponents from "./components/upload"
import * as downloadComponents from "./components/download"
import * as settingsComponents from "./components/settings"
import * as socketCompontents from "./components/socket"

import * as language from "./utils/language"

const utils = require("./utils/utils")

declare global {
    interface Window {
		currentHref: string,
		selectedItems: Array<any>,
		customFunctions: any,
		customVariables: any
    }
}

interface AppStates {
	mainToolbarTitle: string,
	itemList: Array<any>,
	isLoggedIn: boolean,
	userAPIKey: string,
	userMasterKeys: Array<any>,
	userPublicKey: string,
	userPrivateKey: string,
	selectedItems: number,
	currentHref: string,
	darkMode: boolean,
	userEmail: string,
	userStorageUsagePercentage: number,
	searchbarOpen: boolean,
	windowHeight: number,
	windowWidth: number,
	mainSearchTerm: string,
	lang: string,
	showMainToolbarBackButton: boolean,
	transferBadeShowing: boolean,
	transferBadeCount: number,
	userStorageUsageMenuText: string,
	userCurrentStorageUsage: number,
	userMaxStorage: number,
	currentReceiverId: number,
	uploads: any,
	downloads: any,
	uploadsCount: number,
	downloadsCount: number,
	settings: any,
	scrollToIndex: number,
	socketConnected: boolean,
	userFiles: number,
	userFolders: number,
	twoFactorEnabled: boolean,
	userIsPro: boolean,
	showItemsSekeleton: boolean,
	currentFileVersion: number,
	currentAuthVersion: number,
	currentMetadataVersion: number,
	hideMainFab: boolean,
	showMainSkeletonPlaceholder: boolean,
	mainSearchbarDisabled: boolean,
	refresherEnabled: boolean,
	gridItemHeight: number,
	gridItemWidth: number,
	cachedUserInfo: any,
	authShowing: boolean,
	networkStatus: any,
	isDeviceOnline: boolean,
	itemListChangeCounter: number
}

export default class App extends React.PureComponent<{}, AppStates> {
    constructor(props){
    	super(props)

        this.state = {
        	mainToolbarTitle: language.get("en", "cloudDrives"),
        	itemList: [],
        	isLoggedIn: false,
        	userAPIKey: "",
        	userMasterKeys: [],
			userPublicKey: "",
			userPrivateKey: "",
			selectedItems: 0,
			currentHref: window.location.href,
			darkMode: false,
			userEmail: "",
			userStorageUsagePercentage: 0,
			searchbarOpen: false,
			windowHeight: window.innerHeight,
			windowWidth: window.innerWidth,
			mainSearchTerm: "",
			lang: "en",
			showMainToolbarBackButton: false,
			transferBadeShowing: false,
			transferBadeCount: 0,
			userStorageUsageMenuText: language.get("en", "userStorageUsageMenuText", false, ["__MAX__", "__PERCENTAGE__"], [utils.formatBytes(0), 0]),
			userCurrentStorageUsage: 0,
			userMaxStorage: 0,
			currentReceiverId: 0,
			uploads: {},
			downloads: {},
			uploadsCount: 0,
			downloadsCount: 0,
			settings: {
				onlyWifi: false,
				showThumbnails: true,
				gridModeEnabled: false,
				biometricPINCode: "",
				convertHeic: true,
				cameraUpload: {
					enabled: false,
					parent: "",
					parentName: "",
					photos: true,
					videos: true,
					hidden: true,
					burst: false,
					icloud: true,
					shared: false,
					convertHeic: true
				}
			},
			scrollToIndex: 0,
			socketConnected: false,
			userFiles: 0,
			userFolders: 0,
			twoFactorEnabled: false,
			userIsPro: false,
			showItemsSekeleton: false,
			currentFileVersion: 2,
			currentAuthVersion: 2,
			currentMetadataVersion: 2,
			hideMainFab: false,
			showMainSkeletonPlaceholder: false,
			mainSearchbarDisabled: false,
			refresherEnabled: false,
			gridItemHeight: (window.innerHeight / 5),
			gridItemWidth: (window.innerWidth / 2) - 25,
			cachedUserInfo: {},
			authShowing: false,
			networkStatus: {
				connected: true,
				connectionType: "wifi"
			},
			isDeviceOnline: true,
			itemListChangeCounter: 0
		}

		this.componentDidMount = this.componentDidMount.bind(this)
	}

	doRouting = windowComponents.doRouting.bind(this)
	windowRouter = windowComponents.windowRouter.bind(this)
	setupWindowFunctions = windowComponents.setupWindowFunctions.bind(this)

	initSocket = socketCompontents.initSocket.bind(this)
	sendSocket = socketCompontents.sendSocket.bind(this)

	setupListeners = setupComponents.setupListeners.bind(this)
	setupStatusbar = setupComponents.setupStatusbar.bind(this)
	doSetup = setupComponents.doSetup.bind(this)

	routeTo = routerComponents.routeTo.bind(this)
	routeToFolder = routerComponents.routeToFolder.bind(this)
	goToFolder = routerComponents.goToFolder.bind(this)
	goBack = routerComponents.goBack.bind(this)

	showLogin = loginComponents.showLogin.bind(this)
	showRegister = registerComponents.showRegister.bind(this)

	updateUserKeys = userComponents.updateUserKeys.bind(this)
	updateUserUsage = userComponents.updateUserUsage.bind(this)

    updateItemList = itemsComponents.updateItemList.bind(this)
	refreshMainList = itemsComponents.refreshMainList.bind(this)
	selectItem = itemsComponents.selectItem.bind(this)
	clearSelectedItems = itemsComponents.clearSelectedItems.bind(this)
	selectItemsAction = itemsComponents.selectItemsAction.bind(this)
	previewItem = itemsComponents.previewItem.bind(this)
	spawnItemActionSheet = itemsComponents.spawnItemActionSheet.bind(this)
	moveItem = itemsComponents.moveItem.bind(this)
	renameItem = itemsComponents.renameItem.bind(this)
	trashItem = itemsComponents.trashItem.bind(this)
	shareItem = itemsComponents.shareItem.bind(this)
	makeItemAvailableOffline = itemsComponents.makeItemAvailableOffline.bind(this)
	moveFolder = itemsComponents.moveFolder.bind(this)
	moveFile = itemsComponents.moveFile.bind(this)
	dirExists = itemsComponents.dirExists.bind(this)
	moveSelectedItems = itemsComponents.moveSelectedItems.bind(this)
	trashSelectedItems = itemsComponents.trashSelectedItems.bind(this)
	openPublicLinkModal = itemsComponents.openPublicLinkModal.bind(this)
	restoreItem = itemsComponents.restoreItem.bind(this)
	restoreSelectedItems = itemsComponents.restoreSelectedItems.bind(this)
	getSelectedItems = itemsComponents.getSelectedItems.bind(this)
	shareItemWithEmail = itemsComponents.shareItemWithEmail.bind(this)
	removeSharedInItem = itemsComponents.removeSharedInItem.bind(this)
	stopSharingItem = itemsComponents.stopSharingItem.bind(this)
	removeSelectedItemsFromSharedIn = itemsComponents.removeSelectedItemsFromSharedIn.bind(this)
	stopSharingSelectedItems = itemsComponents.stopSharingSelectedItems.bind(this)
	downloadSelectedItems = itemsComponents.downloadSelectedItems.bind(this)
	shareSelectedItems = itemsComponents.shareSelectedItems.bind(this)
	storeSelectedItemsOffline = itemsComponents.storeSelectedItemsOffline.bind(this)
	getFileThumbnail = downloadComponents.getFileThumbnail.bind(this)
	colorItem = itemsComponents.colorItem.bind(this)
	favoriteItem = itemsComponents.favoriteItem.bind(this)
	favoriteItemRequest = itemsComponents.favoriteItemRequest.bind(this)

    spawnToast = spawnComponents.spawnToast.bind(this)
    spawnMoveToast = spawnComponents.spawnMoveToast.bind(this)
	mainFabAction = spawnComponents.mainFabAction.bind(this)
	mainMenuPopover = spawnComponents.mainMenuPopover.bind(this)
	spawnRenamePrompt = spawnComponents.spawnRenamePrompt.bind(this)

	setMainSearchTerm = searchComponents.setMainSearchTerm.bind(this)
	hideMainSearchbar = searchComponents.hideMainSearchbar.bind(this)

	queueFileUpload = uploadComponents.queueFileUpload.bind(this)
	fileExists = uploadComponents.fileExists.bind(this)
	markUploadAsDone = uploadComponents.markUploadAsDone.bind(this)
	uploadChunk = uploadComponents.uploadChunk.bind(this)

	queueFileDownload = downloadComponents.queueFileDownload.bind(this)
	getDownloadDir = downloadComponents.getDownloadDir.bind(this)
	downloadFileChunk = downloadComponents.downloadFileChunk.bind(this)
	writeChunkToFile = downloadComponents.writeChunkToFile.bind(this)
	downloadPreview = downloadComponents.downloadPreview.bind(this)
	getThumbnail = downloadComponents.getThumbnail.bind(this)
	getThumbnailDir = downloadComponents.getThumbnailDir.bind(this)
	getTempDir = downloadComponents.getTempDir.bind(this)
	genThumbnail = downloadComponents.genThumbnail.bind(this)

	openSettingsModal = settingsComponents.openSettingsModal.bind(this)

	rowRenderer = renderComponents.rowRenderer.bind(this)
    render = renderComponents.render.bind(this)

	componentDidMount(){
		this.setupWindowFunctions()
		
		this.setupListeners()
		this.windowRouter()

		this.doSetup()
	}
}