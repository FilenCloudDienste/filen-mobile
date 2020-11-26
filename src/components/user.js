import * as language from "../utils/language"
import { Plugins } from "@capacitor/core"

const utils = require("../utils/utils")

export async function updateUserKeys(){
    if(!this.state.isLoggedIn){
        return false
    }

    const updateUserKeypair = async (pub, priv, callback) => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/update", {
                apiKey: this.state.userAPIKey,
                publicKey: pub,
                privateKey: utils.cryptoJSEncrypt(priv, this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
            })
        }
        catch(e){
            if(typeof callback == "function"){
                return callback(e)
            }

            console.log(e)

            return false
        }

        if(!res.status){
            if(typeof callback == "function"){
                return callback(res.message)
            }

            console.log(res.message)

            return false
        }

        if(typeof callback == "function"){
            return callback(null, true)
        }

        return true
    }

    const setUserKeypair = async (pub, priv, callback) => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/set", {
                apiKey: this.state.userAPIKey,
                publicKey: pub,
                privateKey: utils.cryptoJSEncrypt(priv, this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
            })
        }
        catch(e){
            if(typeof callback == "function"){
                return callback(e)
            }

            console.log(e)

            return false
        }

        if(!res.status){
            if(typeof callback == "function"){
                return callback(res.message)
            }

            console.log(res.message)

            return false
        }

        if(typeof callback == "function"){
            return callback(null, true)
        }

        return true
    }

    const updatePubAndPrivKey = async () => {
        try{
            var res = await utils.apiRequest("POST", "/v1/user/keyPair/info", {
                apiKey: this.state.userAPIKey
            })
        }
        catch(e){
            return console.log(e)
        }

        if(!res.status){
            return console.log(res.message)
        }

        if(res.data.publicKey.length > 16 && res.data.privateKey.length > 16){
            let privKey = ""

            this.state.userMasterKeys.forEach((key) => {
                if(privKey.length == 0){
                    try{
                        let decrypted = utils.cryptoJSDecrypt(res.data.privateKey, key)

                        if(typeof decrypted == "string"){
                            if(decrypted.length > 16){
                                privKey = decrypted
                            }
                        }
                    }
                    catch(e){
                        console.log(e)

                        return
                    }
                }
            })

            if(privKey.length > 16){
                await Plugins.Storage.set({ key: "userPublicKey", value: res.data.publicKey })
                await Plugins.Storage.set({ key: "userPrivateKey", value: privKey })

                this.setState({
                    userPublicKey: res.data.publicKey,
                    userPrivateKey: privKey
                })

                console.log("Public and private key updated.")

                return updateUserKeypair(res.data.publicKey, privKey, (err) => {
                    if(err){
                        return console.log(err)
                    }

                    return console.log("User keypair updated.")
                })
            }
            else{
                return console.log("Could not decrypt private key")
            }
        }
        else{
            try{
                let generatedKeypair = await window.crypto.subtle.generateKey({
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-512"
                }, true, ["encrypt", "decrypt"])

                let exportedPubKey = await window.crypto.subtle.exportKey("spki", generatedKeypair.publicKey)
                let b64PubKey = utils.base64ArrayBuffer(exportedPubKey)

                let exportedPrivKey = await window.crypto.subtle.exportKey("pkcs8", generatedKeypair.privateKey)
                let b64PrivKey = utils.base64ArrayBuffer(exportedPrivKey)

                if(b64PubKey.length > 16 && b64PrivKey.length > 16){
                    setUserKeypair(b64PubKey, b64PrivKey, (err) => {
                        if(err){
                            return console.log(err)
                        }

                        return console.log("User keypair generated and updated.")
                    })
                }
                else{
                    return console.log("Key lengths invalid")
                }
            }
            catch(e){
                return console.log(e)
            }
        }
    }

    try{
        var res = await utils.apiRequest("POST", "/v1/user/masterKeys", {
            apiKey: this.state.userAPIKey,
            masterKeys: utils.cryptoJSEncrypt(this.state.userMasterKeys.join("|"), this.state.userMasterKeys[this.state.userMasterKeys.length - 1])
        })
    }
    catch(e){
        return console.log(e)
    }

    if(!res.status){
        return console.log(res.message)
    }

    let newKeys = ""

    this.state.userMasterKeys.forEach((key) => {
        try{
            if(newKeys.length == 0){
                let decrypted = utils.cryptoJSDecrypt(res.data.keys, key)

                if(typeof decrypted == "string"){
                    if(decrypted.length > 16){
                        newKeys = decrypted
                    }
                }
            }
        }
        catch(e){
            console.log(e)

            return
        }
    })

    if(newKeys.length > 16){
        await Plugins.Storage.set({ key: "userMasterKeys", value: JSON.stringify(newKeys.split("|")) })

        this.setState({
            userMasterKeys: newKeys.split("|")
        })

        console.log("Master keys updated.")
    }
    else{
        console.log("Could not decrypt master keys.")
    }

    return updatePubAndPrivKey()
}

export async function updateUserUsage(){
    if(!this.state.isLoggedIn){
        return false
    }

    try{
        var res = await utils.apiRequest("POST", "/v1/user/usage", {
            apiKey: this.state.userAPIKey
        })
    }
    catch(e){
        return console.log(e)
    }

    if(!res.status){
        console.log(res.message)

        return false
    }

    let storageUsedPercent = ((res.data.storage / res.data.max) * 100).toFixed(2)

    return this.setState({
        userStorageUsagePercentage: storageUsedPercent,
        userStorageUsageMenuText: language.get("en", "userStorageUsageMenuText", false, ["__MAX__", "__PERCENTAGE__"], [utils.formatBytes(res.data.max), storageUsedPercent]),
		userCurrentStorageUsage: res.data.storage,
		userMaxStorage: res.data.max
    })
}