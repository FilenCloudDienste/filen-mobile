import React from "react"
import * as language from "./utils/language"
import { doSetup, setupListeners } from "./components/setup"
import { windowRouter, setupWindowFunctions } from "./components/window"
import { render as renderFn } from "./components/render"

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

export default class App extends React.Component<{}, AppStates> {
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
                onlyWifiUploads: false,
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

    render(){
		return renderFn(this)
	}

	componentDidMount(){
		setupWindowFunctions(this)
		setupListeners(this)
		windowRouter(this)
		doSetup(this)
	}
}