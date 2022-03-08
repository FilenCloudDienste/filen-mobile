import { storage } from "../storage"

export const clearPhotosList = () => {
    return new Promise((resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            storage.delete("photos:" + email)
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}

export const getPhotosList = () => {
    return new Promise((resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            var list = storage.getString("photos:" + email)
        }
        catch(e){
            return reject(e)
        }

        if(typeof list !== "string"){
            return resolve([])
        }

        if(list.length <= 0){
            return resolve([])
        }

        try{
            list = JSON.parse(list)
        }
        catch(e){
            list = []
        }

        return resolve(list)
    })
}

export const savePhotosList = ({ list }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            storage.set("photos:" + email, JSON.stringify(list))
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}

export const addItemToPhotosList = ({ item }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }
            
            var list = await getPhotosList()
        }
        catch(e){
            return reject(e)
        }

        let newList = [...list]
        let exists = false

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == item.uuid){
                exists = true
            }
        }

        if(exists){
            return resolve()
        }

        newList.push(item)

        try{
            await savePhotosList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}

export const removeItemFromPhotosList = ({ item }) => {
    return new Promise(async (resolve, reject) => {
        try{
            var email = storage.getString("email")

            if(typeof email !== "string"){
                return reject("email in storage !== string")
            }

            if(email.length < 1){
                return reject("email in storage invalid length")
            }

            var list = await getPhotosList()
        }
        catch(e){
            return reject(e)
        }

        let newList = [...list]

        for(let i = 0; i < newList.length; i++){
            if(newList[i].uuid == item.uuid){
                newList.splice(i, 1)
            }
        }

        try{
            await savePhotosList({ list: newList })
        }
        catch(e){
            return reject(e)
        }

        return resolve()
    })
}