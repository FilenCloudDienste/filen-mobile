import { storage } from "../storage"
import { apiRequest } from "../api"
import { logout } from "../auth/logout"
import { getMasterKeys, encryptMetadata, getAPIKey, decryptMetadata } from "../helpers"
import { showToast } from "../../components/Toasts"

export const updateKeypair = ({ publicKey, privateKey, navigation }) => {
    return new Promise((resolve, reject) => {
        let masterKeys = getMasterKeys()
        let apiKey = getAPIKey()

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

                return resolve()
            }).catch((err) => {
                return reject(err)
            })
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const setKeypair = ({ publicKey, privateKey, navigation }) => {
    return new Promise((resolve, reject) => {
        let masterKeys = getMasterKeys()
        let apiKey = getAPIKey()

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

                        return resolve()
                    }

                    return reject(response.message)
                }
    
                return resolve()
            }).catch((err) => {
                return reject(err)
            })
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const updatePublicAndPrivateKey = ({ navigation }) => {
    return new Promise((resolve, reject) => {
        let masterKeys = getMasterKeys()
        let apiKey = getAPIKey()

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

            if(response.data.publicKey.length > 16 && response.data.privateKey.length > 16){
                let privateKey = ""

                for(let i = 0; i < masterKeys.length; i++){
                    try{
                        let decrypted = await decryptMetadata(response.data.privateKey, masterKeys[i])

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

                        return resolve()
                    }).catch((err) => {
                        return reject(err)
                    })
                }
                else{
                    console.log("Could not decrypt private key.")

                    return resolve()
                }
            }
            else{
                try{
                    const generatedKeypair = await global.nodeThread.generateKeypair()
                    const b64PubKey = generatedKeypair.publicKey
                    const b64PrivKey = generatedKeypair.privateKey
    
                    if(b64PubKey.length > 16 && b64PrivKey.length > 16){
                        setKeypair({ publicKey: b64PubKey, privateKey: b64PrivKey, navigation }).then(() => {
                            try{
                                storage.set("publicKey", b64PubKey)
                                storage.set("privateKey", b64PrivKey)
                            }
                            catch(err){
                                return reject(err)
                            }

                            console.log("User keypair generated and updated.")

                            return resolve()
                        }).catch((err) => {
                            return reject(err)
                        })
                    }
                    else{
                        return reject("Key lengths invalid")
                    }
                }
                catch(e){
                    return reject(e)
                }
            }
        }).catch((err) => {
            return reject(err)
        })
    })
}

export const updateKeys = ({ navigation }) => {
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

                let newMasterKeys = ""

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
                        return resolve()
                    }).catch((err) => {
                        return resolve()
                    })
                }
                else{
                    console.log("Could not decrypt master keys.")

                    return resolve()
                }
            }).catch((err) => {
                return reject(err)
            })
        }).catch((err) => {
            return reject(err)
        })
    })
}