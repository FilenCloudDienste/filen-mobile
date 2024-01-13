import { MMKV } from "react-native-mmkv"

export const STORAGE_ID = "filen_v3"
export const SHARED_STORAGE_ID = "filen_shared"

export const getInstace = (id: string) => {
	const mmkv = new MMKV({
		id
	})

	const before = new MMKV({
		id
	})

	return Object.assign(mmkv, {
		set: (key: string, value: any) => {
			if (before.contains(key)) {
				before.delete(key)
			}

			before.set(key, value)
		},
		delete: (key: string) => {
			if (before.contains(key)) {
				before.delete(key)
			}
		},
		getBoolean: (key: string) => {
			const data = before.getBoolean(key)

			if (typeof data !== "boolean") {
				return false
			}

			return data
		},
		getNumber: (key: string) => {
			const data = before.getNumber(key)

			if (typeof data !== "number") {
				return 0
			}

			return data
		}
	})
}

// Overwrite default methods to fit our codebase

export const storage = getInstace(STORAGE_ID)
export const sharedStorage = getInstace(SHARED_STORAGE_ID)

export default storage
