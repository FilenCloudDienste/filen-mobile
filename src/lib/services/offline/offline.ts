import storage from "../../storage"
import { getDownloadPath } from "../download/download"
import { getFileExt } from "../../helpers"
import { DeviceEventEmitter } from "react-native"
import { updateLoadItemsCache, removeLoadItemsCache } from "../items"
import { Item } from "../../../types"
import * as fs from "../../fs"

export const getOfflineList = async (): Promise<Item[]> => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        throw new Error("userId in storage invalid length")
    }

    const offlineList = storage.getString("offlineList:" + userId)

    if(typeof offlineList !== "string"){
        return []
    }

    if(offlineList.length <= 0){
        return []
    }

    try{
        return JSON.parse(offlineList)
    }
    catch(e){
        return []
    }
}

export const saveOfflineList = async ({ list }: { list: Item[] }): Promise<boolean> => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        throw new Error("userId in storage invalid length")
    }

    storage.set("offlineList:" + userId, JSON.stringify(list))

    return true
}

export const addItemToOfflineList = async ({ item }: { item: Item }): Promise<boolean> => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        throw new Error("userId in storage invalid length")
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
        return true
    }

    offlineItem.offline = true

    newList.push(offlineItem)

    storage.set(userId + ":offlineItems:" + offlineItem.uuid, true)

    await Promise.all([
        saveOfflineList({ list: newList }),
        updateLoadItemsCache({
            item,
            prop: "offline",
            value: true
        })
    ])

    return true
}

export const changeItemNameInOfflineList = async ({ item, name }: { item: Item, name: string }): Promise<boolean> => {
    const userId = storage.getNumber("userId")

    if(userId == 0){
        throw new Error("userId in storage invalid length")
    }
    
    const offlineList = await getOfflineList()
    const newList = offlineList.map(mapItem => mapItem.uuid == item.uuid ? {...mapItem, name} : mapItem)

    await Promise.all([
        saveOfflineList({ list: newList }),
        updateLoadItemsCache({
            item,
            prop: "name",
            value: name
        })
    ])

    return true
}

export const removeItemFromOfflineList = async ({ item }: { item: Item }): Promise<boolean> => {
    const userId = storage.getNumber("userId")

    if(typeof userId !== "number"){
        throw new Error("userId in storage !== number")
    }

    if(userId == 0){
        throw new Error("userId in storage invalid length")
    }

    const offlineList = await getOfflineList()
    const newList = [...offlineList]

    for(let i = 0; i < newList.length; i++){
        if(newList[i].uuid == item.uuid){
            newList.splice(i, 1)
        }
    }

    storage.delete(userId + ":offlineItems:" + item.uuid)

    await Promise.all([
        saveOfflineList({ list: newList }),
        updateLoadItemsCache({
            item,
            prop: "offline",
            value: false
        }),
        removeLoadItemsCache({
            item,
            routeURL: "offline"
        })
    ])

    return true
}

export const getItemOfflinePath = (offlinePath: string, item: Item): string => {
    return offlinePath + item.uuid + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const removeFromOfflineStorage = async ({ item }: { item: Item }): Promise<boolean> => {
    const path = getItemOfflinePath(await getDownloadPath({ type: "offline" }), item)

    try{
        if((await fs.stat(path)).exists){
            await fs.unlink(path)
        }
    }
    catch(e){
        console.log(e)
    }

    await removeItemFromOfflineList({ item })
    
    DeviceEventEmitter.emit("event", {
        type: "mark-item-offline",
        data: {
            uuid: item.uuid,
            value: false
        }
    })

    return true
}