import { Platform, PermissionsAndroid } from "react-native"
import { check, PERMISSIONS, RESULTS, request, requestMultiple, checkMultiple } from "react-native-permissions"
import * as MediaLibrary from "expo-media-library"

export const hasWritePermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS == "ios") {
		return true
	}

	const has = PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)

	if (!has) {
		if (!requestPermissions) {
			return false
		}

		const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)

		if (get !== PermissionsAndroid.RESULTS.GRANTED) {
			return false
		}
	}

	return true
}

export const hasReadPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS == "ios") {
		return true
	}

	const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)

	if (!has) {
		if (!requestPermissions) {
			return false
		}

		const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)

		if (get !== PermissionsAndroid.RESULTS.GRANTED) {
			return false
		}
	}

	return true
}

export const hasCameraPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS == "ios") {
		const has = await check(PERMISSIONS.IOS.CAMERA)

		if (has !== RESULTS.GRANTED) {
			if (!requestPermissions) {
				return false
			}

			const get = await request(PERMISSIONS.IOS.CAMERA)

			if (get !== RESULTS.GRANTED) {
				return false
			}
		}
	} else {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	return true
}

export const hasBiometricPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS == "android") {
		return true
	}

	const has = await check(PERMISSIONS.IOS.FACE_ID)

	if (has !== RESULTS.GRANTED) {
		if (!requestPermissions) {
			return false
		}

		const get = await request(PERMISSIONS.IOS.FACE_ID)

		if (get !== RESULTS.GRANTED) {
			return false
		}
	}

	return true
}

export const hasPhotoLibraryPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	const hasMediaLib = await MediaLibrary.getPermissionsAsync(false)

	if (!hasMediaLib.granted) {
		if (!requestPermissions) {
			return false
		}

		const getMediaLib = await MediaLibrary.requestPermissionsAsync(false)

		if (!getMediaLib.granted) {
			return false
		}
	}

	if (Platform.OS == "ios") {
		const permissions = [PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]
		const has = await checkMultiple(permissions)

		if (Object.values(has).filter(value => value == RESULTS.GRANTED).length <= 0) {
			if (!requestPermissions) {
				return false
			}

			const get = await requestMultiple(permissions)

			if (Object.values(get).filter(value => value == RESULTS.GRANTED).length <= 0) {
				return false
			}
		}
	} else {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION)

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	return true
}

export const hasStoragePermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS == "ios") {
		return true
	}

	const [read, write] = await Promise.all([
		hasReadPermissions(requestPermissions),
		hasWritePermissions(requestPermissions)
	])

	if (!read || !write) {
		return false
	}

	return true
}
