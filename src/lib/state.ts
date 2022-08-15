import create from "zustand"
import { Dimensions } from "react-native"
import { subscribeWithSelector } from "zustand/middleware"
import { ScaledSize } from "react-native"
import { ItemTemplate, Item } from "./services/items"

const window: ScaledSize = Dimensions.get("window")
const screen: ScaledSize = Dimensions.get("screen")

export interface State {
	currentRoutes: any,
	setCurrentRoutes: (currentRoutes: any) => void,
	currentActionSheetItem: Item | undefined,
	setCurrentActionSheetItem: (currentActionSheetItem: Item) => void,
	dimensions: { window: ScaledSize, screen: ScaledSize },
	setDimensions: (dimensions: { window: ScaledSize, screen: ScaledSize }) => void,
	navigation: any,
	setNavigation: (navigation: any) => void,
	route: any,
	setRoute: (route: any) => void,
	currentItems: Item[],
	setCurrentItems: (currentItems: Item[]) => void,
	itemsSelectedCount: number,
	setItemsSelectedCount: (itemsSelectedCount: number) => void,
	fullscreenLoadingModalVisible: boolean,
	setFullscreenLoadingModalVisible: (fullscreenLoadingModalVisible: boolean) => void,
	fullscreenLoadingModalDismissable: boolean,
	setFullscreenLoadingModalDismissable: (fullscreenLoadingModalDismissable: boolean) => void,
	uploads: any,
	setUploads: (uploads: any) => void,
	downloads: any,
	setDownloads: (downloads: any) => void,
	currentUploads: any,
	setCurrentUploads: (currentUploads: any) => void,
	currentDownloads: any,
	setCurrentDownloads: (currentDownloads: any) => void,
	uploadProgress: any,
	setUploadProgress: (uploadProgress: any) => void,
	downloadProgress: any,
	setDownloadProgress: (downloadProgress: any) => void,
	renameDialogVisible: boolean,
	setRenameDialogVisible: (renameDialogVisible: boolean) => void,
	createFolderDialogVisible: boolean,
	setCreateFolderDialogVisible: (createFolderDialogVisible: boolean) => void,
	toastBottomOffset: number,
	setToastBottomOffset: (toastBottomOffset: number) => void,
	toastTopOffset: number,
	setToastTopOffset: (toastTopOffset: number) => void,
	insets: any,
	setInsets: (insets: any) => void,
	reRenderActionSheet: number | string,
	setReRenderActionSheet: (reRenderActionSheet: number | string) => void,
	confirmPermanentDeleteDialogVisible: boolean,
	setConfirmPermanentDeleteDialogVisible: (confirmPermanentDeleteDialogVisible: boolean) => void,
	removeFromSharedInDialogVisible: boolean,
	setRemoveFromSharedInDialogVisible: (removeFromSharedInDialogVisible: boolean) => void,
	stopSharingDialogVisible: boolean,
	setStopSharingDialogVisible: (stopSharingDialogVisible: boolean) => void,
	reRenderFileVersionsActionSheet: number | string,
	setReRenderFileVersionsActionSheet: (reRenderFileVersionsActionSheet: number | string) => void,
	reRenderShareActionSheet: number | string,
	setReRenderShareActionSheet: (reRenderShareActionSheet: number | string) => void,
	reRenderPublicLinkActionSheet: number | string,
	setReRenderPublicLinkActionSheet: (reRenderPublicLinkActionSheet: number | string) => void,
	netInfo: any,
	setNetInfo: (netInfo: any) => void,
	showNavigationAnimation: boolean,
	setShowNavigationAnimation: (showNavigationAnimation: boolean) => void,
	isDeviceReady: boolean,
	setIsDeviceReady: (isDeviceReady: boolean) => void,
	cameraUploadTotal: number,
	setCameraUploadTotal: (cameraUploadTotal: number) => void,
	cameraUploadUploaded: number,
	setCameraUploadUploaded: (cameraUploadUploaded: number) => void,
	biometricAuthScreenState: string,
	setBiometricAuthScreenState: (biometricAuthScreenState: string) => void,
	currentShareItems: any,
	setCurrentShareItems: (currentShareItems: any) => void,
	textEditorState: string,
	setTextEditorState: (textEditorState: string) => void,
	textEditorText: string,
	setTextEditorText: (textEditorText: string) => void,
	createTextFileDialogVisible: boolean,
	setCreateTextFileDialogVisible: (createTextFileDialogVisible: boolean) => void,
	createTextFileDialogName: string,
	setCreateTextFileDialogName: (createTextFileDialogName: string) => void,
	textEditorParent: string,
	setTextEditorParent: (textEditorParent: string) => void,
	appState: string,
	setAppState: (appState: string) => void,
	isAuthing: boolean,
	setIsAuthing: (isAuthing: boolean) => void,
	redeemCodeDialogVisible: boolean,
	setRedeemCodeDialogVisible: (redeemCodeDialogVisible: boolean) => void,
	deleteAccountTwoFactorDialogVisible: boolean,
	setDeleteAccountTwoFactorDialogVisible: (deleteAccountTwoFactorDialogVisible: boolean) => void,
	disable2FATwoFactorDialogVisible: boolean,
	setDisable2FATwoFactorDialogVisible: (disable2FATwoFactorDialogVisible: boolean) => void,
	topBarHeight: number,
	setTopBarHeight: (topBarHeight: number) => void,
	bottomBarHeight: number,
	setBottomBarHeight: (bottomBarHeight: number) => void,
	contentHeight: number,
	setContentHeight: (contentHeight: number) => void,
	itemListLastScrollIndex: number,
	setItemListLastScrollIndex: (itemListLastScrollIndex: number) => void,
	currentBulkItems: any[],
	setCurrentBulkItems: (currentBulkItems: any[]) => void,
	bulkShareDialogVisible: boolean,
	setBulkShareDialogVisible: (bulkShareDialogVisible: boolean) => void,
	itemsSortBy: string,
	setItemsSortBy: (itemsSortBy: string) => void,
	biometricAuthScreenVisible: boolean,
	setBiometricAuthScreenVisible: (biometricAuthScreenVisible: boolean) => void,
	currentToastQueue: number,
	setCurrentToastQueue: (currentToastQueue: number) => void,
	imagePreviewModalVisible: boolean,
	setImagePreviewModalVisible: (imagePreviewModalVisible: boolean) => void,
	imagePreviewModalItems: any[],
	setImagePreviewModalItems: (imagePreviewModalItems: any[]) => void,
	imagePreviewModalIndex: number,
	setImagePreviewModalIndex: (imagePreviewModalIndex: number) => void,
	finishedTransfers: any[],
	setFinishedTransfers: (finishedTransfers: any[]) => void
}

export const useStore = create<State>()(subscribeWithSelector(set => ({
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
	fullscreenLoadingModalDismissable: false,
	setFullscreenLoadingModalDismissable: (fullscreenLoadingModalDismissable) => set({ fullscreenLoadingModalDismissable }),
	uploads: {},
	setUploads: (uploads) => set({ uploads }),
	downloads: {},
	setDownloads: (downloads) => set({ downloads }),
	currentUploads: {},
	setCurrentUploads: (currentUploads) => set({ currentUploads }),
	currentDownloads: {},
	setCurrentDownloads: (currentDownloads) => set({ currentDownloads }),
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
	currentBulkItems: [],
	setCurrentBulkItems: (currentBulkItems) => set({ currentBulkItems }),
	bulkShareDialogVisible: false,
	setBulkShareDialogVisible: (bulkShareDialogVisible) => set({ bulkShareDialogVisible }),
	itemsSortBy: "nameAsc",
	setItemsSortBy: (itemsSortBy) => set({ itemsSortBy }),
	biometricAuthScreenVisible: false,
	setBiometricAuthScreenVisible: (biometricAuthScreenVisible) => set({ biometricAuthScreenVisible }),
	currentToastQueue: 0,
	setCurrentToastQueue: (currentToastQueue) => set({ currentToastQueue }),
	imagePreviewModalVisible: false,
	setImagePreviewModalVisible: (imagePreviewModalVisible) => set({ imagePreviewModalVisible }),
	imagePreviewModalItems: [],
	setImagePreviewModalItems: (imagePreviewModalItems) => set({ imagePreviewModalItems }),
	imagePreviewModalIndex: 0,
	setImagePreviewModalIndex: (imagePreviewModalIndex) => set({ imagePreviewModalIndex }),
	finishedTransfers: [],
	setFinishedTransfers: (finishedTransfers) => set({ finishedTransfers })
})))

export const navigationAnimation = ({ enable = true }): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let unsub: any = undefined
		let resolved: boolean = false

		const callback = () => {
			if(typeof unsub == "function"){
				unsub()
			}

			if(resolved){
				return false
			}

			resolved = true

			return resolve(true)
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

export const waitForStateUpdate = (key: string, value: any): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let unsub: any = undefined
		let resolved: boolean = false

		const callback = () => {
			if(typeof unsub == "function"){
				unsub()
			}

			if(resolved){
				return false
			}

			resolved = true

			return resolve(true)
		}

		if((useStore.getState() as any)[key] == value){
			return callback()
		}

		unsub = useStore.subscribe((state: any) => state[key], () => {
			return callback()
		})

		useStore.setState({ [key]: value })
	})
}