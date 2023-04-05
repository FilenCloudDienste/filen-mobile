import { fetchUserInfo, fetchUserUsage } from "../../../api"
import storage from "../../../storage"
import { isOnline } from "../../isOnline"

export const updateUserUsage = (): void => {
	if (!isOnline()) {
		return
	}

	fetchUserUsage()
		.then(usage => storage.set("userUsage:" + storage.getNumber("userId"), JSON.stringify(usage)))
		.catch(console.error)
}

export const updateUserInfo = (): void => {
	if (!isOnline()) {
		return
	}

	fetchUserInfo()
		.then(info => storage.set("userInfo:" + storage.getNumber("userId"), JSON.stringify(info)))
		.catch(console.error)
}
