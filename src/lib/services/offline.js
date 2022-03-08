import { storage } from "../storage"
import { getDownloadPath } from "../download"
import RNFS from "react-native-fs"
import { getFileExt } from "../helpers"

export const getOfflineList = () => {
    return new Promise((resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            var offlineList = storage.getString("offlineList:" + email)
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
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            storage.set("offlineList:" + email, JSON.stringify(list))
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
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }
            
            var offlineList = await getOfflineList()
        }
        catch(e){
            return reject(e)
        }

        let newList = [...offlineList]
        let exists = false

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == item.uuid){
                exists = true
            }
        }

        if(exists){
            return resolve()
        }

        item.offline = true

        newList.push(item)

        try{
            storage.set(email + ":offlineItems:" + item.uuid, true)
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

        return resolve()
    })
}

export const changeItemNameInOfflineList = ({ item, name }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
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

        return resolve()
    })
}

export const removeItemFromOfflineList = ({ item }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
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

                try{
                    storage.delete(email + ":offlineItems:" + item.uuid)
                }
                catch(e){
                    //console.log(e)
                }
            }
        }

        try{
            await saveOfflineList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}

export const getItemOfflinePath = (offlinePath, item) => {
    return offlinePath + item.uuid + item.name + "_" + item.uuid + "." + getFileExt(item.name)
}

export const removeFromOfflineStorage = ({ item }) => {
    return new Promise(async (resolve, reject) => {
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

            removeItemFromOfflineList({ item }).then(resolve).catch(reject)
        }).catch(reject)
    })
}