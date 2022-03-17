import create from "zustand"
import { Dimensions } from "react-native"
import { subscribeWithSelector } from "zustand/middleware"

const window = Dimensions.get("window")
const screen = Dimensions.get("screen")

export const useStore = create(subscribeWithSelector(set => ({
	currentRoutes: undefined,
	setCurrentRoutes: (currentRoutes) => set({ currentRoutes }),
	currentActionSheetItem: undefined,
	setCurrentActionSheetItem: (currentActionSheetItem) => set({ currentActionSheetItem }),
	dimensions: { window, screen },
	setDimensions: (dimensions) => set({ dimensions }),
	navigation: undefined,
	setNavigation: (navigation) => set({ navigation }),
	route: undefined,
	setRoute: (route) => set({ route }),
	currentItems: [],
	setCurrentItems: (currentItems) => set({ currentItems }),
	itemsSelectedCount: 0,
	setItemsSelectedCount: (itemsSelectedCount) => set({ itemsSelectedCount }),
	fullscreenLoadingModalVisible: false,
	setFullscreenLoadingModalVisible: (fullscreenLoadingModalVisible) => set({ fullscreenLoadingModalVisible }),
	uploads: {},
	setUploads: (uploads) => set({ uploads }),
	downloads: {},
	setDownloads: (downloads) => set({ downloads }),
	uploadProgress: {},
	setUploadProgress: (uploadProgress) => set({ uploadProgress }),
	downloadProgress: {},
	setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
	renameDialogVisible: false,
	setRenameDialogVisible: (renameDialogVisible) => set({ renameDialogVisible }),
	createFolderDialogVisible: false,
	setCreateFolderDialogVisible: (createFolderDialogVisible) => set({ createFolderDialogVisible }),
	toastBottomOffset: 50,
	setToastBottomOffset: (toastBottomOffset) => set({ toastBottomOffset }),
	toastTopOffset: 50,
	setToastTopOffset: (toastTopOffset) => set({ toastTopOffset }),
	insets: undefined,
	setInsets: (insets) => set({ insets }),
	reRenderActionSheet: 0,
	setReRenderActionSheet: (reRenderActionSheet) => set({ reRenderActionSheet }),
	confirmPermanentDeleteDialogVisible: false,
	setConfirmPermanentDeleteDialogVisible: (confirmPermanentDeleteDialogVisible) => set({ confirmPermanentDeleteDialogVisible }),
	removeFromSharedInDialogVisible: false,
	setRemoveFromSharedInDialogVisible: (removeFromSharedInDialogVisible) => set({ removeFromSharedInDialogVisible }),
	stopSharingDialogVisible: false,
	setStopSharingDialogVisible: (stopSharingDialogVisible) => set({ stopSharingDialogVisible }),
	reRenderFileVersionsActionSheet: 0,
	setReRenderFileVersionsActionSheet: (reRenderFileVersionsActionSheet) => set({ reRenderFileVersionsActionSheet }),
	reRenderShareActionSheet: 0,
	setReRenderShareActionSheet: (reRenderShareActionSheet) => set({ reRenderShareActionSheet }),
	reRenderPublicLinkActionSheet: 0,
	setReRenderPublicLinkActionSheet: (reRenderPublicLinkActionSheet) => set({ reRenderPublicLinkActionSheet }),
	netInfo: {isConnected: true, type: "wifi", isInternetReachable: true},
	setNetInfo: (netInfo) => set({ netInfo }),
	showNavigationAnimation: true,
	setShowNavigationAnimation: (showNavigationAnimation) => set({ showNavigationAnimation }),
	isDeviceReady: false,
	setIsDeviceReady: (isDeviceReady) => set({ isDeviceReady }),
	cameraUploadTotal: 0,
	setCameraUploadTotal: (cameraUploadTotal) => set({ cameraUploadTotal }),
	cameraUploadUploaded: 0,
	setCameraUploadUploaded: (cameraUploadUploaded) => set({ cameraUploadUploaded }),
	biometricAuthScreenState: "auth",
	setBiometricAuthScreenState: (biometricAuthScreenState) => set({ biometricAuthScreenState }),
	currentShareItems: undefined,
	setCurrentShareItems: (currentShareItems) => set({ currentShareItems }),
	textEditorState: "new",
	setTextEditorState: (textEditorState) => set({ textEditorState }),
	textEditorText: "",
	setTextEditorText: (textEditorText) => set({ textEditorText }),
	createTextFileDialogVisible: false,
	setCreateTextFileDialogVisible: (createTextFileDialogVisible) => set({ createTextFileDialogVisible }),
	createTextFileDialogName: "",
	setCreateTextFileDialogName: (createTextFileDialogName) => set({ createTextFileDialogName }),
	textEditorParent: "",
	setTextEditorParent: (textEditorParent) => set({ textEditorParent }),
	appState: "active",
	setAppState: (appState) => set({ appState }),
	isAuthing: false,
	setIsAuthing: (isAuthing) => set({ isAuthing }),
	redeemCodeDialogVisible: false,
	setRedeemCodeDialogVisible: (redeemCodeDialogVisible) => set({ redeemCodeDialogVisible }),
	deleteAccountTwoFactorDialogVisible: false,
	setDeleteAccountTwoFactorDialogVisible: (deleteAccountTwoFactorDialogVisible) => set({ deleteAccountTwoFactorDialogVisible }),
	disable2FATwoFactorDialogVisible: false,
	setDisable2FATwoFactorDialogVisible: (disable2FATwoFactorDialogVisible) => set({ disable2FATwoFactorDialogVisible }),
	topBarHeight: 115.27,
	setTopBarHeight: (topBarHeight) => set({ topBarHeight }),
	bottomBarHeight: 80,
	setBottomBarHeight: (bottomBarHeight) => set({ bottomBarHeight }),
	contentHeight: 850,
	setContentHeight: (contentHeight) => set({ contentHeight }),
	itemListLastScrollIndex: 0,
	setItemListLastScrollIndex: (itemListLastScrollIndex) => set({ itemListLastScrollIndex }),
	currentBulkItems: 0,
	setCurrentBulkItems: (currentBulkItems) => set({ currentBulkItems }),
	bulkShareDialogVisible: false,
	setBulkShareDialogVisible: (bulkShareDialogVisible) => set({ bulkShareDialogVisible }),
})))

export const navigationAnimation = ({ enable = true }) => {
	return new Promise((resolve, reject) => {
		let unsub = undefined
		let resolved = false

		const callback = () => {
			if(typeof unsub == "function"){
				unsub()
			}

			if(resolved){
				return false
			}

			resolved = true

			return resolve()
		}

		if(useStore.getState().showNavigationAnimation == enable){
			return callback()
		}

		unsub = useStore.subscribe(state => state.showNavigationAnimation, () => {
			return callback()
		})

		useStore.setState({ showNavigationAnimation: enable })
	})
}

export const waitForStateUpdate = (key, value) => {
	return new Promise((resolve, reject) => {
		let unsub = undefined
		let resolved = false

		const callback = () => {
			if(typeof unsub == "function"){
				unsub()
			}

			if(resolved){
				return false
			}

			resolved = true

			return resolve()
		}

		if(useStore.getState()[key] == value){
			return callback()
		}

		unsub = useStore.subscribe(state => state[key], () => {
			return callback()
		})

		useStore.setState({ [key]: value })
	})
}