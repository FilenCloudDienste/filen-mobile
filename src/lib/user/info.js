import { fetchUserInfo, fetchUserUsage } from "../api"
import { storage } from "../storage"
import { useStore } from "../state"

export const updateUserUsage = () => {
    const netInfo = useStore.getState().netInfo

    if(netInfo.isConnected && netInfo.isInternetReachable){
        fetchUserUsage().then((usage) => {
            storage.set("userUsage:" + storage.getString("email"), JSON.stringify(usage))
        }).catch((err) => {
            console.log(err)
        })
    }
}

export const updateUserInfo = () => {
    const netInfo = useStore.getState().netInfo

    if(netInfo.isConnected && netInfo.isInternetReachable){
        fetchUserInfo().then((info) => {
            storage.set("userInfo:" + storage.getString("email"), JSON.stringify(info))
        }).catch((err) => {
            console.log(err)
        })
    }
}