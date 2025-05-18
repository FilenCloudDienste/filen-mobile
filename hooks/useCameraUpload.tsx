import mmkvInstance from "@/lib/mmkv"
import { useMMKVObject } from "react-native-mmkv"
import { useMemo, useCallback } from "react"
import { type Album } from "expo-media-library"

export const CAMERA_UPLOAD_MMKV_KEY: string = "cameraUploadState"

export type CameraUpload = {
	enabled: boolean
	remote: DriveCloudItem | null
	albums: Album[]
	background: boolean
	cellular: boolean
	lowBattery: boolean
	videos: boolean
	compress: boolean
}

export const EMPTY_STATE: CameraUpload = {
	enabled: false,
	remote: null,
	albums: [],
	background: false,
	cellular: false,
	lowBattery: false,
	videos: false,
	compress: false
}

export function getCameraUploadState(): CameraUpload {
	const cameraUpload = mmkvInstance.getString(CAMERA_UPLOAD_MMKV_KEY)

	if (!cameraUpload) {
		return EMPTY_STATE
	}

	return JSON.parse(cameraUpload) as CameraUpload
}

export function setCameraUploadState(fn: CameraUpload | ((prev: CameraUpload) => CameraUpload)) {
	if (typeof fn === "function") {
		mmkvInstance.set(CAMERA_UPLOAD_MMKV_KEY, JSON.stringify(fn(getCameraUploadState())))

		return
	}

	mmkvInstance.set(CAMERA_UPLOAD_MMKV_KEY, JSON.stringify(fn))
}

export default function useCameraUpload(): [CameraUpload, (value: CameraUpload | ((prevValue: CameraUpload) => CameraUpload)) => void] {
	const [cameraUpload] = useMMKVObject<CameraUpload>(CAMERA_UPLOAD_MMKV_KEY, mmkvInstance)

	const state = useMemo((): CameraUpload => {
		if (!cameraUpload) {
			return EMPTY_STATE
		}

		return cameraUpload
	}, [cameraUpload])

	const setState = useCallback((fn: CameraUpload | ((prev: CameraUpload) => CameraUpload)) => {
		setCameraUploadState(fn)
	}, [])

	return [state, setState]
}
