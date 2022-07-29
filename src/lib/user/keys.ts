import storage from "../storage"
import { apiRequest } from "../api"
import { logout } from "../auth/logout"
import { getMasterKeys, encryptMetadata, getAPIKey, decryptMetadata } from "../helpers"
import { showToast } from "../../components/Toasts"

export const updateKeypair = ({ publicKey, privateKey, navigation }: { publicKey: string, privateKey: string, navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const masterKeys: string[] = getMasterKeys()
        const apiKey: string = getAPIKey()

        if(masterKeys.length == 0){
            logout({ navigation })

            showToast({ message: "No master keys found - 1" })

            return reject("No master keys found")
        }

        encryptMetadata(privateKey, masterKeys[masterKeys.length - 1]).then((encryptedPrivateKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/keyPair/update",
                data: {
                    apiKey,
                    publicKey,
                    privateKey: encryptedPrivateKey
                }
            }).then((response) => {
                if(!response.status){
                    if(response.message.toLowerCase().indexOf("api key not found") !== -1){
                        logout({ navigation })

                        return reject("API key not found")
                    }

                    return reject(response.message)
                }

                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const setKeypair = ({ publicKey, privateKey, navigation }: { publicKey: string, privateKey: string, navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const masterKeys: string[] = getMasterKeys()
        const apiKey: string = getAPIKey()

        if(masterKeys.length == 0){
            logout({ navigation })

            showToast({ message: "No master keys found - 2" })

            return reject("No master keys found")
        }
    
        encryptMetadata(privateKey, masterKeys[masterKeys.length - 1]).then((encryptedPrivateKey) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/keyPair/set",
                data: {
                    apiKey,
                    publicKey,
                    privateKey: encryptedPrivateKey
                }
            }).then((response) => {
                if(!response.status){
                    if(response.message.toLowerCase().indexOf("api key not found") !== -1){
                        logout({ navigation })

                        return resolve(true)
                    }

                    return reject(response.message)
                }
    
                return resolve(true)
            }).catch(reject)
        }).catch(reject)
    })
}

export const updatePublicAndPrivateKey = ({ navigation }: { navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const masterKeys: string[] = getMasterKeys()
        const apiKey: string = getAPIKey()

        if(masterKeys.length == 0){
            logout({ navigation })

            showToast({ message: "No master keys found - 3" })

            return reject("No master keys found")
        }

        apiRequest({
            method: "POST",
            endpoint: "/v1/user/keyPair/info",
            data: {
                apiKey
            }
        }).then(async (response) => {
            if(!response.status){
                if(response.message.toLowerCase().indexOf("api key not found") !== -1){
                    logout({ navigation })

                    return reject("API key not found")
                }

                return reject(response.message)
            }

            if(response.data.publicKey.length > 16 && response.data.privateKey.length > 16 && Array.isArray(masterKeys)){
                let privateKey = ""

                for(let i = 0; i < masterKeys.length; i++){
                    try{
                        const decrypted = await decryptMetadata(response.data.privateKey, masterKeys[i])

                        if(typeof decrypted == "string"){
                            if(decrypted.length > 16){
                                privateKey = decrypted
                            }
                        }
                    }
                    catch(e){
                        continue
                    }
                }

                if(privateKey.length > 16){
                    try{
                        storage.set("publicKey", response.data.publicKey)
                        storage.set("privateKey", privateKey)
                    }
                    catch(e){
                        return reject(e)
                    }

                    console.log("Public and private key updated.")

                    updateKeypair({ publicKey: response.data.publicKey, privateKey, navigation }).then(() => {
                        console.log("User keypair updated.")

                        return resolve(true)
                    }).catch(reject)
                }
                else{
                    console.log("Could not decrypt private key.")

                    return resolve(true)
                }
            }
            else{
                try{
                    var generatedKeypair = await global.nodeThread.generateKeypair()
                    var b64PubKey = generatedKeypair.publicKey
                    var b64PrivKey = generatedKeypair.privateKey
                }
                catch(e){
                    return reject(e)
                }

                if(b64PubKey.length > 16 && b64PrivKey.length > 16){
                    setKeypair({ publicKey: b64PubKey, privateKey: b64PrivKey, navigation }).then(() => {
                        storage.set("publicKey", b64PubKey)
                        storage.set("privateKey", b64PrivKey)

                        console.log("User keypair generated and updated.")

                        return resolve(true)
                    }).catch(reject)
                }
                else{
                    return reject("Key lengths invalid")
                }
            }
        }).catch(reject)
    })
}

export const updateKeys = ({ navigation }: { navigation: any }): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let masterKeys = getMasterKeys()
        let apiKey = getAPIKey()

        if(masterKeys.length == 0){
            logout({ navigation })
    
            return reject("No master keys found")
        }

        encryptMetadata(masterKeys.join("|"), masterKeys[masterKeys.length - 1]).then((encryptedMasterKeys) => {
            apiRequest({
                method: "POST",
                endpoint: "/v1/user/masterKeys",
                data: {
                    apiKey,
                    masterKeys: encryptedMasterKeys
                }
            }).then(async (response) => {
                if(!response.status){
                    if(response.message.toLowerCase().indexOf("api key not found") !== -1){
                        logout({ navigation })
    
                        return reject("API key not found")
                    }

                    return reject(response.message)
                }

                let newMasterKeys: any = ""

                for(let i = 0; i < masterKeys.length; i++){
                    try{
                        let decrypted = await decryptMetadata(response.data.keys, masterKeys[i])
            
                        if(typeof decrypted == "string"){
                            if(decrypted.length > 16){
                                newMasterKeys = decrypted
                            }
                        }
                    }
                    catch(e){
                        continue
                    }
                }

                if(newMasterKeys.length > 16){
                    try{
                        newMasterKeys = newMasterKeys.split("|")

                        storage.set("masterKeys", JSON.stringify(newMasterKeys))

                        masterKeys = newMasterKeys
                    }
                    catch(e){
                        return reject(e)
                    }

                    console.log("Master keys updated.")

                    updatePublicAndPrivateKey({ navigation }).then(() => {
                        return resolve(true)
                    }).catch((err) => {
                        console.log(err)

                        return resolve(true)
                    })
                }
                else{
                    console.log("Could not decrypt master keys.")

                    updatePublicAndPrivateKey({ navigation }).then(() => {
                        return resolve(true)
                    }).catch((err) => {
                        console.log(err)
                        
                        return resolve(true)
                    })
                }
            }).catch(reject)
        }).catch(reject)
    })
}