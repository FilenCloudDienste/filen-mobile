import storage from "../storage"
import { convertTimestampToMs, unixTimestamp, arrayBufferToBase64 } from "../helpers"

export const deriveKeyFromPassword = async (password: string, salt: string, iterations: number = 200000, hash: string = "SHA-512", bitLength: number = 512, returnHex: boolean = true): Promise<any> => {
    return await global.nodeThread.deriveKeyFromPassword({
        password,
        salt,
        iterations,
        hash,
        bitLength,
        returnHex
    })
}

export const decryptMetadata = async (data: string, key: string): Promise<any> => {
	return await global.nodeThread.decryptMetadata({
        data,
        key
    })
}

export const encryptMetadata = async (data: string, key: string): Promise<any> => {
	return await global.nodeThread.encryptMetadata({
        data,
        key
    })
}

export const decryptFolderLinkKey = (masterKeys: string[], metadata: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        let link = ""
        let iterated = 0

        for(let i = 0; i < masterKeys.length; i++){
            decryptMetadata(metadata, masterKeys[i]).then((decrypted) => {
                if(typeof decrypted == "string"){
                    if(decrypted.length > 16){
                        link = decrypted
                    }
                }

                iterated += 1

                if(iterated >= masterKeys.length){
                    return resolve(link)
                }
            }).catch((err) => {
                iterated += 1
            })
        }
    })
}

export const decryptFileMetadataPrivateKey = (metadata: string, privateKey: string, uuid: string): Promise<{ name: string, size: number, mime: string, key: string, lastModified: number, hash: string }> => {
    return new Promise((resolve, reject) => {
        const cacheKey = "metadataCache:file:" + uuid + ":" + metadata
        let metadataCache: any = storage.getString(cacheKey) || "{}"

        if(typeof metadataCache == "string"){
            try{
                metadataCache = JSON.parse(metadataCache)

                if(typeof metadataCache.name == "string"){
                    if(metadataCache.name.length > 0){
                        return resolve({
                            name: metadataCache.name,
                            size: metadataCache.size,
                            mime: metadataCache.mime,
                            key: metadataCache.key,
                            lastModified: convertTimestampToMs(metadataCache.lastModified),
                            hash: typeof metadataCache.hash == "string" && metadataCache.hash.length > 0 ? metadataCache.hash : ""
                        })
                    }
                }
            }
            catch(e){
                console.log(e)
            }
        }

        let file = {
            name: "",
            size: 0,
            mime: "",
            key: "",
            lastModified: unixTimestamp(),
            hash: ""
        }

        global.nodeThread.decryptMetadataPrivateKey({
            data: metadata,
            privateKey
        }).then((decrypted) => {
            try{
                decrypted = JSON.parse(decrypted)

                if(typeof decrypted == "object"){
                    file = {
                        name: decrypted.name,
                        size: decrypted.size,
                        mime: decrypted.mime,
                        key: decrypted.key,
                        lastModified: convertTimestampToMs(decrypted.lastModified),
                        hash: typeof decrypted.hash == "string" && decrypted.hash.length > 0 ? decrypted.hash : ""
                    }
    
                    try{
                        storage.set(cacheKey, JSON.stringify(file))
                    }
                    catch(e){
                        console.log(e)
                    }
                }
            }
            catch(e){
                return resolve(file)
            }

            return resolve(file)
        }).catch((err) => {
            return resolve(file)
        })
    })
}

export const decryptFileMetadataLink = async (metadata: string, linkKey: string): Promise<any> => {
	const cacheKey = "metadataCache:decryptFileMetadataLink:" + metadata
    const cached = storage.getString(cacheKey)

	if(cached){
		if(cached.length > 0){
            try{
                const parsed = JSON.parse(cached)

                if(typeof parsed.name == "string"){
                    if(parsed.name.length > 0){
                        return parsed
                    }
                }
            }
            catch(e){
                //console.log8e
            }
        }
	}

	let fileName = ""
	let fileSize = 0
	let fileMime = ""
	let fileKey = ""
	let fileLastModified = 0

	try{
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if(obj && typeof obj == "object"){
			if(typeof obj.name == "string"){
				if(obj.name.length > 0){
					fileName = obj.name
					fileSize = parseInt(obj.size)
					fileMime = obj.mime
					fileKey = obj.key
					fileLastModified = parseInt(obj.lastModified)
				}
			}
		}
	}
	catch(e){
		console.error(e)
	}

	const obj = {
		name: fileName,
		size: fileSize,
		mime: fileMime,
		key: fileKey,
		lastModified: convertTimestampToMs(fileLastModified)
	}

	if(typeof obj.name == "string"){
		if(obj.name.length >= 1){
			storage.set(cacheKey, JSON.stringify(obj))
		}
	}

	return obj
}

export const decryptFolderNameLink = async (metadata: string, linkKey: string): Promise<string> => {
	if(metadata.toLowerCase() == "default"){
		return "Default"
	}

	const cacheKey = "metadataCache:decryptFolderNameLink:" + metadata
    const cached = storage.getString(cacheKey)

    if(cached){
        if(cached.length > 0){
            return cached
        }
    }

	let folderName = ""

	try{
		const obj = JSON.parse(await decryptMetadata(metadata, linkKey))

		if(obj && typeof obj == "object"){
			if(typeof obj.name == "string"){
				if(obj.name.length > 0){
					folderName = obj.name
				}
			}
		}
	}
	catch(e){
		console.error(e)
	}

	if(typeof folderName == "string"){
		if(folderName.length > 0){
			storage.set(cacheKey, folderName)
		}
	}

	return folderName
}

export const decryptFolderNamePrivateKey = (privateKey: string, metadata: string, uuid: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        const cacheKey = "metadataCache:folder:" + uuid + ":" + metadata
        let metadataCache: any = storage.getString(cacheKey)

        if(typeof metadataCache == "string"){
            try{
                metadataCache = JSON.parse(metadataCache)

                if(typeof metadataCache.name == "string"){
                    if(metadataCache.name.length > 0){
                        return resolve(metadataCache.name)
                    }
                }
            }
            catch(e){
                console.log(e)
            }
        }

        let name = ""

        global.nodeThread.decryptMetadataPrivateKey({
            data: metadata,
            privateKey
        }).then((decrypted) => {
            try{
                decrypted = JSON.parse(decrypted)

                if(typeof decrypted == "object"){
                    if(typeof decrypted.name == "string"){
                        if(decrypted.name.length > 0){
                            name = decrypted.name
                        }
                    }
                }
            }
            catch(e){
                //console.log(e)
            }

            if(typeof name == "string"){
                if(name.length > 0){
                    storage.set(cacheKey, JSON.stringify({
                        name
                    }))
                }
            }

            return resolve(name)
        }).catch((err) => {
            console.log(err)

            return resolve(name)
        })
    })
}

export const decryptFolderName = (masterKeys: string[], metadata: string, uuid: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        const cacheKey = "metadataCache:folder:" + uuid + ":" + metadata
        let metadataCache: any = storage.getString(cacheKey)

        if(typeof metadataCache == "string"){
            try{
                metadataCache = JSON.parse(metadataCache)

                if(typeof metadataCache.name == "string"){
                    if(metadataCache.name.length > 0){
                        return resolve(metadataCache.name)
                    }
                }
            }
            catch(e){
                console.log(e)
            }
        }

        let name = ""
        let iterated = 0

        for(let i = 0; i < masterKeys.length; i++){
            decryptMetadata(metadata, masterKeys[i]).then((decrypted) => {
                try{
                    decrypted = JSON.parse(decrypted)

                    if(typeof decrypted == "object"){
                        if(typeof decrypted.name == "string"){
                            if(decrypted.name.length > 0){
                                name = decrypted.name
                            }
                        }
                    }
                }
                catch(e){
                    //console.log(e)
                }

                iterated += 1

                if(iterated >= masterKeys.length){
                    if(typeof name == "string"){
                        if(name.length > 0){
                            storage.set(cacheKey, JSON.stringify({
                                name
                            }))
                        }
                    }

                    return resolve(name)
                }
            }).catch((err) => {
                iterated += 1
            })
        }
    })
}

export const decryptFileMetadata = (masterKeys: string[], metadata: string, uuid: string): Promise<{ name: string, size: number, mime: string, key: string, lastModified: number, hash: string }> => {
    return new Promise((resolve, reject) => {
        const cacheKey = "metadataCache:file:" + uuid + ":" + metadata
        let metadataCache: any = storage.getString(cacheKey)

        if(typeof metadataCache == "string"){
            try{
                metadataCache = JSON.parse(metadataCache)

                if(typeof metadataCache == "object"){
                    if(typeof metadataCache.name == "string"){
                        if(metadataCache.name.length > 0){
                            return resolve({
                                name: metadataCache.name,
                                size: metadataCache.size,
                                mime: metadataCache.mime,
                                key: metadataCache.key,
                                lastModified: convertTimestampToMs(metadataCache.lastModified),
                                hash: typeof metadataCache.hash == "string" && metadataCache.hash.length > 0 ? metadataCache.hash : ""
                            })
                        }
                    }
                }
            }
            catch(e){
                console.log(e)
            }
        }

        let file = {
            name: "",
            size: 0,
            mime: "",
            key: "",
            lastModified: Math.floor((+new Date()) / 1000),
            hash: ""
        }

        let iterated = 0

        for(let i = 0; i < masterKeys.length; i++){
            decryptMetadata(metadata, masterKeys[i]).then((decrypted) => {
                try{
                    decrypted = JSON.parse(decrypted)

                    if(typeof decrypted == "object"){
                        if(typeof decrypted.name == "string"){
                            if(decrypted.name.length > 0){
                                file = {
                                    name: decrypted.name,
                                    size: decrypted.size,
                                    mime: decrypted.mime,
                                    key: decrypted.key,
                                    lastModified: convertTimestampToMs(decrypted.lastModified),
                                    hash: typeof decrypted.hash == "string" && decrypted.hash.length > 0 ? decrypted.hash : ""
                                }
                            }
                        }
                    }
                }
                catch(e){
                    //console.log(e)
                }

                iterated += 1

                if(iterated >= masterKeys.length){
                    if(typeof file.name == "string"){
                        if(file.name.length > 0){
                            storage.set(cacheKey, JSON.stringify(file))
                        }
                    }

                    return resolve(file)
                }
            }).catch(() => {
                iterated += 1
            })
        }
    })
}

export const encryptData = (base64: string, key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if(typeof base64 !== "string"){
            return resolve("")
        }

        if(base64.length == 0){
            return resolve("")
        }

        global.nodeThread.encryptData({
            base64,
            key
        }).then(resolve).catch(reject)
    })
}

export const decryptData = (encrypted: ArrayBuffer, key: string, version: number): Promise<any> => {
    return new Promise((resolve, reject) => {
        global.nodeThread.decryptData({
            base64: arrayBufferToBase64(encrypted),
            key,
            version
        }).then(resolve).catch(reject)
    })
}