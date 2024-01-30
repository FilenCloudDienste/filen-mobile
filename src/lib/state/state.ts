import create from "zustand"
import { Dimensions } from "react-native"
import { subscribeWithSelector } from "zustand/middleware"
import { ScaledSize } from "react-native"
import { Item, ShareMenuItems } from "../../types"
import { TransferItem } from "../../screens/TransfersScreen"

const window: ScaledSize = Dimensions.get("window")
const screen: ScaledSize = Dimensions.get("screen")

export interface State {
	currentRoutes: any
	setCurrentRoutes: (currentRoutes: any) => void
	currentActionSheetItem: Item | undefined
	setCurrentActionSheetItem: (currentActionSheetItem: Item) => void
	dimensions: { window: ScaledSize; screen: ScaledSize }
	setDimensions: (dimensions: { window: ScaledSize; screen: ScaledSize }) => void
	navigation: any
	setNavigation: (navigation: any) => void
	route: any
	setRoute: (route: any) => void
	currentItems: Item[]
	setCurrentItems: (currentItems: Item[]) => void
	itemsSelectedCount: number
	setItemsSelectedCount: (itemsSelectedCount: number) => void
	fullscreenLoadingModalVisible: boolean
	setFullscreenLoadingModalVisible: (fullscreenLoadingModalVisible: boolean) => void
	fullscreenLoadingModalDismissable: boolean
	setFullscreenLoadingModalDismissable: (fullscreenLoadingModalDismissable: boolean) => void
	toastBottomOffset: number
	setToastBottomOffset: (toastBottomOffset: number) => void
	toastTopOffset: number
	setToastTopOffset: (toastTopOffset: number) => void
	insets: any
	setInsets: (insets: any) => void
	showNavigationAnimation: boolean
	setShowNavigationAnimation: (showNavigationAnimation: boolean) => void
	isDeviceReady: boolean
	setIsDeviceReady: (isDeviceReady: boolean) => void
	cameraUploadTotal: number
	setCameraUploadTotal: (cameraUploadTotal: number) => void
	cameraUploadUploaded: number
	setCameraUploadUploaded: (cameraUploadUploaded: number) => void
	biometricAuthScreenState: string
	setBiometricAuthScreenState: (biometricAuthScreenState: string) => void
	currentShareItems: ShareMenuItems
	setCurrentShareItems: (currentShareItems: ShareMenuItems) => void
	textEditorState: string
	setTextEditorState: (textEditorState: string) => void
	textEditorText: string
	setTextEditorText: (textEditorText: string) => void
	createTextFileDialogName: string
	setCreateTextFileDialogName: (createTextFileDialogName: string) => void
	textEditorParent: string
	setTextEditorParent: (textEditorParent: string) => void
	isAuthing: boolean
	setIsAuthing: (isAuthing: boolean) => void
	topBarHeight: number
	setTopBarHeight: (topBarHeight: number) => void
	bottomBarHeight: number
	setBottomBarHeight: (bottomBarHeight: number) => void
	contentHeight: number
	setContentHeight: (contentHeight: number) => void
	biometricAuthScreenVisible: boolean
	setBiometricAuthScreenVisible: (biometricAuthScreenVisible: boolean) => void
	imagePreviewModalItems: any[]
	setImagePreviewModalItems: (imagePreviewModalItems: any[]) => void
	imagePreviewModalIndex: number
	setImagePreviewModalIndex: (imagePreviewModalIndex: number) => void
	finishedTransfers: any[]
	setFinishedTransfers: (finishedTransfers: any[]) => void
	scrolledToBottom: boolean
	setScrolledToBottom: (scrolledToBottom: boolean) => void
	transfers: TransferItem[]
	setTransfers: (transfers: TransferItem[]) => void
	transfersProgress: number
	setTransfersProgress: (transfersProgress: number) => void
	transfersPaused: boolean
	setTransfersPaused: (transfersPaused: boolean) => void
}

export const useStore = create<State>()(
	subscribeWithSelector(set => ({
		currentRoutes: undefined,
		setCurrentRoutes: currentRoutes => set({ currentRoutes }),
		currentActionSheetItem: undefined,
		setCurrentActionSheetItem: currentActionSheetItem => set({ currentActionSheetItem }),
		dimensions: { window, screen },
		setDimensions: dimensions => set({ dimensions }),
		navigation: undefined,
		setNavigation: navigation => set({ navigation }),
		route: undefined,
		setRoute: route => set({ route }),
		currentItems: [],
		setCurrentItems: currentItems => set({ currentItems }),
		itemsSelectedCount: 0,
		setItemsSelectedCount: itemsSelectedCount => set({ itemsSelectedCount }),
		fullscreenLoadingModalVisible: false,
		setFullscreenLoadingModalVisible: fullscreenLoadingModalVisible => set({ fullscreenLoadingModalVisible }),
		fullscreenLoadingModalDismissable: false,
		setFullscreenLoadingModalDismissable: fullscreenLoadingModalDismissable => set({ fullscreenLoadingModalDismissable }),
		toastBottomOffset: 50,
		setToastBottomOffset: toastBottomOffset => set({ toastBottomOffset }),
		toastTopOffset: 50,
		setToastTopOffset: toastTopOffset => set({ toastTopOffset }),
		insets: undefined,
		setInsets: insets => set({ insets }),
		showNavigationAnimation: true,
		setShowNavigationAnimation: showNavigationAnimation => set({ showNavigationAnimation }),
		isDeviceReady: false,
		setIsDeviceReady: isDeviceReady => set({ isDeviceReady }),
		cameraUploadTotal: 0,
		setCameraUploadTotal: cameraUploadTotal => set({ cameraUploadTotal }),
		cameraUploadUploaded: 0,
		setCameraUploadUploaded: cameraUploadUploaded => set({ cameraUploadUploaded }),
		biometricAuthScreenState: "auth",
		setBiometricAuthScreenState: biometricAuthScreenState => set({ biometricAuthScreenState }),
		currentShareItems: null,
		setCurrentShareItems: currentShareItems => set({ currentShareItems }),
		textEditorState: "new",
		setTextEditorState: textEditorState => set({ textEditorState }),
		textEditorText: "",
		setTextEditorText: textEditorText => set({ textEditorText }),
		createTextFileDialogName: "",
		setCreateTextFileDialogName: createTextFileDialogName => set({ createTextFileDialogName }),
		textEditorParent: "",
		setTextEditorParent: textEditorParent => set({ textEditorParent }),
		isAuthing: false,
		setIsAuthing: isAuthing => set({ isAuthing }),
		topBarHeight: 115.27,
		setTopBarHeight: topBarHeight => set({ topBarHeight }),
		bottomBarHeight: 80,
		setBottomBarHeight: bottomBarHeight => set({ bottomBarHeight }),
		contentHeight: 850,
		setContentHeight: contentHeight => set({ contentHeight }),
		biometricAuthScreenVisible: false,
		setBiometricAuthScreenVisible: biometricAuthScreenVisible => set({ biometricAuthScreenVisible }),
		imagePreviewModalItems: [],
		setImagePreviewModalItems: imagePreviewModalItems => set({ imagePreviewModalItems }),
		imagePreviewModalIndex: 0,
		setImagePreviewModalIndex: imagePreviewModalIndex => set({ imagePreviewModalIndex }),
		finishedTransfers: [],
		setFinishedTransfers: finishedTransfers => set({ finishedTransfers }),
		scrolledToBottom: false,
		setScrolledToBottom: scrolledToBottom => set({ scrolledToBottom }),
		transfers: [],
		setTransfers: transfers => set({ transfers }),
		transfersProgress: 0,
		setTransfersProgress: transfersProgress => set({ transfersProgress }),
		transfersPaused: false,
		setTransfersPaused: transfersPaused => set({ transfersPaused })
	}))
)

export const navigationAnimation = ({ enable = true }): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let unsub: any = undefined
		let resolved: boolean = false

		const callback = () => {
			if (typeof unsub == "function") {
				unsub()
			}

			if (resolved) {
				return false
			}

			resolved = true

			return resolve(true)
		}

		if (useStore.getState().showNavigationAnimation == enable) {
			return callback()
		}

		unsub = useStore.subscribe(
			state => state.showNavigationAnimation,
			() => {
				return callback()
			}
		)

		useStore.setState({ showNavigationAnimation: enable })
	})
}

export const waitForStateUpdate = (key: string, value: any): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let unsub: any = undefined
		let resolved: boolean = false

		const callback = () => {
			if (typeof unsub == "function") {
				unsub()
			}

			if (resolved) {
				return false
			}

			resolved = true

			return resolve(true)
		}

		if ((useStore.getState() as any)[key] == value) {
			return callback()
		}

		unsub = useStore.subscribe(
			(state: any) => state[key],
			() => {
				return callback()
			}
		)

		useStore.setState({ [key]: value })
	})
}
