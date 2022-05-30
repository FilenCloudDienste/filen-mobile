import { storage } from "../storage"
import { getDownloadPath } from "../download"
import RNFS from "react-native-fs"
import { getFileExt } from "../helpers"
import { DeviceEventEmitter } from "react-native"
import { updateLoadItemsCache, removeLoadItemsCache } from "./items"

export const getOfflineList = () => {
    return new Promise((resolve, reject) => {
        try{
            var userId = storage.getString("userId")

            if(typeof userId !== "number"){
                return reject("userId in storage !== number")
            }

            if(userId == 0){
                return reject("userId in storage invalid length")
            }

            var offlineList = storage.getString("offlineList:" + userId)
        }
        catch(e){
            return reject(e)
        }

        if(typeof offlineList !== "string"){
            return resolve([])
        }

        if(offlineList.length <= 0){
            return resolve([])
        }

        try{
            offlineList = JSON.parse(offlineList)
        }
        catch(e){
            offlineList = []
        }

        return resolve(offlineList)
    })
}

export const saveOfflineList = ({ list }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var userId = storage.getString("userId")

            if(typeof userId !== "number"){
                return reject("userId in storage !== number")
            }

            if(userId == 0){
                return reject("userId in storage invalid length")
            }

            storage.set("offlineList:" + userId, JSON.stringify(list))
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}

export const addItemToOfflineList = ({ item }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var userId = storage.getString("userId")

            if(typeof userId !== "number"){
                return reject("userId in storage !== number")
            }

            if(userId == 0){
                return reject("userId in storage invalid length")
            }
            
            var offlineList = await getOfflineList()
        }
        catch(e){
            return reject(e)
        }

        let offlineItem = item

        offlineItem.selected = false

        let newList = [...offlineList]
        let exists = false

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == offlineItem.uuid){
                exists = true
            }
        }

        if(exists){
            return resolve()
        }

        offlineItem.offline = true

        newList.push(offlineItem)

        try{
            storage.set(userId + ":offlineItems:" + offlineItem.uuid, true)
        }
        catch(e){
            //console.log(e)
        }

        try{
            await saveOfflineList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        await updateLoadItemsCache({
            item,
            prop: "offline",
            value: true
        })

        return resolve()
    })
}

export const changeItemNameInOfflineList = ({ item, name }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var userId = storage.getString("userId")

            if(typeof userId !== "number"){
                return reject("userId in storage !== number")
            }

            if(userId == 0){
                return reject("userId in storage invalid length")
            }
            
            var offlineList = await getOfflineList()
        }
        catch(e){
            return reject(e)
        }
        
        const newList = offlineList.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, name} : mapItem)

        try{
            await saveOfflineList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        await updateLoadItemsCache({
            item,
            prop: "name",
            value: name
        })

        return resolve()
    })
}

export const removeItemFromOfflineList = ({ item }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var userId = await storage.getStringAsync("userId")

            if(typeof userId !== "number"){
                return reject("userId in storage !== number")
            }

            if(userId == 0){
                return reject("userId in storage invalid length")
            }

            var offlineList = await getOfflineList()
        }
        catch(e){
            return reject(e)
        }

        let newList = [...offlineList]

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == item.uuid){
                newList.splice(i, 1)
            }
        }

        try{
            await storage.deleteAsync(userId + ":offlineItems:" + item.uuid)
        }
        catch(e){
            console.log(e)
        }

        try{
            await saveOfflineList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        await updateLoadItemsCache({
            item,
            prop: "offline",
            value: false
        })

        await removeLoadItemsCache({
            item,
            routeURL: "offline"
        })

        return resolve()
    })
}

export const getItemOfflinePath = (offlinePath, item) => {
    return offlinePath + item.uuid + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const removeFromOfflineStorage = ({ item }) => {
    return new Promise((resolve, reject) => {
        getDownloadPath({ type: "offline" }).then(async (path) => {
            path = getItemOfflinePath(path, item)

            try{
                if((await RNFS.exists(path))){
                    await RNFS.unlink(path)
                }
            }
            catch(e){
                console.log(e)
            }

            removeItemFromOfflineList({ item }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "mark-item-offline",
                    data: {
                        uuid: item.uuid,
                        value: false
                    }
                })

                return resolve()
            }).catch(reject)
        }).catch(reject)
    })
}