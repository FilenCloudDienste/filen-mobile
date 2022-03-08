import { storage } from "../storage"
import { apiRequest } from "../api"
import { getAPIKey } from "../helpers"

const apiKey = getAPIKey()

export const updateUsage = () => {
    apiRequest({
        method: "POST",
        endpoint: "/v1/user/usage",
        data: {
            apiKey
        }
    }).then((response) => {
        if(response.status){
            const storageUsedPercent = ((response.data.storage / response.data.max) * 100).toFixed(2)

            try{
                storage.set("storageUsedPercent", storageUsedPercent)
                storage.set("storageUsage", response.data.storage)
                storage.set("maxStorage", response.data.max)
                storage.set("filesCount", response.data.uploads)
                storage.set("foldersCount", response.data.folders)
                storage.set("twoFactorEnabled", response.data.twoFactorEnabled)
            }
            catch(e){
                console.log(e)
            }
        }
    }).catch((err) => {
        return console.log(err)
    })
}

export const fetchUserInfo = () => {
    return new Promise((resolve, reject) => {
        apiRequest({
            method: "POST",
            endpoint: "/v1/user/info",
            data: {
                apiKey
            }
        }).then((response) => {
            if(!response.status){
                return reject(response.message)
            }

            try{
                storage.set("userInfo", JSON.stringify(response.data))
            }
            catch(e){
                console.log(e)
            }

            return resolve(response.data)
        }).catch((err) => {
            return reject(err)
        })
    })
}