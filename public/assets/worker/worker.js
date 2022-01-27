const window = self
const nativeCrypto = self.crypto || window.crypto

importScripts("crypto.js")
importScripts("utils.js")
importScripts("localforage.js")

try{
    localforage.config({
        name: "filen_localForage",
        version: 1.0,
        size: (((1024 * 1024) * 1024) * 32),
        storeName: "keyvaluepairs"
    })
}
catch(e){
    console.log(e)

    try{
        localforage.config({
            name: "filen_localForage",
            version: 1.0,
            size: (((1024 * 1024) * 1024) * 1),
            storeName: "keyvaluepairs"
        })
    }
    catch(e){
        console.log(e)

        try{
            localforage.config({
                name: "filen_localForage",
                version: 1.0,
                size: ((1024 * 1024) * 100),
                storeName: "keyvaluepairs"
            })
        }
        catch(e){
            console.log(e)
        }
    }
}

localforage.ready()

const encryptMetadata = async (e) => {
    try{
        var data = e.data.data.toString()
        var key = e.data.key.toString()
        var metadataVersion = e.data.version
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }

    if(metadataVersion == 1){ //old deprecated
        try{
            var enc = CryptoJS.AES.encrypt(data, key).toString()

            postMessage({
                id: e.data.id,
                type: e.data.type,
                data: enc
            })

            e = null
            data = null
            key = null

            return true
        }
        catch(err){
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            data = null
            key = null

            return true
        }
    }
    else if(metadataVersion == 2){
        try{
            key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

            var iv = generateRandomString(12)
            var string = new TextEncoder().encode(data)

            var encrypted = await nativeCrypto.subtle.encrypt({
                name: "AES-GCM",
                iv: new TextEncoder().encode(iv)
            }, await nativeCrypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]), string)

            var enc = "002" + iv + base64ArrayBuffer(new Uint8Array(encrypted))

            postMessage({
                id: e.data.id,
                type: e.data.type,
                data: enc
            })

            e = null
            data = null
            key = null
            iv = null
            string = null
            encrypted = null
            enc = null

            return true
        }
        catch(err){
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            data = null
            key = null

            return true
        }
    }
}

const decryptMetadata = async (e) => {
    try{
        var data = e.data.data.toString()
        var key = e.data.key.toString()
        var sliced = data.slice(0, 8)
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }

    if(sliced == "U2FsdGVk"){ //old deprecated
        try{
            var dec = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8)

            postMessage({
                id: e.data.id,
                type: e.data.type,
                data: dec
            })

            e = null
            data = null
            key = null
            sliced = null
            dec = null

            return true
        }
        catch(err){
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            data = null
            key = null
            sliced = null
            err = null

            return true
        }
    }
    else{
        var version = data.slice(0, 3)

        if(version == "002"){
            try{
                key = await deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false) //transform variable length input key to 256 bit (32 bytes) as fast as possible since it's already derived and safe

                var iv = new TextEncoder().encode(data.slice(3, 15))
                var encrypted = _base64ToArrayBuffer(data.slice(15))

                var decrypted = await nativeCrypto.subtle.decrypt({
                    name: "AES-GCM",
                    iv
                }, await nativeCrypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]), encrypted)

                var dec = new TextDecoder().decode(new Uint8Array(decrypted))

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    data: dec
                })

                dec = null
                e = null
                data = null
                key = null
                sliced = null
                key = null
                iv = null
                encrypted = null
                decrypted = null
                version = null

                return true
            }
            catch(err){
                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    err: err.toString()
                })

                e = null
                data = null
                key = null
                sliced = null
                version = null
                err = null

                return true
            }
        }
        else{
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: "invalid version"
            })

            e = null
            data = null
            key = null
            sliced = null
            version = null
            err = null

            return true
        }
    }
}

const encryptData = (e) => {
    if(typeof e.data.data == "undefined"){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            uuid: e.data.uuid,
            index: e.data.index,
            data: "",
            version: e.data.version
        })

        e = null

        return true
    }

    if(typeof e.data.data.byteLength == "undefined"){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            uuid: e.data.uuid,
            index: e.data.index,
            data: "",
            version: e.data.version
        })

        e = null

        return true
    }

    if(e.data.data.byteLength == 0){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            uuid: e.data.uuid,
            index: e.data.index,
            data: "",
            version: e.data.version
        })

        e = null

        return true
    }

    var preKey = new TextEncoder().encode(e.data.key)

    if(e.data.version == 1){
        var iv = preKey.slice(0, 16)

        nativeCrypto.subtle.importKey("raw", preKey, "AES-CBC", false, ["encrypt"]).then((key) => {
            nativeCrypto.subtle.encrypt({
                name: "AES-CBC",
                iv: iv
            }, key, e.data.data).then((encrypted) => {
                var data = convertUint8ArrayToBinaryString(new Uint8Array(encrypted))

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    uuid: e.data.uuid,
                    index: e.data.index,
                    data: data,
                    version: e.data.version
                })

                data = null
                e = null
                preKey = null

                return true
            }).catch((err) => {
                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    err: err.toString()
                })

                e = null
                preKey = null
                err = null

                return true
            })
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            preKey = null
            err = null

            return true
        })
    }
    else if(e.data.version == 2){
        var iv = generateRandomString(12)

        nativeCrypto.subtle.importKey("raw", preKey, "AES-GCM", false, ["encrypt"]).then((key) => {
            nativeCrypto.subtle.encrypt({
                name: "AES-GCM",
                iv: new TextEncoder().encode(iv)
            }, key, e.data.data).then((encrypted) => {
                var data = iv + convertUint8ArrayToBinaryString(new Uint8Array(encrypted))

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    uuid: e.data.uuid,
                    index: e.data.index,
                    data: data,
                    version: e.data.version
                })

                data = null
                e = null
                preKey = null
                iv = null

                return true
            }).catch((err) => {
                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    err: err.toString()
                })

                e = null
                preKey = null
                iv = null
                err = null

                return true
            })
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            preKey = null
            iv = null
            err = null

            return true
        })
    }
}

var decryptData = (e) => {
    var preKey = new TextEncoder().encode(e.data.key)

    if(e.data.version == 1){
        var iv = preKey.slice(0, 16)

        nativeCrypto.subtle.importKey("raw", preKey, "AES-CBC", false, ["decrypt"]).then((genKey) => {
            var sliced = convertUint8ArrayToBinaryString(new Uint8Array(e.data.data.slice(0, 16)))

            if(sliced.indexOf("Salted") !== -1){
                var data = convertWordArrayToUint8Array(CryptoJS.AES.decrypt(base64ArrayBuffer(e.data.data), e.data.key))

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    uuid: e.data.uuid,
                    index: e.data.index,
                    data: data,
                    version: e.data.version
                })

                e = null
                preKey = null
                iv = null
                sliced = null
                data = null

                return true
            }
            else if(sliced.indexOf("U2FsdGVk") !== -1){
                var data = convertWordArrayToUint8Array(CryptoJS.AES.decrypt(convertUint8ArrayToBinaryString(new Uint8Array(e.data.data)), e.data.key))

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    uuid: e.data.uuid,
                    index: e.data.index,
                    data: data,
                    version: e.data.version
                })

                data = null
                e = null
                preKey = null
                iv = null
                sliced = null

                return true
            }
            else{
                nativeCrypto.subtle.decrypt({
                    name: "AES-CBC",
                    iv: iv
                }, genKey, e.data.data).then((decrypted) => {
                    var data = new Uint8Array(decrypted)

                    postMessage({
                        id: e.data.id,
                        type: e.data.type,
                        uuid: e.data.uuid,
                        index: e.data.index,
                        data: data,
                        version: e.data.version
                    })

                    data = null
                    e = null
                    preKey = null
                    iv = null
                    sliced = null

                    return true
                }).catch((err) => {
                    postMessage({
                        id: e.data.id,
                        type: e.data.type,
                        err: err.toString()
                    })

                    e = null
                    preKey = null
                    iv = null
                    sliced = null
                    err = null

                    return true
                })
            }
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            preKey = null
            err = null
            iv = null

            return true
        })
    }
    else if(e.data.version == 2){
        var iv = e.data.data.slice(0, 12)
        var encData = e.data.data.slice(12)

        nativeCrypto.subtle.importKey("raw", preKey, "AES-GCM", false, ["decrypt"]).then((genKey) => {
            nativeCrypto.subtle.decrypt({
                name: "AES-GCM",
                iv: iv
            }, genKey, encData).then((decrypted) => {
                var data = new Uint8Array(decrypted)

                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    uuid: e.data.uuid,
                    index: e.data.index,
                    data: data,
                    version: e.data.version
                })

                data = null
                e = null
                iv = null
                preKey = null
                encData = null

                return true
            }).catch((err) => {
                postMessage({
                    id: e.data.id,
                    type: e.data.type,
                    err: err.toString()
                })

                e = null
                iv = null
                preKey = null
                encData = null
                err = null

                return true
            })
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            e = null
            iv = null
            preKey = null
            encData = null
            err = null

            return true
        })
    }
}

const arrayBufferToBase64 = (e) => {
    var data = base64ArrayBuffer(e.data.data)

    postMessage({
        id: e.data.id,
        type: e.data.type,
        data: data
    })

    e = null
    data = null

    return true
}

const base64ToArrayBuffer = (e) => {
    var data = _base64ToArrayBuffer(e.data.data)

    postMessage({
        id: e.data.id,
        type: e.data.type,
        data: data
    })

    e = null
    data = null

    return true
}

const JSONParse = (e) => {
    try{
        var json = JSON.parse(e.data.data)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: json
        })

        e = null
        json = null
    }
    catch(e){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: e.toString()
        })

        e = null
    }

    return true
}

const JSONStringify = (e) => {
    try{
        var json = JSON.stringify(e.data.data)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: json
        })

        e = null
        json = null
    }
    catch(e){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: e.toString()
        })

        e = null
    }

    return true
}

const JSONStringifyLength = (e) => {
    try{
        var json = JSON.stringify(e.data.data).length

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: json
        })

        e = null
        json = null
    }
    catch(e){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: e.toString()
        })

        e = null
    }

    return true
}

const fetchWithTimeoutJSON = (e) => {
    return fetchWithTimeout(e.data.timeout, fetch(e.data.url, e.data.options)).then((response) => {
        return response.json().then((obj) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                data: obj
            })

            response = null
            e = null
            obj = null

            return true
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            err = null
            e = null
            response = null

            return true
        })
    }).catch((err) => {
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        err = null
        e = null

        return true
    })
}

const fetchWithTimeoutDownload = (e) => {
    return fetchWithTimeout(e.data.timeout, fetch(e.data.url, e.data.options)).then((response) => {
        if(response.status !== 200){
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: "http status not 200"
            })

            response = null
            e = null

            return true
        }

        return response.arrayBuffer().then((ab) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                data: ab
            })

            response = null
            ab = null
            e = null

            return true
        }).catch((err) => {
            postMessage({
                id: e.data.id,
                type: e.data.type,
                err: err.toString()
            })

            response = null
            err = null
            e = null

            return true
        })
    }).catch((err) => {
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        err = null
        e = null

        return true
    })
}

const fetchBlobWriter = (e) => {
    return fetchWithTimeout(e.data.timeout, fetch(e.data.url, e.data.options)).then((response) => {
        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: response.status
        })

        response = null
        e = null

        return true
    }).catch((err) => {
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        err = null
        e = null

        return true
    })
}

const newBlob = (e) => {
    try{
        var blob = new Blob([e.data.data], e.data.options)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: blob
        })

        e = null
        blob = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err
        })

        e = null

        return true
    }
}

const newFile = (e) => {
    try{
        var file = new File([e.data.data], e.data.options)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: file
        })

        e = null
        file = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err
        })

        e = null

        return true
    }
}

const getExifOrientation = (e) => {
    return getOrientation(e.data.file, (orientation) => {
        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: orientation
        })

        e = null
        orientation = null

        return true
    })
}

const createObjectURL = (e) => {
    try{
        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: (window.URL || window.webkitURL).createObjectURL(e.data.data)
        })

        e = null

        return true
    }
    catch(e){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: e.toString()
        })
    }
}

const revokeObjectURL = (e) => {
    try{
        (window.URL || window.webkitURL).revokeObjectURL(e.data.data)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: true
        })

        e = null

        return true
    }
    catch(e){
        return postMessage({
            id: e.data.id,
            type: e.data.type,
            err: e.toString()
        })
    }
}

const localforageRemoveItem = async (e) => {
    try{
        await localforage.removeItem(e.data.key)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: true
        })

        e = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }
}

const localforageSetItem = async (e) => {
    try{
        await localforage.setItem(e.data.key, e.data.data)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: true
        })

        e = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }
}

const localforageGetItem = async (e) => {
    try{
        let data = await localforage.getItem(e.data.key)

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: data
        })

        data = null
        e = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }
}

const clearLocalForageKeys = (e) => {
    localforage.iterate((value, key, iterationNumber) => {
        if(key.indexOf(e.data.term) !== -1){
            localforage.removeItem(key)
        }
    }).then(() => {
        return postMessage({
            id: e.data.id,
            type: e.data.type,
            data: true
        })
    }).catch((err) => {
        return postMessage({
            id: e.data.id,
            type: e.data.type,
            data: true
        })
    })
}

const md5Hash = (e) => {
    try{
        if(e.data.stringify){
            var data = CryptoJS.MD5(JSON.stringify(e.data.data)).toString()
        }
        else{
            var data = CryptoJS.MD5(e.data.data).toString()
        }

        postMessage({
            id: e.data.id,
            type: e.data.type,
            data: data
        })

        data = null
        e = null

        return true
    }
    catch(err){
        postMessage({
            id: e.data.id,
            type: e.data.type,
            err: err.toString()
        })

        e = null

        return true
    }
}

onmessage = (e) => {
    e.stopPropagation()
    e.preventDefault()

    switch(e.data.type){
        case "encryptMetadata":
            return encryptMetadata(e)
        break
        case "decryptMetadata":
            return decryptMetadata(e)
        break
        case "encryptData":
            return encryptData(e)
        break
        case "decryptData":
            return decryptData(e)
        break
        case "arrayBufferToBase64":
            return arrayBufferToBase64(e)
        break
        case "base64ToArrayBuffer":
            return base64ToArrayBuffer(e)
        break
        case "JSONParse":
            return JSONParse(e)
        break
        case "JSONStringify":
            return JSONStringify(e)
        break
        case "JSONStringifyLength":
            return JSONStringifyLength(e)
        break
        case "fetchWithTimeoutJSON":
            return fetchWithTimeoutJSON(e)
        break
        case "fetchWithTimeoutDownload":
            return fetchWithTimeoutDownload(e)
        break
        case "fetchBlobWriter":
            return fetchBlobWriter(e)
        break
        case "newBlob":
            return newBlob(e)
        break
        case "newFile":
            return newFile(e)
        break
        case "getExifOrientation":
            return getExifOrientation(e)
        break
        case "createObjectURL":
            return createObjectURL(e)
        break
        case "revokeObjectURL":
            return revokeObjectURL(e)
        break
        case "localforageRemoveItem":
            return localforageRemoveItem(e)
        break
        case "localforageSetItem":
            return localforageSetItem(e)
        break
        case "localforageGetItem":
            return localforageGetItem(e)
        break
        case "clearLocalForageKeys":
            return clearLocalForageKeys(e)
        break
        case "md5Hash":
            return md5Hash(e)
        break
    }

    e = null

    delete e

    return true
}