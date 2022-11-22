import { fetchUserInfo, fetchUserUsage } from "../../../api"
import storage from "../../../storage"
import { isOnline } from "../../isOnline"

export const updateUserUsage = (): void => {
    if(isOnline()){
        fetchUserUsage().then((usage) => {
            storage.set("userUsage:" + storage.getNumber("userId"), JSON.stringify(usage))
        }).catch((err) => {
            console.log(err)
        })
    }
}

export const updateUserInfo = (): void => {
    if(isOnline()){
        fetchUserInfo().then((info) => {
            storage.set("userInfo:" + storage.getNumber("userId"), JSON.stringify(info))
        }).catch((err) => {
            console.log(err)
        })
    }
}