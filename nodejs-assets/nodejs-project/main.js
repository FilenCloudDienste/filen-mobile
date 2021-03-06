delete process.env['http_proxy']
delete process.env['HTTP_PROXY']
delete process.env['https_proxy']
delete process.env['HTTPS_PROXY']

process.env.NODE_ENV = "production"

process.on("uncaughtException", (err) => {
    console.log(err)
})

process.on("unhandledRejection", (err) => {
    console.log(err)
})

const rn_bridge = require("rn-bridge")
const crypto = require("crypto")
const CryptoJS = require("crypto-js")
const axios = require("axios")
const util = require("util")
const keyutil = require("js-crypto-key-utils")
const CryptoApi = require("crypto-api-v1")
const { uuid } = require("uuidv4")
const https = require("https")
const http = require("http")
const request = require("request")
const fs = require("fs")
const pathModule = require("path")
const { Readable } = require("stream")

const axiosClient = axios.create({
    timeout: 3600000,
    maxContentLength: (((1024 * 1024) * 1024) * 1024),
    maxBodyLength: (((1024 * 1024) * 1024) * 1024),
    httpsAgent: new https.Agent({
        keepAlive: true
    }),
    httpAgent: new http.Agent({
        keepAlive: true
    }),
    proxy: false,
    headers: {
        "User-Agent": "filen-mobile",
        "Connection": "keep-alive"
    }
}) 

const cachedDerivedKeys = {}
const cachedPemKeys = {}
let tasksRunning = 0

const convertArrayBufferToUtf8String = (buffer) => {
    return Buffer.from(buffer).toString("utf8")
}

const utf8StringToArrayBuffer = (string) => {
    return Buffer.from(string, "utf8")
}

const arrayBufferToBase64 = (buffer) => {
    return Buffer.from(buffer).toString("base64")
}

const base64ToArrayBuffer = (base64) => {
    return Buffer.from(base64, "base64")
}

const stringToHex = (string) => {
    return Buffer.from(string, "utf8").toString("hex")
}

const arrayBufferConcat = (buffer1, buffer2) => {
    return Buffer.concat([buffer1, buffer2])
}

const convertWordArrayToArrayBuffer = (wordArray) => {
    let arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : []
    let length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4
    let uInt8Array = new Uint8Array(length), index=0, word, i

    for(i = 0; i < length; i++){
        word = arrayOfWords[i]

        uInt8Array[index++] = word >> 24
        uInt8Array[index++] = (word >> 16) & 0xff
        uInt8Array[index++] = (word >> 8) & 0xff
        uInt8Array[index++] = word & 0xff
    }

    return uInt8Array
}

const convertUint8ArrayToBinaryString = (u8Array) => {
    let i, len = u8Array.length, b_str = ""

    for (i = 0; i < len; i++){
        b_str += String.fromCharCode(u8Array[i])
    }

    return b_str
}

const randomString = (length) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const charsLength = chars.length
    const randomBytes = crypto.randomBytes(length)
    let result = new Array(length)
    let cursor = 0

    for(let i = 0; i < length; i++){
        cursor += randomBytes[i]
        result[i] = chars[cursor % charsLength]
    }
  
    return result.join("")
}

const encryptData = (data, key, convertToBase64 = true, isBase64 = true) => {
    return new Promise((resolve, reject) => {
        let buffer = data

        if(isBase64){
            buffer = base64ToArrayBuffer(data)
        }

        try{
            const iv = randomString(12)
            const cipher = crypto.createCipheriv("aes-256-gcm", utf8StringToArrayBuffer(key), utf8StringToArrayBuffer(iv))
            const encrypted = arrayBufferConcat(cipher.update(buffer), cipher.final())
            const authTag = cipher.getAuthTag()
            const ciphertext = arrayBufferConcat(encrypted, authTag)

            if(!convertToBase64){
                return resolve(arrayBufferConcat(utf8StringToArrayBuffer(iv), ciphertext))
            }

            return resolve(arrayBufferToBase64(arrayBufferConcat(utf8StringToArrayBuffer(iv), ciphertext)))
        }
        catch(e){
            return reject(e)
        }
    })
}

const decryptData = (data, key, version, returnBase64 = true, isBase64 = true) => {
    return new Promise((resolve, reject) => {
        let encrypted = data

        if(isBase64){
            encrypted = base64ToArrayBuffer(data)
        }

        if(version == 1){ //old & deprecated, not in use anymore, just here for backwards compatibility
            const sliced = convertArrayBufferToUtf8String(new Uint8Array(encrypted).slice(0, 16)) + "_" + arrayBufferToBase64(new Uint8Array(encrypted).slice(0, 16))

            if(sliced.indexOf("Salted") !== -1){
                try{
                    if(returnBase64){

                    }
                    else{
                        return resolve(convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(encrypted, key)))
                    }
                }
                catch(e){
                    return reject(e)
                }
            }
            else if(sliced.indexOf("U2FsdGVk") !== -1){
                try{
                    if(returnBase64){
                        return resolve(arrayBufferToBase64(convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(convertArrayBufferToUtf8String(new Uint8Array(encrypted)), key))))
                    }
                    else{
                        return resolve(convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(convertArrayBufferToUtf8String(new Uint8Array(encrypted)), key)))
                    }
                }
                catch(e){
                    return reject(e)
                }
            }
            else{
                try{
                    const decipher = crypto.createDecipheriv("aes-256-cbc", utf8StringToArrayBuffer(key), utf8StringToArrayBuffer(key).slice(0, 16))
                    const decrypted = arrayBufferConcat(decipher.update(encrypted), decipher.final())

                    if(returnBase64){
                        return resolve(arrayBufferToBase64(decrypted))
                    }
                    else{
                        return resolve(decrypted)
                    }
                }
                catch(e){
                    return reject(e)
                }
            }
        }
        else if(version == 2){
            try{
                const iv = encrypted.slice(0, 12)
                const encData = encrypted.slice(12)
                const authTag = encData.slice(encData.byteLength - ((128 + 7) >> 3))
                const ciphertext = encData.slice(0, (encData.byteLength - authTag.byteLength))

                const decipher = crypto.createDecipheriv("aes-256-gcm", utf8StringToArrayBuffer(key), utf8StringToArrayBuffer(iv))

                decipher.setAuthTag(authTag)

                if(returnBase64){
                    return resolve(arrayBufferToBase64(arrayBufferConcat(decipher.update(ciphertext), decipher.final())))
                }
                else{
                    return resolve(arrayBufferConcat(decipher.update(ciphertext), decipher.final()))
                }
            }
            catch(e){
                return reject(e)
            }
        }
        else{
            return reject("Invalid version: " + version)
        }
    })
}

const downloadAndDecryptChunk = (url, timeout, key, version) => {
    return new Promise((resolve, reject) => {
        axiosClient.get(url, {
            responseType: "arraybuffer",
            timeout,
            headers: {
                "User-Agent": "filen-mobile"
            }
        }).then((response) => {
            if(response.status !== 200){
                return reject("Response status: " + response.status)
            }

            try{
                var dataBuffer = Buffer.from(response.data, "binary").toString("base64")
            }
            catch(e){
                return reject(e)
            }

            if(typeof dataBuffer.length == "undefined"){
                return reject("Undefined base64 length")
            }

            if(dataBuffer.length <= 0){
                return reject("Undefined base64 length")
            }

            decryptData(dataBuffer, key, version).then(resolve).catch(reject)
        }).catch(reject)
    })
}

const deriveKeyFromPassword = (password, salt, iterations, hash, bitLength, returnHex) => {
    if(hash == "SHA-512"){
        hash = "SHA512"
    }

    bitLength = (bitLength / 8)

    const cacheKey = password + ":" + salt + ":" + iterations + ":" + hash + ":" + bitLength + ":" + returnHex.toString()

    return new Promise((resolve, reject) => {
        if(typeof cachedDerivedKeys[cacheKey] !== "undefined"){
            return resolve(cachedDerivedKeys[cacheKey])
        }

        crypto.pbkdf2(password, salt, iterations, bitLength, hash, (err, res) => {
            if(err){
                return reject(err)
            }

            if(returnHex){
                const key = Buffer.from(res).toString("hex")

                cachedDerivedKeys[cacheKey] = key

                return resolve(key)
            }

            cachedDerivedKeys[cacheKey] = res

            return resolve(res)
        })
    })
}

const encryptMetadata = (data, key) => {
    return new Promise((resolve, reject) => {
        deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false).then((derivedKey) => {
            try{
                const iv = randomString(12)
                const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, utf8StringToArrayBuffer(iv))
                const encrypted = arrayBufferConcat(cipher.update(data), cipher.final())
                const authTag = cipher.getAuthTag()
                const ciphertext = arrayBufferConcat(encrypted, authTag)
    
                return resolve("002" + iv + arrayBufferToBase64(ciphertext))
            }
            catch(e){
                return reject(e)
            }
        }).catch(reject)
    })
}

const decryptMetadata = (data, key) => {
	return new Promise((resolve, reject) => {
        const sliced = data.slice(0, 16)

        if(sliced.indexOf("U2FsdGVk") !== -1){
            try{
                return resolve(CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8))
            }
            catch(e){
                return resolve("")
            }
        }
        else{
            const version = sliced.slice(0, 3)

            if(version == "002"){
                deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false).then((derivedKey) => {
                    try{
                        const iv = data.slice(3, 15)
                        const encData = base64ToArrayBuffer(data.slice(15))
                        const authTag = encData.slice(encData.byteLength - ((128 + 7) >> 3))
                        const ciphertext = encData.slice(0, (encData.byteLength - authTag.byteLength))
        
                        const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, utf8StringToArrayBuffer(iv))
        
                        decipher.setAuthTag(authTag)

                        const decrypted = arrayBufferConcat(decipher.update(ciphertext), decipher.final())
        
                        return resolve(new util.TextDecoder().decode(decrypted))
                    }
                    catch(e){
                        return resolve("3")
                    }
                }).catch(() => {
                    return resolve("2")
                })
            }
            else{
                return resolve("1")
            }
        }
    })
}

const derKeyToPem = (key) => {
    return new Promise((resolve, reject) => {
        if(typeof cachedPemKeys[key] !== "undefined"){
            return resolve(cachedPemKeys[key])
        }

        const keyObj = new keyutil.Key("der", base64ToArrayBuffer(key))

        keyObj.export("pem").then((pemKey) => {
            cachedPemKeys[key] = pemKey

            return resolve(pemKey)
        }).catch(reject)
    })
}

const encryptMetadataPublicKey = async (data, publicKey) => {
    return new Promise(async (resolve, reject) => {
        derKeyToPem(publicKey).then((key) => {
            try{
                const encrypted = crypto.publicEncrypt({
                    key,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha512"
                }, Buffer.from(data))
        
                return resolve(arrayBufferToBase64(encrypted))
            }
            catch(e){
                return reject(e)
            }
        }).catch(reject)
    })
}

const decryptMetadataPrivateKey = (data, privateKey) => {
    return new Promise(async (resolve, reject) => {
        derKeyToPem(privateKey).then((key) => {
            try{
                const decrypted = crypto.privateDecrypt({
                    key,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha512"
                }, base64ToArrayBuffer(data))
        
                return resolve(decrypted.toString())
            }
            catch(e){
                return reject(e)
            }
        }).catch(reject)
    })
}

const generateKeypair = () => {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair("rsa", {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: "spki",
                format: "der"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "der"
            },
            hashAlgorithm: "SHA512",
            publicExponent: 0x10001
        }, (err, publicKey, privateKey) => {
            if(err){
                return reject(err)
            }

            return resolve({
                publicKey: arrayBufferToBase64(publicKey),
                privateKey: arrayBufferToBase64(privateKey)
            })
        })
    })
}

const hashPassword = (password) => { //old & deprecated, not in use anymore, just here for backwards compatibility
    return CryptoApi.hash("sha512", CryptoApi.hash("sha384", CryptoApi.hash("sha256", CryptoApi.hash("sha1", password)))) + CryptoApi.hash("sha512", CryptoApi.hash("md5", CryptoApi.hash("md4", CryptoApi.hash("md2", (password)))))
}

const hashFn = (val) => {
    return CryptoApi.hash("sha1", CryptoApi.hash("sha512", val))
}

const apiRequest = (method, url, timeout, data) => {
    return new Promise((resolve, reject) => {
        if(method == "POST"){
            request({
                method: method.toUpperCase(),
                url,
                timeout,
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "filen-mobile"
                },
                agent: new https.Agent({
                    keepAlive: true,
                    timeout: 86400000
                }),
                body: JSON.stringify(data)
            }, (err, response, body) => {
                if(err){
                    return reject(err)
                }

                if(response.statusCode !== 200){
                    return reject("Response status: " + response.status)
                }

                try{
                    return resolve(JSON.parse(body))
                }
                catch(e){
                    return reject(e)
                }
            })
        }
        else{
            return reject("Invalid method: " + method)
        }
    })
}

const encryptAndUploadChunk = (base64, key, url, timeout) => {
    return new Promise((resolve, reject) => {
        encryptData(base64, key, false).then((encrypted) => {
            axiosClient({
                method: "post",
                url,
                data: encrypted,
                timeout,
                headers: {
                    "User-Agent": "filen-mobile"
                }
            }).then((res) => {
                if(res.status !== 200){
                    return reject("Response status: " + response.status)
                }

                try{
                    return resolve(res.data)
                }
                catch(e){
                    return reject(e)
                }
            }).catch(reject)
        }).catch(reject)
    })
}

const uploadAvatar = (base64, url, timeout) => {
    return new Promise((resolve, reject) => {
        try{
            var data = convertUint8ArrayToBinaryString(base64ToArrayBuffer(base64))
        }
        catch(e){
            return reject(e)
        }
    
        axiosClient({
            method: "post",
            url,
            data,
            timeout,
            headers: {
                "User-Agent": "filen-mobile"
            }
        }).then((res) => {
            if(res.status !== 200){
                return reject("Response status: " + response.status)
            }

            try{
                return resolve(res.data)
            }
            catch(e){
                return reject(e)
            }
        }).catch(reject)
    })
}

const readChunk = (path, offset, length) => {
    return new Promise((resolve, reject) => {
        path = pathModule.normalize(path)

        fs.open(path, "r", (err, fd) => {
            if(err){
                return reject(err)
            }

            const buffer = Buffer.alloc(length)

            fs.read(fd, buffer, 0, length, offset, (err, read) => {
                if(err){
                    return reject(err)
                }

                let data = undefined

                if(read < length){
                    data = buffer.slice(0, read)
                }
                else{
                    data = buffer
                }

                fs.close(fd, (err) => {
                    if(err){
                        return reject(err)
                    }

                    return resolve(data)
                })
            })
        })
    })
}

const encryptAndUploadChunkBuffer = (buffer, key, queryParams) => {
    return new Promise((resolve, reject) => {
        encryptData(buffer, key, false, false).then((encrypted) => {
            let lastBytes = 0
            let totalBytes = 0
            const urlParams = new URLSearchParams(queryParams)
            const uuid = urlParams.get("uuid") || ""

            const calcProgress = (written) => {
                let bytes = written

                if(lastBytes == 0){
                    lastBytes = written
                }
                else{
                    bytes = Math.floor(written - lastBytes)
                    lastBytes = written
                }

                totalBytes += bytes

                rn_bridge.channel.send({
                    type: "uploadProgress",
                    status: "progress",
                    data: {
                        uuid,
                        bytes: bytes
                    }
                })
            }

            const req = request({
                url: "https://up.filen.io/v2/upload?" + queryParams,
                method: "POST",
                agent: new https.Agent({
                    keepAlive: true,
                    timeout: 86400000
                }),
                timeout: 86400000,
                headers: {
                    "User-Agent": "filen-mobile"
                }
            }, (err, response, body) => {
                if(err){
                    return reject(err)
                }

                calcProgress(req.req.connection.bytesWritten)

                if(response.statusCode !== 200){
                    if((-totalBytes) < 0){
                        rn_bridge.channel.send({
                            type: "uploadProgress",
                            status: "progress",
                            data: {
                                uuid,
                                bytes: -totalBytes
                            }
                        })
                    }

                    totalBytes = 0
                    
                    return reject("Upload failed, status code: " + response.statusCode)
                }

                try{
                    var res = JSON.parse(body)
                }
                catch(e){
                    return reject(e)
                }

                if(!res.status){
                    if((-totalBytes) < 0){
                        rn_bridge.channel.send({
                            type: "uploadProgress",
                            status: "progress",
                            data: {
                                uuid,
                                bytes: -totalBytes
                            }
                        })
                    }

                    totalBytes = 0
                }

                return resolve(res)
            }).on("drain", () => calcProgress(req.req.connection.bytesWritten))

            Readable.from([encrypted]).pipe(req)
        }).catch(reject)
    })
}

const normalizeRNFilePath = (path) => {
    if(path.startsWith("file://")){
        return path.replace("file://", "")
    }

    return path
}

const encryptAndUploadFileChunk = (path, key, queryParams, chunkIndex, chunkSize) => {
    return new Promise((resolve, reject) => {
        path = pathModule.normalize(normalizeRNFilePath(path))

        readChunk(path, (chunkIndex * chunkSize), chunkSize).then((buffer) => {
            const maxTries = 1024
            let currentTries = 0
            const triesTimeout = 1000

            const doUpload = () => {
                if(currentTries >= maxTries){
                    return reject("max tries reached for upload, returning")
                }

                currentTries += 1

                encryptAndUploadChunkBuffer(buffer, key, queryParams).then(resolve).catch((err) => {
                    console.log(err)

                    return setTimeout(doUpload, triesTimeout)
                })
            }

            doUpload()
        }).catch(reject)
    })
}

const downloadFileChunk = (uuid, region, bucket, index) => {
    return new Promise((resolve, reject) => {
        let totalBytes = 0

        const request = https.request({
            host: "down.filen.io",
            port: 443,
            path: "/" + region + "/" + bucket + "/" + uuid + "/" + index,
            method: "GET",
            agent: new https.Agent({
                keepAlive: true,
                timeout: 86400000
            }),
            timeout: 86400000,
            headers: {
                "User-Agent": "filen-mobile"
            }
        })

        request.on("response", (response) => {
            if(response.statusCode !== 200){
                return reject(new Error("Invalid http statuscode: " + response.statusCode))
            }

            let res = []

            response.on("error", (err) => {
                if((-totalBytes) < 0){
                    rn_bridge.channel.send({
                        type: "downloadProgress",
                        status: "progress",
                        data: {
                            uuid,
                            bytes: -totalBytes
                        }
                    })
                }

                return reject(err)
            })

            response.on("data", (chunk) => {
                if(res == null){
                    return false
                }

                res.push(chunk)

                totalBytes += chunk.length

                rn_bridge.channel.send({
                    type: "downloadProgress",
                    status: "progress",
                    data: {
                        uuid,
                        bytes: chunk.length
                    }
                })
            }).on("end", () => {
                return resolve(Buffer.concat(res))
            }).on("error", (err) => {
                if((-totalBytes) < 0){
                    rn_bridge.channel.send({
                        type: "downloadProgress",
                        status: "progress",
                        data: {
                            uuid,
                            bytes: -totalBytes
                        }
                    })
                }

                return reject(err)
            })
        })

        request.on("timeout", () => {
            if((-totalBytes) < 0){
                rn_bridge.channel.send({
                    type: "downloadProgress",
                    status: "progress",
                    data: {
                        uuid,
                        bytes: -totalBytes
                    }
                })
            }

            return reject(new Error("Request timed out"))
        })

        request.on("error", (err) => {
            if((-totalBytes) < 0){
                rn_bridge.channel.send({
                    type: "downloadProgress",
                    status: "progress",
                    data: {
                        uuid,
                        bytes: -totalBytes
                    }
                })
            }

            return reject(err)
        })

        request.end()
    })
}

const downloadDecryptAndWriteFileChunk = (destPath, uuid, region, bucket, index, key, version) => {
    return new Promise((resolve, reject) => {
        destPath = pathModule.normalize(destPath)

        const maxTries = 1024
        let currentTries = 0
        const triesTimeout = 1000

        const doDownload = () => {
            if(currentTries >= maxTries){
                return fs.unlink(destPath, () => {
                    return reject("max tries reached for download, returning")
                })
            }

            currentTries += 1

            downloadFileChunk(uuid, region, bucket, index).then((buffer) => {
                decryptData(buffer, key, version, false, false).then(async (decrypted) => {
                    await new Promise((resolve) => fs.unlink(destPath, () => resolve()))
    
                    const stream = fs.createWriteStream(destPath, {
                        flags: "w"
                    })
    
                    stream.on("close", () => resolve(destPath))
    
                    stream.on("error", (err) => {
                        console.log(err)

                        return setTimeout(doDownload, triesTimeout)
                    })
    
                    Readable.from([decrypted]).pipe(stream)
                }).catch((err) => {
                    console.log(err)

                    return setTimeout(doDownload, triesTimeout)
                })
            }).catch((err) => {
                console.log(err)

                return setTimeout(doDownload, triesTimeout)
            })
        }

        doDownload()
    })
}

const appendFileToFile = (first, second) => {
    return new Promise((resolve, reject) => {
        first = pathModule.normalize(first)
        second = pathModule.normalize(second)

        Promise.all([
            new Promise((resolve, reject) => {
                fs.access(first, (err) => {
                    if(err){
                        return reject(err)
                    }

                    return resolve(true)
                })
            }),
            new Promise((resolve, reject) => {
                fs.access(second, (err) => {
                    if(err){
                        return reject(err)
                    }

                    return resolve(true)
                })
            })
        ]).then(() => {
            const w = fs.createWriteStream(first, {
                flags: "a"
            })

            const r = fs.createReadStream(second)

            w.on("close", () => resolve(true))
            w.on("error", (err) => reject(err))
            r.on("error", (err) => reject(err))

            r.pipe(w)
        }).catch(reject)
    })
}

/*rn_bridge.app.on("pause", (pauseLock) => {
    new Promise((resolve, _) => {
        const wait = setInterval(() => {
            if(tasksRunning <= 0){
                clearInterval(wait)
    
                return resolve()
            }
        }, 100)
    }).then(() => {
        pauseLock.release()
    })
})*/

rn_bridge.channel.on("message", (message) => {
    tasksRunning += 1

    const request = message

    if(request.type == "encryptData"){
        encryptData(request.base64, request.key).then((encrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: encrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "decryptData"){
        decryptData(request.base64, request.key, request.version).then((decrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: decrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "downloadAndDecryptChunk"){
        downloadAndDecryptChunk(request.url, request.timeout, request.key, request.version).then((decrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: decrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "deriveKeyFromPassword"){
        deriveKeyFromPassword(request.password, request.salt, request.iterations, request.hash, request.bitLength, request.returnHex).then((key) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: key
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "encryptMetadata"){
        encryptMetadata(request.data, request.key).then((encrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: encrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "decryptMetadata"){
        decryptMetadata(request.data, request.key).then((decrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: decrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "encryptMetadataPublicKey"){
        encryptMetadataPublicKey(request.data, request.publicKey).then((encrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: encrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "decryptMetadataPrivateKey"){
        decryptMetadataPrivateKey(request.data, request.privateKey).then((decrypted) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: decrypted
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "generateKeypair"){
        generateKeypair().then((keyPair) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: keyPair
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "hashPassword"){
        try{
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: hashPassword(request.string)
            })

            tasksRunning -= 1
        }
        catch(e){
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: e.toString()
            })

            tasksRunning -= 1
        }
    }
    else if(request.type == "hashFn"){
        try{
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: hashFn(request.string)
            })

            tasksRunning -= 1
        }
        catch(e){
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: e.toString()
            })

            tasksRunning -= 1
        }
    }
    else if(request.type == "apiRequest"){
        apiRequest(request.method, request.url, request.timeout, request.data).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "encryptAndUploadChunk"){
        encryptAndUploadChunk(request.base64, request.key, request.url, request.timeout).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "generateRandomString"){
        try{
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: randomString(request.charLength)
            })

            tasksRunning -= 1
        }
        catch(e){
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: e.toString()
            })

            tasksRunning -= 1
        }
    }
    else if(request.type == "uuidv4"){
        try{
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: uuid()
            })

            tasksRunning -= 1
        }
        catch(e){
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: e.toString()
            })

            tasksRunning -= 1
        }
    }
    else if(request.type == "ping"){
        rn_bridge.channel.send({
            id: request.id,
            type: request.type,
            response: "pong"
        })

        tasksRunning -= 1
    }
    else if(request.type == "uploadAvatar"){
        uploadAvatar(request.base64, request.url, request.timeout).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "encryptAndUploadFileChunk"){
        encryptAndUploadFileChunk(request.path, request.key, request.queryParams, request.chunkIndex, request.chunkSize).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "getDataDir"){
        try{
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: rn_bridge.app.datadir()
            })
        }
        catch(e){
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: e.toString()
            })
        }
    }
    else if(request.type == "appendFileToFile"){
        appendFileToFile(request.first, request.second).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else if(request.type == "downloadDecryptAndWriteFileChunk"){
        downloadDecryptAndWriteFileChunk(request.destPath, request.uuid, request.region, request.bucket, request.index, request.key, request.version).then((res) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                response: res
            })

            tasksRunning -= 1
        }).catch((err) => {
            rn_bridge.channel.send({
                id: request.id,
                type: request.type,
                err: err.toString()
            })

            tasksRunning -= 1
        })
    }
    else{
        rn_bridge.channel.send({
            id: request.id,
            type: request.type,
            err: "Invalid request type: " + request.type
        })

        tasksRunning -= 1
    }

    return true
})

rn_bridge.channel.send("ready")