import { Capacitor, Plugins } from "@capacitor/core";

const CryptoJS = require("crypto-js")
const striptags = require("striptags")

export function sanitizeHTML(html){
    return striptags(html)
}

export function getRandomArbitrary(min, max){
    return Math.floor(Math.random() * (max - min) + min)
}

export function formatBytes(bytes, decimals = 2){
    if(bytes === 0) return "0 Bytes"

    let k = 1024
    let dm = decimals < 0 ? 0 : decimals
    let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export function uuidv4(){ // Public Domain/MIT
    let d = new Date().getTime();//Timestamp
    let d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function generateRandomString(length = 32){
    let result = ""
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result
}

export function generateRandomClassName(length = 16){
    let result = ""
    let characters = "abcdefghijklmnopqrstuvwxyz"

    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result + "-" + result
}

export function getAPIServer(){
    let servers = [
        "https://api.filen.io",
        "https://api.filen-1.xyz",
        "https://api.filen-2.xyz",
        "https://api.filen-3.xyz",
        "https://api.filen-4.xyz",
        "https://api.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function fetchWithTimeout(ms, promise) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            return reject(new Error("Request timeout after " + ms + "ms"))
        }, ms)

        promise.then((value) => {
            clearTimeout(timer)
            
            return resolve(value)
        }).catch((err) => {
            clearTimeout(timer)

            return reject(err)
        })
    })
}

export function backgroundAPIRequest(method, endpoint, data = {}){
    let cacheKey = method + endpoint

    fetchWithTimeout(60000, fetch(getAPIServer() + endpoint, {
        method: method.toUpperCase(),
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })).then((response) => {
        response.json().then((obj) => {
            window.customVariables.cachedAPIItemListRequests[cacheKey] = obj

            return window.customFunctions.saveAPICache()
        }).catch((err) => {
            console.log(err)
        })
    }).catch((err) => {
        console.log(err)
    })
}

export function apiRequest(method, endpoint, data = {}){
    return new Promise((resolve, reject) => {
        let cacheKey = method + endpoint
        
        /*let useFastCache = false

        if(method.toUpperCase() == "POST"){
            if(endpoint == "/v1/dir/content"
            || endpoint == "/v1/user/shared/in"
            || endpoint == "/v1/user/shared/out"){
                useFastCache = true
            }
        }

        if(useFastCache){
            if(typeof window.customVariables.cachedAPIItemListRequests[cacheKey] !== "undefined"){
                try{
                    let obj = JSON.parse(window.customVariables.cachedAPIItemListRequests[cacheKey])

                    delete window.customVariables.cachedAPIItemListRequests[cacheKey]

                    backgroundAPIRequest(method, endpoint, data)

                    return obj
                }
                catch(e){
                    console.log(e)
                }
            }
        }*/

        if(Capacitor.isNative){
            if(Plugins.Network.getStatus() == "none"){
                if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
                    return resolve(window.customVariables.apiCache[cacheKey])
                }
            }
        }

        fetchWithTimeout(60000, fetch(getAPIServer() + endpoint, {
            method: method.toUpperCase(),
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })).then((response) => {
            response.json().then((obj) => {
                if(endpoint == "/v1/dir/content"
                || endpoint == "/v1/user/baseFolders"
                || endpoint == "/v1/user/shared/in"
                || endpoint == "/v1/user/shared/out"
                || endpoint == "/v1/user/keyPair/info"){
                    window.customVariables.apiCache[cacheKey] = obj

                    window.customFunctions.saveAPICache()
                }

                return resolve(obj)
            }).catch((err) => {
                console.log(err)

                if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
                    return resolve(window.customVariables.apiCache[cacheKey])
                }

                return reject(err)
            })
        }).catch((err) => {
            console.log(err)

            if(typeof window.customVariables.apiCache[cacheKey] !== "undefined"){
                return resolve(window.customVariables.apiCache[cacheKey])
            }

            return reject(err)
        })
    })
}

export function getDownloadServer(){
    let servers = [
        "https://down.filen-1.xyz",
        "https://down.filen-2.xyz",
        "https://down.filen-3.xyz",
        "https://down.filen-4.xyz",
        "https://down.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function getUploadServer(){
    let servers = [
        "https://up.filen-1.xyz",
        "https://up.filen-2.xyz",
        "https://up.filen-3.xyz",
        "https://up.filen-4.xyz",
        "https://up.filen-5.xyz"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export function hashFn(val){
    return CryptoJS.SHA1(CryptoJS.SHA512(val).toString()).toString()
}

export function cryptoJSEncrypt(val, key){
    return CryptoJS.AES.encrypt(val, key).toString()
}

export function cryptoJSDecrypt(val, key){
    return CryptoJS.AES.decrypt(val, key).toString(CryptoJS.enc.Utf8)
}

export function unixTimestamp(){
    return Math.floor((+new Date()) / 1000)
}

export function decryptCryptoJSFolderName(str, userMasterKeys, uuid = undefined){
    let cacheKey = "folder_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        return window.customVariables.cachedMetadata[cacheKey].name
    }

    let folderName = "CON_NO_DECRYPT_POSSIBLE_NO_NAME_FOUND_FOR_FOLDER"

    userMasterKeys = userMasterKeys.reverse()

    let obj = undefined

    userMasterKeys.forEach((key) => {
        try{
            obj = JSON.parse(CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8))

            if(obj && typeof obj == "object"){
                folderName = obj.name
            }
        }
        catch(e){
            return
        }
    })

    if(folderName !== "CON_NO_DECRYPT_POSSIBLE_NO_NAME_FOUND_FOR_FOLDER"){
        window.customVariables.cachedMetadata[cacheKey] = {
            name: folderName
        }
    }

    return folderName
}

export async function decryptFolderNamePrivateKey(str, usrPrivKey, uuid = undefined){
    let cacheKey = "folder_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        return window.customVariables.cachedMetadata[cacheKey].name
    }

    let folderName = "CON_NO_DECRYPT_POSSIBLE_NO_NAME_FOUND_FOR_FOLDER"

    try{
        let decrypted = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, usrPrivKey, _base64ToArrayBuffer(str))

        decrypted = JSON.parse(new TextDecoder().decode(decrypted))

        if(decrypted && typeof decrypted == "object"){
            folderName = decrypted.name
        }
    }
    catch(e){
        console.log(e)
    }

    if(folderName !== "CON_NO_DECRYPT_POSSIBLE_NO_NAME_FOUND_FOR_FOLDER"){
        window.customVariables.cachedMetadata[cacheKey] = {
            name: folderName
        }
    }

    return folderName
}

export function decryptFileMetadata(metadata, userMasterKeys, uuid = undefined){
    let cacheKey = "file_" + uuid + "_" + metadata

    if(window.customVariables.cachedMetadata[cacheKey]){
        let file = window.customVariables.cachedMetadata[cacheKey]

        return {
            name: file.name,
            size: file.size,
            mime: file.mime,
            key: file.key
        }
    }

    let fileName = ""
    let fileSize = 0
    let fileMime = ""
    let fileKey = ""

    userMasterKeys = userMasterKeys.reverse()

    userMasterKeys.forEach((key) => {
        try{
            let obj = JSON.parse(CryptoJS.AES.decrypt(metadata, key).toString(CryptoJS.enc.Utf8))

            if(obj && typeof obj == "object"){
                fileName = obj.name
                fileSize = parseInt(obj.size)
                fileMime = obj.mime
                fileKey = obj.key
            }
        }
        catch(e){
            return
        }
    })

    let obj = {
        name: fileName,
        size: fileSize,
        mime: fileMime,
        key: fileKey
    }

    if(obj.name.length >= 1){
        window.customVariables.cachedMetadata[cacheKey] = obj
    }

    return obj
}

export async function decryptFileMetadataPrivateKey(str, usrPrivKey, uuid = undefined){
    let cacheKey = "file_" + uuid + "_" + str

    if(window.customVariables.cachedMetadata[cacheKey]){
        let file = window.customVariables.cachedMetadata[cacheKey]

        return {
            name: file.name,
            size: file.size,
            mime: file.mime,
            key: file.key
        }
    }

    let fileName = ""
    let fileSize = 0
    let fileMime = ""
    let fileKey = ""

    try{
        let decrypted = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, usrPrivKey, _base64ToArrayBuffer(str))

        decrypted = JSON.parse(new TextDecoder().decode(decrypted))

        if(decrypted && typeof decrypted == "object"){
            fileName = decrypted.name
            fileSize = parseInt(decrypted.size)
            fileMime = decrypted.mime
            fileKey = decrypted.key
        }
    }
    catch(e){
        return {
            name: fileName,
            size: fileSize,
            mime: fileMime,
            key: fileKey
        }
    }

    let obj = {
        name: fileName,
        size: fileSize,
        mime: fileMime,
        key: fileKey
    }

    if(obj.name.length >= 1){
        window.customVariables.cachedMetadata[cacheKey] = obj
    }

    return obj
}

export function base64ArrayBuffer(arrayBuffer){
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  
    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder
  
    var a, b, c, d
    var chunk
  
    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
  
      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63               // 63       = 2^6 - 1
  
      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }
  
    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
      chunk = bytes[mainLength]
  
      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
  
      // Set the 4 least significant bits to zero
      b = (chunk & 3)   << 4 // 3   = 2^2 - 1
  
      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
  
      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
  
      // Set the 2 least significant bits to zero
      c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
  
      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }
    
    return base64
}

export function selectedItemsDoesNotContainFolder(items){
    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder" && items[i].selected){
            return false
        }
    }

    return true
}

export function selectedItemsContainsFolder(items){
    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder" && items[i].selected){
            return true
        }
    }

    return false
}

export function _base64ToArrayBuffer(base64){
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export function fileNameValidationRegex(name){
	if(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$|([<>:"\/\\|?*])|(\.|\s)$/ig.test(name)){
		return true
	}

	return false
}

export function checkIfNameIsBanned(name){
    let banned = [
      "/",
      "\\",
      "?",
      "@",
      "$",
      "%",
      "[",
      "]",
      "{",
      "}",
      "&",
      '"',
      "'",
      "`",
      "*",
      "=",
      "´",
      "<",
      ">",
      ":",
      ";",
      "|",
      "§",
      "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
      "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    ]
  
    let isBanned = false
  
    banned.forEach((ban) => {
      if(name.indexOf(ban) !== -1){
        isBanned = true
      }
    })
  
    return isBanned
  }

export function removeIllegalCharsFromString(str){
    str = str.split("'").join("")
    str = str.split('"').join("")
    str = str.split("´").join("")
    str = str.split("`").join("")
    str = str.split("<").join("")
    str = str.split(">").join("")
    str = str.split("!").join("")
    str = str.split("^").join("")
    str = str.split(":").join("")
    str = str.replace(/(<([^>]+)>)/ig, "")

    return str
}

export function folderNameRegex(name){
    if(name.substring(0, 1) == "." || name.substring(0, 2) == ".."){
        return true
    }
    
    return false
}

export function nameRegex(name){
    return false
}

export function isAlphaNumeric(str){
    var code, i, len;
    
    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
        return false;
        }
    }
    return true;
}

export function convertWordArrayToUint8Array(wordArray){
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

export function convertUint8ArrayToBinaryString(u8Array){
    let i, len = u8Array.length, b_str = ""

    for (i = 0; i < len; i++){
        b_str += String.fromCharCode(u8Array[i])
    }

    return b_str
}

export function Semaphore(max){
    var counter = 0;
    var waiting = [];
    
    var take = function() {
      if (waiting.length > 0 && counter < max){
        counter++;
        let promise = waiting.shift();
        promise.resolve();
      }
    }
    
    this.acquire = function() {
      if(counter < max) {
        counter++
        return new Promise(resolve => {
        resolve();
      });
      } else {
        return new Promise((resolve, err) => {
          waiting.push({resolve: resolve, err: err});
        });
      }
    }
      
    this.release = function() {
     counter--;
     take();
    }
    
    this.purge = function() {
      let unresolved = waiting.length;
    
      for (let i = 0; i < unresolved; i++) {
        waiting[i].err('Task has been purged.');
      }
    
      counter = 0;
      waiting = [];
      
      return unresolved;
    }
}

/*export function checkIfItemParentIsBeingShared(parentUUID, type, metadata){
    const checkIfIsSharing = async (parent, callback) => {
        if(parent == "default" || parent == "base"){
            return callback(false)
        }

        try{
            var res = await apiRequest("POST", "/v1/share/dir/status", {
                apiKey: window.customVariables.apiKey,
                uuid: parent
            })
        }
        catch(e){
            console.log(e)

            return callback(false)
        }

        if(!res.status){
            console.log(res.message)

            return callback(false)
        }

        return callback(res.data.sharing, res.data.users)
    }

    checkIfIsSharing(parentUUID, async (status, users) => {
        if(!status){
            return false
        }

        for(let i = 0; i < users.length; i++){
            let user = users[i]

            try{
                var usrPubKey = await window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
                    name: "RSA-OAEP",
                    hash: "SHA-512"
                }, true, ["encrypt"])
            }
            catch(e){
                console.log(e)

                return false
            }

            let mData = ""

            if(type == "file"){
                mData = JSON.stringify({
                    name: metadata.name,
                    size: parseInt(metadata.size),
                    mime: metadata.mime,
                    key: metadata.key
                })
            }
            else{
                mData = JSON.stringify({
                    name: metadata.name
                })
            }
            
            try{
                var encrypted = await window.crypto.subtle.encrypt({
                    name: "RSA-OAEP"
                }, usrPubKey, new TextEncoder().encode(mData))
            }
            catch(e){
                console.log(e)

                return false
            }

            try{
                var res = await apiRequest("POST", "/v1/share", {
                    apiKey: window.customVariables.apiKey,
                    uuid: metadata.uuid,
                    parent: parentUUID,
                    email: user.email,
                    type,
                    metadata: base64ArrayBuffer(encrypted)
                })
            }
            catch(e){
                console.log(e)

                return false
            }

            if(!res.status){
                console.log(res.message)

                return false
            }
        }
    })
}

export function checkIfItemIsBeingSharedForRename(type, uuid, metadata){
    const checkIfIsSharing = async (itemUUID, callback) => {
        try{
            var res = await apiRequest("POST", "/v1/user/shared/item/status", {
                apiKey: window.customVariables.apiKey,
                uuid: itemUUID
            })
        }
        catch(e){
            console.log(e)

            return callback(false)
        }

        if(!res.status){
            console.log(res.message)

            return callback(false)
        }

        return callback(res.data.sharing, res.data.users)
    }

    checkIfIsSharing(uuid, async (sharing, users) => {
        if(!sharing){
            return false
        }

        for(let i = 0; i < users.length; i++){
            let user = users[i]

            try{
                var usrPubKey = await window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
                    name: "RSA-OAEP",
                    hash: "SHA-512"
                }, true, ["encrypt"])
            }
            catch(e){
                console.log(e)

                return false
            }

            let mData = ""

            if(type == "file"){
                mData = JSON.stringify({
                    name: metadata.name,
                    size: parseInt(metadata.size),
                    mime: metadata.mime,
                    key: metadata.key
                })
            }
            else{
                mData = JSON.stringify({
                    name: metadata.name
                })
            }
            
            try{
                var encrypted = await window.crypto.subtle.encrypt({
                    name: "RSA-OAEP"
                }, usrPubKey, new TextEncoder().encode(mData))
            }
            catch(e){
                console.log(e)

                return false
            }

            try{
                var res = await apiRequest("POST", "/v1/user/shared/item/rename", {
                    apiKey: window.customVariables.apiKey,
                    uuid,
                    receiverId: user.id,
                    metadata: base64ArrayBuffer(encrypted)
                })
            }
            catch(e){
                console.log(e)

                return false
            }

            if(!res.status){
                console.log(res.message)

                return false
            }
        }
    })
}*/

export function decryptFolderLinkKey(str, userMasterKeys){
	let link = ""

    if(userMasterKeys.length > 1){
      	userMasterKeys = userMasterKeys.reverse()
    }

    userMasterKeys.forEach((key) => {
        try{
            let obj = CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8)

            if(obj && typeof obj == "string"){
                if(obj.length >= 16){
                	link = obj
                }
            }
        }
        catch(e){
            return
        }
    })

    return link
}

export function checkIfItemIsBeingSharedForRename(type, uuid, metaData, optionalCallback){
	let shareCheckDone = false
	let linkCheckDone = false

	let isItDoneInterval = undefined
	let callbackFired = false

	const isItDone = () => {
		if(shareCheckDone && linkCheckDone){
			clearInterval(isItDoneInterval)

			if(typeof optionalCallback == "function" && !callbackFired){
				callbackFired = true

			 	optionalCallback()
			}

			return true
		}
	}

	isItDoneInterval = setInterval(isItDone, 100)

	const checkIfIsSharing = (itemUUID, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/user/shared/item/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: itemUUID
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsSharing(itemUUID, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					callback(false)

					return console.log(res.message)
				}

				return callback(res.data.sharing, res.data.users)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsSharing(itemUUID, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const checkIfIsInFolderLink = (itemUUID, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/item/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: itemUUID
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsInFolderLink(itemUUID, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					callback(false)

					return console.log(res.message)
				}

				return callback(res.data.link, res.data.links)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsInFolderLink(itemUUID, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const renameItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/item/rename",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						renameItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					renameItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const shareItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/user/shared/item/rename",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						shareItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					shareItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	checkIfIsSharing(uuid, 0, 32, (isSharing, users) => {
		if(!isSharing){
			shareCheckDone = true

			return isItDone()
		}

		let totalUsers = users.length
		let doneUsers = 0

		const doneSharingToUsers = () => {
			doneUsers += 1

			if(doneUsers >= totalUsers){
				shareCheckDone = true

				return isItDone()
			}
		}

		users.forEach((user) => {
			window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
      			name: "RSA-OAEP",
        		hash: "SHA-512"
    		}, true, ["encrypt"]).then((usrPubKey) => {
    			let mData = ""

    			if(type == "file"){
    				mData = JSON.stringify({
	    				name: metaData.name,
	    				size: parseInt(metaData.size),
	    				mime: metaData.mime,
	    				key: metaData.key
	    			})
				}
				else{
					mData = JSON.stringify({
						name: metaData.name
					})
				}

				window.crypto.subtle.encrypt({
    				name: "RSA-OAEP"
    			}, usrPubKey, new TextEncoder().encode(mData)).then((encrypted) => {
    				shareItem(JSON.stringify({
						apiKey: window.customVariables.apiKey,
						uuid: uuid,
						receiverId: user.id,
						metadata: base64ArrayBuffer(encrypted)
					}), 0, 32, (err) => {
    					if(err){
    						console.log(err)
    					}

    					doneSharingToUsers()
    				})
    			}).catch((err) => {
	    			doneSharingToUsers()
	    		})
    		}).catch((err) => {
    			doneSharingToUsers()
    		})
		})
	})

	checkIfIsInFolderLink(uuid, 0, 32, (isLinking, links) => {
		if(!isLinking){
			linkCheckDone = true

			return isItDone()
		}

		let userMasterKeys = window.customVariables.userMasterKeys

		let totalLinks = links.length
		let linksDone = 0

		const doneAddingToLink = () => {
			linksDone += 1

			if(linksDone >= totalLinks){
				linkCheckDone = true

				return isItDone()
			}
		}

		links.forEach((link) => {
			let key = decryptFolderLinkKey(link.linkKey, userMasterKeys)

			let mData = ""

			if(type == "file"){
				mData = JSON.stringify({
    				name: metaData.name,
    				size: parseInt(metaData.size),
    				mime: metaData.mime,
    				key: metaData.key
    			})
			}
			else{
				mData = JSON.stringify({
					name: metaData.name
				})
			}

			mData = CryptoJS.AES.encrypt(mData, key).toString()

			renameItem(JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: uuid,
				linkUUID: link.linkUUID,
				metadata: mData
			}), 0, 32, (err) => {
				if(err){
					console.log(err)
				}

				doneAddingToLink()
			})
		})
	})
}

export function checkIfItemParentIsBeingShared(parentUUID, type, metaData, optionalCallback){
	let shareCheckDone = false
	let linkCheckDone = false

	let isItDoneInterval = undefined
	let callbackFired = false

	const isItDone = () => {
		if(shareCheckDone && linkCheckDone){
			clearInterval(isItDoneInterval)

			if(typeof optionalCallback == "function" && !callbackFired){
				callbackFired = true
				
			 	optionalCallback()
			}

			return true
		}
	}

	isItDoneInterval = setInterval(isItDone, 100)

	const checkIfIsSharing = (parent, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/share/dir/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: parent
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsSharing(parent, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					console.log(res.message)

					return callback(false)
				}

				return callback(res.data.sharing, res.data.users)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsSharing(parent, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const checkIfIsInFolderLink = (parent, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(false)
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/link/dir/status",
			type: "POST",
			contentType: "application/json",
			data: JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: parent
			}),
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						checkIfIsInFolderLink(parent, (tries + 1), maxTries, callback)
					}, 1000)
				}

				if(!res.status){
					console.log(res.message)

					return callback(false)
				}

				return callback(res.data.link, res.data.links)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					checkIfIsInFolderLink(parent, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const addItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/dir/link/add",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						addItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					addItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	const shareItem = (data, tries, maxTries, callback) => {
		if(tries >= maxTries){
			return callback(new Error("Max requests reached"))
		}

		window.$.ajax({
			url: getAPIServer() + "/v1/share",
			type: "POST",
			contentType: "application/json",
			data: data,
			processData: false,
			cache: false,
			timeout: 300000,
			success: (res) => {
				if(!res){
					console.log("Request error")

					return setTimeout(() => {
						shareItem(data, (tries + 1), maxTries, callback)
					}, 1000)
				}

				return callback(null)
			},
			error: (err) => {
				console.log(err)

				return setTimeout(() => {
					shareItem(data, (tries + 1), maxTries, callback)
				}, 1000)
			}
		})
	}

	checkIfIsSharing(parentUUID, 0, 32, (status, users) => {
		if(!status){
			shareCheckDone = true

			return isItDone()
		}

		let totalUsers = users.length
		let doneUsers = 0

		const doneSharingToUsers = () => {
			doneUsers += 1

			if(doneUsers >= totalUsers){
				shareCheckDone = true

				return isItDone()
			}
		}

		users.forEach((user) => {
			window.crypto.subtle.importKey("spki", _base64ToArrayBuffer(user.publicKey), {
      			name: "RSA-OAEP",
        		hash: "SHA-512"
    		}, true, ["encrypt"]).then((usrPubKey) => {
    			let mData = ""

    			if(type == "file"){
    				mData = JSON.stringify({
	    				name: metaData.name,
	    				size: parseInt(metaData.size),
	    				mime: metaData.mime,
	    				key: metaData.key
	    			})
				}
				else{
					mData = JSON.stringify({
						name: metaData.name
					})
				}

				window.crypto.subtle.encrypt({
    				name: "RSA-OAEP"
    			}, usrPubKey, new TextEncoder().encode(mData)).then((encrypted) => {
    				shareItem(JSON.stringify({
						apiKey: window.customVariables.apiKey,
						uuid: metaData.uuid,
						parent: parentUUID,
						email: user.email,
						type: type,
						metadata: base64ArrayBuffer(encrypted)
					}), 0, 32, (err) => {
    					if(err){
    						console.log(err)
    					}

    					doneSharingToUsers()
					})
    			}).catch((err) => {
	    			doneSharingToUsers()
	    		})
    		}).catch((err) => {
    			doneSharingToUsers()
    		})
		})
	})

	checkIfIsInFolderLink(parentUUID, 0, 32, (status, links) => {
		if(!status){
			linkCheckDone = true

			return isItDone()
		}

		let userMasterKeys = window.customVariables.userMasterKeys

		let totalLinks = links.length
		let linksDone = 0

		const doneAddingToLink = () => {
			linksDone += 1

			if(linksDone >= totalLinks){
				linkCheckDone = true

				return isItDone()
			}
		}

		links.forEach((link) => {
			let key = decryptFolderLinkKey(link.linkKey, userMasterKeys)

			let mData = ""

			if(type == "file"){
				mData = JSON.stringify({
					name: metaData.name,
					size: parseInt(metaData.size),
					mime: metaData.mime,
					key: metaData.key
				})
			}
			else{
				mData = JSON.stringify({
					name: metaData.name
				})
			}

			mData = CryptoJS.AES.encrypt(mData, key).toString()

			addItem(JSON.stringify({
				apiKey: window.customVariables.apiKey,
				uuid: metaData.uuid,
				parent: parentUUID,
				linkUUID: link.linkUUID,
				type: type,
				metadata: mData,
				key: link.linkKey,
				expiration: "never",
				password: "empty",
				passwordHashed: hashFn("empty"),
				downloadBtn: "enable"
			}), 0, 32, (err) => {
				if(err){
					console.log(err)
				}

				doneAddingToLink()
			})
		})
	})
}

export function currentParentFolder(){
    let ex = window.location.href.split("/")

    return ex[ex.length - 1]
}

export function canCompressThumbnail(ext){
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
            return true
        break
        default:
            return false
        break
    }
}

export function canShowThumbnail(ext){
    switch(ext.toLowerCase()){
        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "svg":
        case "mp4":
        case "webm":
        case "avi":
        case "mov":
        case "wmv":
            return true
        break
        default:
            return false
        break
    }
}

export function getFilePreviewType(ext){
    switch(ext.toLowerCase()){
      case "jpeg":
      case "jpg":
      case "png":
      case "gif":
      case "svg":
        return "image"
      break
      case "mp3":
      case "mp2":
      case "wav":
      case "ogg":
      case "m4a":
      case "aac":
      case "flac":
      case "midi":
      case "xmf":
      case "rtx":
      case "ota":
      case "mpa":
      case "aif":
      case "rtttl":
      case "wma":
        return "audio"
      break
      case "mp4":
      case "webm":
      case "mkv":
      case "flv":
      case "mov":
      case "ogv":
      case "3gp":
      case "avi":
        return "video"
      break
      case "json":
      case "js":
      case "md":
      case "php":
      case "css":
      case "c":
      case "perl":
      case "html":
      case "html5":
      case "jsx":
      case "php5":
      case "yml":
      case "md":
      case "xml":
      case "sql":
      case "java":
      case "csharp":
      case "dist":
      case "py":
      case "cc":
      case "cpp":
      case "log":
      case "conf":
      case "cxx":
      case "ini":
      case "lock":
      case "bat":
      case "sh":
      case "properties":
      case "cfg":
      case "ahk":
      case "ts":
      case "tsx":
        return "code"
      break
      case "txt":
      case "rtf":
        return "text"
      break
      case "pdf":
        return "pdf"
      break
      default:
        return "none"
      break
    }
}

export function escapeHTML(str){
    if(typeof str !== "string"){
      return str
    }
  
    if(str.length == 0){
      return str
    }
  
    return str.replace(/(<([^>]+)>)/ig, "")
}

export function getFileIconFromName(name){
    let ex = name.split(".")

    return getFileIcon(ex[ex.length - 1].toLowerCase())
}

export function getFileIcon(ext){
    switch(ext.toLowerCase()){
      case "pdf":
        return `assets/img/types/pdf.svg`
      break
      case "doc":
      case "docx":
        return `assets/img/types/doc.svg`
      break
      case "exe":
        return `assets/img/types/exe.svg`
      break
      case "mp3":
        return `assets/img/types/mp3.svg`
      break
      case "json":
        return `assets/img/types/json-file.svg`
      break
      case "png":
        return `assets/img/types/png.svg`
      break
      case "ico":
        return `assets/img/types/ico.svg`
      break
      case "txt":
        return `assets/img/types/txt.svg`
      break
      case "jpg":
      case "jpeg":
        return `assets/img/types/jpg.svg`
      break
      case "iso":
        return `assets/img/types/iso.svg`
      break
      case "js":
        return `assets/img/types/javascript.svg`
      break
      case "html":
        return `assets/img/types/html.svg`
      break
      case "css":
        return `assets/img/types/css.svg`
      break
      case "csv":
        return `assets/img/types/csv.svg`
      break
      case "avi":
        return `assets/img/types/avi.svg`
      break
      case "mp4":
        return `assets/img/types/mp4.svg`
      break
      case "ppt":
        return `assets/img/types/ppt.svg`
      break
      case "zip":
        return `assets/img/types/zip.svg`
      break
      case "rar":
      case "tar":
      case "tgz":
      case "gz":
      case "gzip":
        return `assets/img/types/zip-1.svg`
      break
      case "txt":
        return `assets/img/types/txt.svg`
      break
      case "svg":
        return `assets/img/types/svg.svg`
      break
      case "xml":
        return `assets/img/types/xml.svg`
      break
      case "dwg":
        return `assets/img/types/dwg.svg`
      break
      case "fla":
        return `assets/img/types/fla.svg`
      break
      case "ai":
        return `assets/img/types/ai.svg`
      break
      default:
        return `assets/img/types/file.svg`
      break
    }
}

export function uInt8ArrayConcat(arrays){
    // sum of individual array lengths
    let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  
    if (!arrays.length) return null;
  
    let result = new Uint8Array(totalLength);
  
    // for each array - copy it over result
    // next array is copied right after the previous one
    let length = 0;
    for(let array of arrays) {
      result.set(array, length);
      length += array.length;
    }
  
    return result;
}

export function orderItemsByType(items, type){
    let files = []
    let folders = []

    for(let i = 0; i < items.length; i++){
        if(items[i].type == "file"){
            files.push(items[i])
        }
        else{
            folders.push(items[i])
        }
    }

    if(type == "nameAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.name.localeCompare(b.name)
        })

        let sortedFolders = folders.sort((a, b) => {
            return a.name.localeCompare(b.name)
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.size - b.size
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "dateAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.timestamp - b.timestamp
        })

        let sortedFolders = folders.sort((a, b) => {
            return a.timestamp - b.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeAsc"){
        let sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return a.mime.localeCompare(b.mime)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "nameDesc"){
        let sortedFiles = files.sort((a, b) => {
            return b.name.localeCompare(a.name)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.name.localeCompare(a.name)
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "sizeDesc"){
        let sortedFiles = files.sort((a, b) => {
            return b.size - a.size
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "typeDesc"){
        let sortedFiles = files.sort((a, b) => {
            if(typeof a.mime == "undefined"){
                a.mime = "_"
            }

            if(typeof b.mime == "undefined"){
                b.mime = "_"
            }

            if(a.mime.length <= 1){
                a.mime = "_"
            }

            if(b.mime.length <= 1){
                b.mime = "_"
            }

            return b.mime.localeCompare(a.mime)
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else{
        //default, dateDesc

        let sortedFiles = files.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
}

export function getVideoCover(file, seekTo = 0.0) {
    return new Promise((resolve, reject) => {
        // load the file to a video player
        const videoPlayer = document.createElement('video');
        videoPlayer.setAttribute('src', URL.createObjectURL(file));
        videoPlayer.load();
        videoPlayer.addEventListener('error', (ex) => {
            reject("error when loading video file", ex);
        });
        // load metadata of the video to get video duration and dimensions
        videoPlayer.addEventListener('loadedmetadata', () => {
            // seek to user defined timestamp (in seconds) if possible
            if (videoPlayer.duration < seekTo) {
                reject("video is too short.");
                return;
            }

            if(videoPlayer.duration >= 1){
            	seekTo = 1.0
            }

            // delay seeking or else 'seeked' event won't fire on Safari
            setTimeout(() => {
              videoPlayer.currentTime = seekTo;
            }, 200);
            // extract video thumbnail once seeking is complete
            videoPlayer.addEventListener('seeked', () => {
                // define a canvas to have the same dimension as the video
                const canvas = document.createElement("canvas");
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                // draw the video frame to canvas
                const ctx = canvas.getContext("2d");
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                // return the canvas image as a blob
                ctx.canvas.toBlob(
                    blob => {
                        resolve(blob);
                    },
                    "image/jpeg",
                    0.1 /* quality */
                );
            });
        });
    });
}

export function parseQuery(queryString) {
    var query = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

export function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

export function getLanguageSelection(){
    return `
        <ion-select-option value="en">English</ion-select-option>
        <ion-select-option value="de">Deutsch</ion-select-option>
        <ion-select-option value="nl">Nederlands</ion-select-option>
        <ion-select-option value="hi">हिन्दी, हिंदी</ion-select-option>
        <ion-select-option value="fr">Français</ion-select-option>
        <ion-select-option value="da">Dansk</ion-select-option>
        <ion-select-option value="es">Español</ion-select-option>
    `
}

export function getFolderColorStyle(color = null, onlyColor = false){
	let folderColorStyle = ""

	switch(color){
		case "default":
            folderColorStyle = "style='color: #F6C358;'"
            
            if(onlyColor){
                folderColorStyle = "#F6C358"
            }
		break
		case "blue":
            folderColorStyle = "style='color: #2992E5;'"
            
            if(onlyColor){
                folderColorStyle = "#2992E5"
            }
		break
		case "green":
            folderColorStyle = "style='color: #57A15B;'"
            
            if(onlyColor){
                folderColorStyle = "#57A15B"
            }
		break
		case "purple":
            folderColorStyle = "style='color: #8E3A9D;'"
            
            if(onlyColor){
                folderColorStyle = "#8E3A9D"
            }
		break
		case "red":
            folderColorStyle = "style='color: #CB2E35;'"
            
            if(onlyColor){
                folderColorStyle = "#CB2E35"
            }
		break
		case "gray":
            folderColorStyle = "style='color: gray;'"
            
            if(onlyColor){
                folderColorStyle = "gray"
            }
		break
		default:
            folderColorStyle = "style='color: #F6C358;'"
            
            if(onlyColor){
                folderColorStyle = "#F6C358"
            }
		break
	}

	return folderColorStyle
}

export function copyTextToClipboardWeb(text){
	var textArea = document.createElement("textarea")

	textArea.style.position = "fixed"
	textArea.style.top = 0
	textArea.style.left = 0
	textArea.style.width = "2em"
	textArea.style.height = "2em"
	textArea.style.padding = 0
	textArea.style.border = "none"
	textArea.style.outline = "none"
	textArea.style.boxShadow = "none"
	textArea.style.background = "transparent"

	textArea.value = text

	document.body.appendChild(textArea)

	textArea.focus()
	textArea.select()

	try{
		document.execCommand("copy")
	}
	catch(e){
		return console.log(e)
	}

	//alert("Link copied to clipboard!")

	return document.body.removeChild(textArea)
}