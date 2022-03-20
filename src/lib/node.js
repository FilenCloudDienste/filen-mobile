import nodejs from "nodejs-mobile-react-native"

nodejs.start("main.js")

const resolves = {}
const rejects = {}
let currentId = 0

const isNodeInitialized = () => {
    return new Promise((resolve) => {
        if(global.nodeThread.ready){
            return resolve()
        }

        let interval = setInterval(() => {
            if(global.nodeThread.ready){
                clearInterval(interval)

                return resolve()
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
    
                return setTimeout(() => {
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
}

nodejs.channel.addListener("message", (message) => {
    if(message == "ready" && !global.nodeThread.ready){
        return global.nodeThread.ready = true
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