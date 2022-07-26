import storage from "../storage"
import { getDownloadPath } from "../download"
import { getFileExt } from "../helpers"
import { DeviceEventEmitter } from "react-native"
import { updateLoadItemsCache, removeLoadItemsCache } from "./items"
import * as FileSystem from "expo-file-system"

export const getOfflineList = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const userId = storage.getNumber("userId")

        if(typeof userId !== "number"){
            return reject("userId in storage !== number")
        }

        if(userId == 0){
            return reject("userId in storage invalid length")
        }

        const offlineList = storage.getString("offlineList:" + userId)

        if(typeof offlineList !== "string"){
            return resolve([])
        }

        if(offlineList.length <= 0){
            return resolve([])
        }

        try{
            return resolve(JSON.parse(offlineList))
        }
        catch(e){
            return resolve([])
        }
    })
}

export const saveOfflineList = ({ list }: { list: any }): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userId = storage.getNumber("userId")

        if(typeof userId !== "number"){
            return reject("userId in storage !== number")
        }

        if(userId == 0){
            return reject("userId in storage invalid length")
        }

        storage.set("offlineList:" + userId, JSON.stringify(list))

        return resolve(true)
    })
}

export const addItemToOfflineList = ({ item }: { item: any }): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userId = storage.getNumber("userId")

        if(typeof userId !== "number"){
            return reject("userId in storage !== number")
        }

        if(userId == 0){
            return reject("userId in storage invalid length")
        }
        
        const offlineList = await getOfflineList()
        const offlineItem = item

        offlineItem.selected = false

        const newList = [...offlineList]
        let exists = false

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == offlineItem.uuid){
                exists = true
            }
        }

        if(exists){
            return resolve(true)
        }

        offlineItem.offline = true

        newList.push(offlineItem)

        storage.set(userId + ":offlineItems:" + offlineItem.uuid, true)

        await saveOfflineList({ list: newList })

        await updateLoadItemsCache({
            item,
            prop: "offline",
            value: true
        })

        return resolve(true)
    })
}

export const changeItemNameInOfflineList = ({ item, name }: { item: any, name: string }): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userId = storage.getNumber("userId")

        if(typeof userId !== "number"){
            return reject("userId in storage !== number")
        }

        if(userId == 0){
            return reject("userId in storage invalid length")
        }
        
        const offlineList = await getOfflineList()
        const newList = offlineList.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, name} : mapItem)

        await saveOfflineList({ list: newList })

        await updateLoadItemsCache({
            item,
            prop: "name",
            value: name
        })

        return resolve(true)
    })
}

export const removeItemFromOfflineList = ({ item }: { item: any }): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        const userId = storage.getNumber("userId")

        if(typeof userId !== "number"){
            return reject("userId in storage !== number")
        }

        if(userId == 0){
            return reject("userId in storage invalid length")
        }

        const offlineList = await getOfflineList()
        const newList = [...offlineList]

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == item.uuid){
                newList.splice(i, 1)
            }
        }

        storage.delete(userId + ":offlineItems:" + item.uuid)

        await saveOfflineList({ list: newList })
        await updateLoadItemsCache({
            item,
            prop: "offline",
            value: false
        })
        await removeLoadItemsCache({
            item,
            routeURL: "offline"
        })

        return resolve(true)
    })
}

export const getItemOfflinePath = (offlinePath: string, item: any): string => {
    return offlinePath + item.uuid + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const removeFromOfflineStorage = ({ item }: { item: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        getDownloadPath({ type: "offline" }).then(async (path) => {
            path = getItemOfflinePath(path, item)

            try{
                if((await FileSystem.getInfoAsync(path)).exists){
                    await FileSystem.deleteAsync(path)
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

                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}