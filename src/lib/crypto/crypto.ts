import { convertTimestampToMs, unixTimestamp, arrayBufferToBase64 } from "../helpers"
import * as db from "../db"

export interface FileMetadata {
    name: string,
    size: number,
    mime: string,
    key: string,
    lastModified: number,
    hash?: string
}

export const deriveKeyFromPassword = async (password: string, salt: string, iterations: number = 200000, hash: string = "SHA-512", bitLength: number = 512, returnHex: boolean = true): Promise<any> => {
    return global.nodeThread.deriveKeyFromPassword({
        password,
        salt,
        iterations,
        hash,
        bitLength,
        returnHex
    })
}

export const decryptMetadata = async (data: string, key: string): Promise<any> => {
	return global.nodeThread.decryptMetadata({
        data,
        key
    })
}

export const encryptMetadata = async (data: string, key: string): Promise<any> => {
	return global.nodeThread.encryptMetadata({
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

export const decryptFileMetadataPrivateKey = (metadata: string, privateKey: string, uuid: string): Promise<FileMetadata> => {
    return new Promise(async (resolve, reject) => {
        const key = "decryptFileMetadataPrivateKey:" + uuid + ":" + metadata
        const result = await db.get(key)

        if(result){
            return result
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
    
                    if(typeof file.name == "string" && file.name.length > 0){
                        db.set(key, file).catch(console.error)
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

export const decryptFileMetadataLink = async (metadata: string, linkKey: string): Promise<FileMetadata> => {
    const key = "decryptFileMetadataLink:" + metadata + ":" + linkKey
    const result = await db.get(key)

    if(result){
        return result
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
			db.set(key, obj).catch(console.error)
		}
	}

	return obj
}

export const decryptFolderNameLink = async (metadata: string, linkKey: string): Promise<string> => {
	if(metadata.toLowerCase() == "default"){
		return "Default"
	}

    const key = "decryptFolderNameLink:" + metadata + ":" + linkKey
    const result = await db.get<string>(key)

    if(result){
        return result
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
			db.set(key, folderName).catch(console.error)
		}
	}

	return folderName
}

export const decryptFolderNamePrivateKey = (privateKey: string, metadata: string, uuid: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        const key = "decryptFolderNamePrivateKey:" + uuid + ":" + metadata
        const result = await db.get<any>(key)

        if(result){
            return resolve(result.name)
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
                    db.set(key, { name }).catch(console.error)
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
    return new Promise(async (resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        const key = "decryptFolderName:" + uuid + ":" + metadata
        const result = await db.get(key)

        if(result){
            return resolve(result.name)
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
                            db.set(key, { name }).catch(console.error)
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

export const decryptFileMetadata = (masterKeys: string[], metadata: string, uuid: string): Promise<FileMetadata> => {
    return new Promise(async (resolve, reject) => {
        const key = "decryptFileMetadata:" + uuid + ":" + metadata
        const result = await db.get(key)

        if(result){
            return resolve(result)
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
                            db.set(key, file).catch(console.error)
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
    return global.nodeThread.decryptData({
        base64: arrayBufferToBase64(encrypted),
        key,
        version
    })
}