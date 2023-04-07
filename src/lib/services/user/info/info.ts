import { fetchUserInfo, fetchUserUsage } from "../../../api"
import storage from "../../../storage"
import { isOnline } from "../../isOnline"

export const updateUserUsage = async (): Promise<void> => {
	if (!(await isOnline())) {
		return
	}

	fetchUserUsage()
		.then(usage => storage.set("userUsage:" + storage.getNumber("userId"), JSON.stringify(usage)))
		.catch(console.error)
}

export const updateUserInfo = async (): Promise<void> => {
	if (!(await isOnline())) {
		return
	}

	fetchUserInfo()
		.then(info => storage.set("userInfo:" + storage.getNumber("userId"), JSON.stringify(info)))
		.catch(console.error)
}
