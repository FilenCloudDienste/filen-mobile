import React from "react"
import storage from "../../lib/storage"
import { useStore } from "../../lib/state"
import { getRandomArbitrary } from "../../lib/helpers"
import { getColor } from "../../style"
import NormalToast from "./NormalToast"
import MoveToast from "./MoveToast"
import UploadToast from "./UploadToast"
import CameraUploadChooseFolderToast from "./CameraUploadChooseFolderToast"
import MoveBulkToast from "./MoveBulkToast"
import { Item } from "src/types"

const toastQueueLimit: number = 3
let currentToastQueue: number = 0

export type ToastType = "normal" | "move" | "moveBulk" | "upload" | "cameraUploadChooseFolder"

export interface ShowToast {
	type?: ToastType
	message?: string
	swipeEnabled?: boolean
	duration?: number
	animationType?: "slide-in" | "zoom-in"
	animationDuration?: number
	bottomOffset?: number
	offset?: number
	offsetBottom?: number
	offsetTop?: number
	placement?: "bottom" | "top"
	navigation?: any
	items?: Item[]
}

export const showToast = ({
	type = "normal",
	message,
	swipeEnabled = false,
	duration = 5000,
	animationType = "slide-in",
	animationDuration = 100,
	bottomOffset = 0,
	offset = 50,
	offsetBottom = 50,
	offsetTop = 50,
	placement = "bottom",
	navigation = undefined,
	items = []
}: ShowToast) => {
	if (typeof global.toast == "undefined" || global.toast == null || typeof global.toast.hideAll !== "function") {
		return
	}

	if (currentToastQueue >= toastQueueLimit) {
		return setTimeout(() => {
			showToast({
				type,
				message,
				swipeEnabled,
				duration,
				animationType,
				animationDuration,
				bottomOffset,
				offset,
				offsetBottom,
				offsetTop,
				placement,
				navigation
			})
		}, 100)
	}

	currentToastQueue += 1

	setTimeout(() => {
		currentToastQueue -= 1
	}, duration + getRandomArbitrary(500, 1000))

	const darkMode = storage.getBoolean("darkMode")
	const insets = useStore.getState().insets as any

	if (typeof insets !== "undefined") {
		offsetBottom = insets.bottom + 55
		offsetTop = insets.top + 80
	}

	useStore.setState({
		toastBottomOffset: offsetBottom,
		toastTopOffset: offsetTop
	})

	let toastId: string = ""

	if (type == "normal") {
		toastId = global.toast.show(<NormalToast message={message} />, {
			type: "custom",
			style: {
				backgroundColor: getColor(darkMode, "backgroundTertiary"),
				borderRadius: 10
			},
			swipeEnabled,
			duration,
			animationType,
			animationDuration,
			placement
		})
	} else if (type == "move") {
		hideAllToasts()

		toastId = global.toast.show(<MoveToast message={message} />, {
			type: "custom",
			style: {
				backgroundColor: getColor(darkMode, "backgroundTertiary"),
				borderRadius: 10
			},
			swipeEnabled,
			duration: 86400000,
			animationType,
			animationDuration,
			placement
		})
	} else if (type == "moveBulk" && Array.isArray(items)) {
		hideAllToasts()

		toastId = global.toast.show(
			<MoveBulkToast
				message={message}
				items={items}
			/>,
			{
				type: "custom",
				style: {
					backgroundColor: getColor(darkMode, "backgroundTertiary"),
					borderRadius: 10
				},
				swipeEnabled,
				duration: 86400000,
				animationType,
				animationDuration,
				placement
			}
		)
	} else if (type == "upload") {
		hideAllToasts()

		toastId = global.toast.show(<UploadToast />, {
			type: "custom",
			style: {
				backgroundColor: getColor(darkMode, "backgroundTertiary"),
				borderRadius: 10
			},
			swipeEnabled,
			duration: 86400000,
			animationType,
			animationDuration,
			placement
		})
	} else if (type == "cameraUploadChooseFolder") {
		hideAllToasts()

		toastId = global.toast.show(
			<CameraUploadChooseFolderToast
				message={message}
				navigation={navigation}
			/>,
			{
				type: "custom",
				style: {
					backgroundColor: getColor(darkMode, "backgroundTertiary"),
					borderRadius: 10
				},
				swipeEnabled,
				duration: 86400000,
				animationType,
				animationDuration,
				placement
			}
		)
	}

	return toastId
}

export const hideToast = ({ id }: { id: string }) => {
	if (typeof global.toast == "undefined" || global.toast == null || typeof global.toast.hideAll !== "function") {
		return
	}

	return global?.toast?.hide(id)
}

export const hideAllToasts = () => {
	if (typeof global.toast == "undefined" || global.toast == null || typeof global.toast.hideAll !== "function") {
		return
	}

	return global?.toast?.hideAll()
}
