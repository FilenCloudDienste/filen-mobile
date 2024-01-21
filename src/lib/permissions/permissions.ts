import { Platform, PermissionsAndroid } from "react-native"
import { check, PERMISSIONS, RESULTS, request, requestMultiple, checkMultiple } from "react-native-permissions"
import * as MediaLibrary from "expo-media-library"
import storage from "../storage"
import { i18n } from "../../i18n"
import notifee from "@notifee/react-native"
import { Notifications } from "react-native-notifications"

export const hasWritePermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS === "ios") {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version <= 22) {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version <= 29) {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
				title: i18n(storage.getString("lang"), "permissionsWriteTitle"),
				message: i18n(storage.getString("lang"), "permissionsWriteMessage"),
				buttonNeutral: i18n(storage.getString("lang"), "permissionsAskMeLater"),
				buttonPositive: i18n(storage.getString("lang"), "ok"),
				buttonNegative: i18n(storage.getString("lang"), "cancel")
			})

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	return true
}

export const hasReadPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS === "ios") {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version <= 22) {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version <= 29) {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
				title: i18n(storage.getString("lang"), "permissionsReadTitle"),
				message: i18n(storage.getString("lang"), "permissionsReadMessage"),
				buttonNeutral: i18n(storage.getString("lang"), "permissionsAskMeLater"),
				buttonPositive: i18n(storage.getString("lang"), "ok"),
				buttonNegative: i18n(storage.getString("lang"), "cancel")
			})

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	return true
}

export const hasCameraPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS === "android" && Platform.constants.Version <= 22) {
		return true
	}

	if (Platform.OS === "ios") {
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

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
				title: i18n(storage.getString("lang"), "permissionsCameraTitle"),
				message: i18n(storage.getString("lang"), "permissionsCameraMessage"),
				buttonNeutral: i18n(storage.getString("lang"), "permissionsAskMeLater"),
				buttonPositive: i18n(storage.getString("lang"), "ok"),
				buttonNegative: i18n(storage.getString("lang"), "cancel")
			})

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	return true
}

export const hasBiometricPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS === "android") {
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
	if (Platform.OS === "android" && Platform.constants.Version <= 22) {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version >= 29) {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION, {
				title: i18n(storage.getString("lang"), "permissionsMediaLocationTitle"),
				message: i18n(storage.getString("lang"), "permissionsMediaLocationMessage"),
				buttonNeutral: i18n(storage.getString("lang"), "permissionsAskMeLater"),
				buttonPositive: i18n(storage.getString("lang"), "ok"),
				buttonNegative: i18n(storage.getString("lang"), "cancel")
			})

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	const hasMediaLib = await MediaLibrary.getPermissionsAsync(false)

	if (!hasMediaLib.granted) {
		if (!requestPermissions) {
			return false
		}

		if (!hasMediaLib.canAskAgain) {
			return false
		}

		const getMediaLib = await MediaLibrary.requestPermissionsAsync(false)

		if (!getMediaLib.granted) {
			return false
		}
	}

	if (Platform.OS === "ios") {
		const permissions = [PERMISSIONS.IOS.PHOTO_LIBRARY, PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY]
		const has = await checkMultiple(permissions)

		if (Object.values(has).filter(value => value === RESULTS.GRANTED).length !== 2) {
			if (!requestPermissions) {
				return false
			}

			const get = await requestMultiple(permissions)

			if (Object.values(get).filter(value => value === RESULTS.GRANTED).length !== 2) {
				return false
			}
		}
	}

	return true
}

export const hasStoragePermissions = async (requestPermissions: boolean): Promise<boolean> => {
	if (Platform.OS === "ios") {
		return true
	}

	if (Platform.OS === "android" && Platform.constants.Version <= 22) {
		return true
	}

	const [read, write] = await Promise.all([hasReadPermissions(requestPermissions), hasWritePermissions(requestPermissions)])

	if (!read || !write) {
		return false
	}

	return true
}

export const hasNotificationPermissions = async (requestPermissions: boolean): Promise<boolean> => {
	const notifeePermissions = await notifee.requestPermission()

	if (notifeePermissions.authorizationStatus !== 1) {
		return false
	}

	if (Platform.OS === "android") {
		const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)

		if (!has) {
			if (!requestPermissions) {
				return false
			}

			const get = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
				title: i18n(storage.getString("lang"), "permissionsNotificationsTitle"),
				message: i18n(storage.getString("lang"), "permissionsNotificationsMessage"),
				buttonNeutral: i18n(storage.getString("lang"), "permissionsAskMeLater"),
				buttonPositive: i18n(storage.getString("lang"), "ok"),
				buttonNegative: i18n(storage.getString("lang"), "cancel")
			})

			if (get !== PermissionsAndroid.RESULTS.GRANTED) {
				return false
			}
		}
	}

	const hasPermissions = await Notifications.isRegisteredForRemoteNotifications()

	if (!hasPermissions) {
		return false
	}

	return true
}
