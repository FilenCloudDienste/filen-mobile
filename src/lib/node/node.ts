import nodejs from "nodejs-mobile-react-native"
import { DeviceEventEmitter } from "react-native"

nodejs.start("main.js")

const resolves: any = {}
const rejects: any = {}
let currentId: number = 0

declare global {
    var nodeThread: {
        ready: boolean,
        pingPong: (callback: (status: boolean) => boolean) => void,
        encryptData: (params: { base64: string, key: string }) => Promise<any>,
        decryptData: (params: { base64: string, key: string, version: number }) => Promise<any>,
        downloadAndDecryptChunk: (params: { url: string, timeout: number, key: string, version: number }) => Promise<any>,
        deriveKeyFromPassword: (params: { password: string, salt: string, iterations: number, hash: string, bitLength: number, returnHex: boolean }) => Promise<any>,
        encryptMetadata: (params: { data: string, key: string }) => Promise<any>,
        decryptMetadata: (params: { data: string, key: string }) => Promise<any>,
        encryptMetadataPublicKey: (params: { data: string, publicKey: string }) => Promise<any>,
        decryptMetadataPrivateKey: (params: { data: string, privateKey: string }) => Promise<any>,
        generateKeypair: () => Promise<any>,
        hashPassword: (params: { password: string }) => Promise<string>,
        hashFn: (params: { string: string }) => Promise<string>,
        apiRequest: (params: { method: string, url: string, timeout: number, data: any }) => Promise<any>,
        encryptAndUploadChunk: (params: { base64: string, key: string, url: string, timeout: number }) => Promise<any>,
        generateRandomString: (params: { charLength?: number }) => Promise<string>,
        uuidv4: () => Promise<string>,
        ping: () => Promise<any>,
        uploadAvatar: (params: { base64: string, url: string, timeout: number }) => Promise<any>,
        encryptAndUploadFileChunk: (params: { path: string, key: string, queryParams: string, chunkIndex: number, chunkSize: number }) => Promise<any>,
        getDataDir: () => Promise<string>,
        appendFileToFile: (params: { first: string, second: string }) => Promise<boolean>,
        downloadDecryptAndWriteFileChunk: (params: { destPath: string, uuid: string, region: string, bucket: string, index: number, key: string, version: number }) => Promise<string>,
        getFileHash: (params: { path: string, hashName: string }) => Promise<string>,
        convertHeic: (params: { input: string, output: string, format: "JPEG" | "PNG" }) => Promise<string>
    }
}

const isNodeInitialized = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if(global.nodeThread.ready){
            return resolve(true)
        }

        let interval = setInterval(() => {
            if(global.nodeThread.ready){
                clearInterval(interval)

                return resolve(true)
            }
        }, 10)
    })
}

global.nodeThread = {
    ready: false,
    pingPong: (callback) => {
        isNodeInitialized().then(() => {
            let dead = false

            const timeout = setTimeout(() => {
                dead = true

                return callback(true)
            }, 5000)
    
            global.nodeThread.ping().then(() => {
                clearTimeout(timeout)
    
                setTimeout(() => {
                    if(!dead){
                        global.nodeThread.pingPong(callback)
                    }
                }, 5000)
            }).catch((err) => {
                clearTimeout(timeout)
    
                console.log(err)

                dead = true
    
                return callback(true)
            })
        })
    },
	encryptData: ({ base64, key }) => {
		const id = currentId += 1

		return new Promise((resolve, reject) => {
            if(typeof base64 !== "string"){
                return resolve("")
            }

            if(base64.length == 0){
                return resolve("")
            }

			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "encryptData",
                    base64,
                    key
                })
            })
		})
	},
	decryptData: ({ base64, key, version }) => {
		const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "decryptData",
                    base64,
                    key,
                    version
                })
            })
		})
	},
    downloadAndDecryptChunk: ({ url, timeout, key, version }) => {
		const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "downloadAndDecryptChunk",
                    url,
                    timeout,
                    key,
                    version
                })
            })
		})
	},
    deriveKeyFromPassword: ({ password, salt, iterations, hash, bitLength, returnHex }) => {
		const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "deriveKeyFromPassword",
                    password,
                    salt,
                    iterations,
                    hash,
                    bitLength,
                    returnHex
                })
            })
		})
    },
    encryptMetadata: ({ data, key }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "encryptMetadata",
                    data,
                    key
                })
            })
		})
    },
    decryptMetadata: ({ data, key }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "decryptMetadata",
                    data,
                    key
                })
            })
		})
    },
    encryptMetadataPublicKey: ({ data, publicKey }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "encryptMetadataPublicKey",
                    data,
                    publicKey
                })
            })
		})
    },
    decryptMetadataPrivateKey: ({ data, privateKey }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "decryptMetadataPrivateKey",
                    data,
                    privateKey
                })
            })
		})
    },
    generateKeypair: () => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "generateKeypair"
                })
            })
		})
    },
    hashPassword: ({ password }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "hashPassword",
                    string: password
                })
            })
		})
    },
    hashFn: ({ string }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "hashFn",
                    string
                })
            })
		})
    },
    apiRequest: ({ method, url, timeout, data }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "apiRequest",
                    method,
                    url,
                    timeout,
                    data
                })
            })
		})
    },
    encryptAndUploadChunk: ({ base64, key, url, timeout }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "encryptAndUploadChunk",
                    base64,
                    key,
                    url,
                    timeout
                })
            })
		})
    },
    generateRandomString: ({ charLength = 32 }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "generateRandomString",
                    charLength
                })
            })
		})
    },
    uuidv4: () => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "uuidv4"
                })
            })
		})
    },
    ping: () => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "ping"
                })
            })
		})
    },
    uploadAvatar: ({ base64, url, timeout }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "uploadAvatar",
                    base64,
                    url,
                    timeout
                })
            })
		})
    },
    encryptAndUploadFileChunk: ({ path, key, queryParams, chunkIndex, chunkSize }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "encryptAndUploadFileChunk",
                    path,
                    key,
                    queryParams,
                    chunkIndex,
                    chunkSize
                })
            })
		})
    },
    getDataDir: () => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "getDataDir"
                })
            })
		})
    },
    appendFileToFile: ({ first, second }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "appendFileToFile",
                    first,
                    second
                })
            })
		})
    },
    downloadDecryptAndWriteFileChunk: ({ destPath, uuid, region, bucket, index, key, version }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "downloadDecryptAndWriteFileChunk",
                    destPath,
                    uuid,
                    region,
                    bucket,
                    index,
                    key,
                    version
                })
            })
		})
    },
    getFileHash: ({ path, hashName }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "getFileHash",
                    path,
                    hashName
                })
            })
		})
    },
    convertHeic: ({ input, output, format }) => {
        const id = currentId += 1

		return new Promise((resolve, reject) => {
			isNodeInitialized().then(() => {
                resolves[id] = resolve
                rejects[id] = reject

                return nodejs.channel.send({
                    id,
                    type: "convertHeic",
                    input,
                    output,
                    format
                })
            })
		})
    }
}

nodejs.channel.addListener("message", (message) => {
    if(message == "ready" && !global.nodeThread.ready){
        return global.nodeThread.ready = true
    }

    if(typeof message.type == "string"){
        if(message.type == "uploadProgress"){
            DeviceEventEmitter.emit("uploadProgress", message)

            return
        }
        else if(message.type == "downloadProgress"){
            DeviceEventEmitter.emit("downloadProgress", message)

            return
        }
    }
    
    const { id, err, response } = message
		
    if(err){
        const reject = rejects[id]

        if(typeof reject !== "undefined"){
            reject(err)
        }
    }
    else{
        const resolve = resolves[id]

        if(typeof resolve !== "undefined"){
            resolve(response)
        }
    }

    delete rejects[id]
    delete resolves[id]

    return true
})