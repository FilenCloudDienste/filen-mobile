import { storage } from "./storage"
import base64 from "react-native-base64"
import encoding from "text-encoding"
import { InteractionManager, Platform } from "react-native"
import * as cppBase64 from "react-native-quick-base64"
import { useStore } from "./state"
import { i18n } from "../i18n/i18n"

const textDecoder = new encoding.TextDecoder()
const textEncoder = new encoding.TextEncoder()

export const base64Decode = (str) => {
    return base64.decode(str)
}

export const base64Encode = (str) => {
    return base64.encode(str)
}

export const getAPIServer = () => {
    const servers = [
        "https://api.filen.io",
		"https://api.filen.net",
        "https://api.filen-1.net",
        "https://api.filen-2.net",
        "https://api.filen-3.net",
        "https://api.filen-4.net",
        "https://api.filen-5.net",
		"https://api.filen-6.net"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export const getDownloadServer = () => {
    const servers = [
        "https://down.filen.io",
		"https://down.filen.net",
        "https://down.filen-1.net",
        "https://down.filen-2.net",
        "https://down.filen-3.net",
        "https://down.filen-4.net",
        "https://down.filen-5.net",
		"https://down.filen-6.net"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export const getUploadServer = () => {
    const servers = [
        "https://up.filen.io",
		"https://up.filen.net",
        "https://up.filen-1.net",
        "https://up.filen-2.net",
        "https://up.filen-3.net",
        "https://up.filen-4.net",
        "https://up.filen-5.net",
		"https://up.filen-6.net"
    ]

    return servers[getRandomArbitrary(0, (servers.length - 1))]
}

export const getMasterKeys = () => {
    try{
        return JSON.parse(storage.getString("masterKeys"))
    }
    catch(e){
        return []
    }
}

export const getFolderColor = (color) => {
    const colors = getAvailableFolderColors()

    if(typeof colors[color] !== "undefined"){
        return colors[color]
    }

    return colors['default']
}

export const getAvailableFolderColors = () => {
    return {
        "default": "#F6C358",
        "blue": "#2992E5",
        "green": "#57A15B",
        "purple": "#8E3A9D",
        "red": "#CB2E35",
        "gray": "gray"
    }
}

export const fileAndFolderNameValidation = (name) => {
    const regex = /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i

    if(regex.test(name)){
        return false
    }

    return true
}

export const getFileParentPath = (filePath) => {
	const ex = filePath.split("/")
  
    ex.pop()
  
 	return ex.join("/")
}

export const getFilenameFromPath = (path) => {
    return path.split("\\").pop().split("/").pop()
}

export const getRouteURL = (passedRoute) => {
    if(typeof passedRoute !== "undefined"){
        var route = passedRoute
        var routeURL = getParent(passedRoute)
    }
    else{
        var routes = useStore.getState().currentRoutes
        var route = routes[routes.length - 1]
        var routeURL = getParent()
    }

    if(typeof route !== "undefined"){
        if(typeof route.params !== "undefined"){
            if(typeof route.params.parent !== "undefined"){
                routeURL = route.params.parent
            }
        }
    }

    return routeURL
}

export const getParent = (passedRoute) => {
    let routes = useStore.getState().currentRoutes
    let route = routes[routes.length - 1]

    if(typeof passedRoute !== "undefined"){
        route = passedRoute
    }

    if(typeof route !== "undefined"){
        if(typeof route.params !== "undefined"){
            if(typeof route.params.parent !== "undefined"){
                if(route.params.parent.indexOf("/") !== -1){
                    const ex = route.params.parent.split("/")

                    return ex[ex.length - 1].trim()
                }
                else{
                    return route.params.parent
                }
            }
        }
    }

    return "base"
}

export const getRandomArbitrary = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min)
}

export const sleep = (ms = 1000) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const formatBytes = (bytes, decimals = 2) => {
    if(bytes == 0){
        return "0 Bytes"
    }

    let k = 1024
    let dm = decimals < 0 ? 0 : decimals
    let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export const arrayBufferToHex = (buffer) => {
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join("")
}

export const arrayBufferToHexAsync = (buffer) => {
    return new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
            return resolve([...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join(""))
        })
    })
}

export const base64ToArrayBuffer = (b64) => {
    return cppBase64.toByteArray(b64)
}

export const base64ToArrayBufferAsync = (b64) => {
    return new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
            return resolve(cppBase64.toByteArray(b64))
        })
    })
}

export function convertBinaryStringToUint8Array(bStr) {
    var i, len = bStr.length, u8_array = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        u8_array[i] = bStr.charCodeAt(i);
    }
    return u8_array;
}

export function convertBinaryStringToUint8ArrayAsync(bStr) {
    return new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
            var i, len = bStr.length, u8_array = new Uint8Array(len);

            for (var i = 0; i < len; i++) {
                u8_array[i] = bStr.charCodeAt(i);
            }

            return resolve(u8_array);
        })
    })
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

export const arrayBufferToBase64 = (arrayBuffer) => {
    return cppBase64.fromByteArray(new Uint8Array(arrayBuffer)) 
}

export const arrayBufferToBase64Async = (arrayBuffer) => {
    return new Promise((resolve, reject) => {
        InteractionManager.runAfterInteractions(() => {
            return resolve(cppBase64.fromByteArray(new Uint8Array(arrayBuffer)))
        })
    })
}

export const uInt8ArrayConcat = (arrays) => {
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

	totalLength = null
	length = null
	arrays = null
  
    return result;
}

export const uInt8ArrayConcatAsync = (arrays) => {
    return new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
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

            totalLength = null
            length = null
            arrays = null
        
            return resolve(result);
        })
    })
}

export const simpleDate = (timestamp) => {
    const date = new Date(timestamp * 1000)

    return date.toLocaleDateString() + ", " + date.toLocaleTimeString()
}

export const normalizePhotosRange = (range) => {
    if(typeof range !== "string"){
        return "all"
    }

    if(!["years", "months", "days", "all"].includes(range)){
        return "all"
    }

    return range
}

export const randomIdUnsafe = () => {
    return Math.random().toString().slice(3) + Math.random().toString().slice(3) + Math.random().toString().slice(3)
}

export const generateRandomString = (length = 32) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.generateRandomString({ charLength: length }).then(resolve).catch(reject)
    })
}

export function generateRandomClassName(length = 16){
    let result = ""
    let characters = "abcdefghijklmnopqrstuvwxyz"

    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    return result + "-" + result
}

export function unixTimestamp(){
    return Math.floor((+new Date()) / 1000)
}

export const canCompressThumbnail = (ext) => {
    if(Platform.OS == "android"){
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
    else{
        switch(ext.toLowerCase()){
            case "jpeg":
            case "jpg":
            case "png":
            case "gif":
            case "heif":
            case "heic":
            case "heifs":
            case "heics":
                return true
            break
            default:
                return false
            break
        }
    }
}

export function itemNameValidationRegex(type = "file", name){
	if(type == "file"){
        if(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$|([<>:"\/\\|?*])|(\.|\s)$/ig.test(name)){
            return false
        }
    }
    else{
        if(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$|([<>:"\/\\|?*])|(\.|\s)$/ig.test(name)){
            return false
        }
    }

	return true
}

export const canShowThumbnail = (ext) => {
    if(Platform.OS == "android"){
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
    else{
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
            case "heif":
            case "heifs":
            case "heic":
            case "heics":
            case "hevc":
                return true
            break
            default:
                return false
            break
        }
    }
}

export const getFilePreviewType = (ext, mime) => {
    if(Platform.OS == "android"){
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
            case "swift":
            case "m":
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
            //case "ts":
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
            case "docx":
            case "doc":
            case "odt":
            case "xls":
            case "xlsx":
            case "ods":
            case "ppt":
            case "pptx":
            case "csv":
              return "doc"
            break
            case "heic":
              return "heic"
            break
            case "heif":
              return "heif"
            break
            case "hevc":
              return "hevc"
            break
            default:
              return "none"
            break
          }
    }
    else{
        switch(ext.toLowerCase()){
            case "jpeg":
            case "jpg":
            case "png":
            case "gif":
            case "svg":
            case "heic":
            case "heics":
            case "heif":
            case "heifs":
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
            case "hevc":
              return "video"
            break
            case "json":
            case "swift":
            case "m":
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
            //case "ts":
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
            case "docx":
            case "doc":
            case "odt":
            case "xls":
            case "xlsx":
            case "ods":
            case "ppt":
            case "pptx":
            case "csv":
              return "doc"
            break
            case "heic":
              return "heic"
            break
            case "heif":
              return "heif"
            break
            case "hevc":
              return "hevc"
            break
            default:
              return "none"
            break
          }
    }
}

export function convertUint8ArrayToBinaryString(u8Array){
    let i, len = u8Array.length, b_str = ""

    for (i = 0; i < len; i++){
        b_str += String.fromCharCode(u8Array[i])
    }

    return b_str
}

export function convertUint8ArrayToBinaryStringAsync(u8Array){
    return new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
            let i, len = u8Array.length, b_str = ""

            for (i = 0; i < len; i++){
                b_str += String.fromCharCode(u8Array[i])
            }

            return resolve(b_str)
        })
    })
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

export const calcCameraUploadCurrentDate = (from, to, lang = "en") => {
    const fromDate = new Date(from * 1000)
    const toDate = new Date(to * 1000)
    const fromMonth = fromDate.getMonth()
    const toMonth = toDate.getMonth()
    const fromYear = fromDate.getFullYear()
    const toYear = toDate.getFullYear()
    const fromDay = fromDate.getDate()
    const toDay = toDate.getDate()

    if(fromMonth == toMonth && fromYear == toYear){
        if(fromDay == toDay){
            return fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
        }
        else{
            return toDay + "-" + fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
        }
    }
    else if(fromMonth !== toMonth && fromYear == toYear){
        return toDay + " " + i18n(lang, "monthShort_" + toMonth) + " - " + fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
    }
    else if(fromMonth !== toMonth && fromYear !== toYear){
        return toDay + " " + i18n(lang, "monthShort_" + toMonth) + " " + toYear + " - " + fromDay + " " + i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
    }
    else{
        return i18n(lang, "monthShort_" + fromMonth) + " " + fromYear
    }
}

export const calcPhotosGridSize = (num) => {
    if(num <= 0){
        return 3
    }

    return num
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
            return a.lastModifiedSort - b.lastModifiedSort
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
    else if(type == "lastModifiedAsc"){
        let sortedFiles = files.sort((a, b) => {
            return a.lastModifiedSort - b.lastModifiedSort
        })

        let sortedFolders = folders.sort((a, b) => {
            return b.timestamp - a.timestamp
        })

        return sortedFolders.concat(sortedFiles)
    }
    else if(type == "lastModifiedDesc"){
        let sortedFiles = files.sort((a, b) => {
            return b.lastModifiedSort - a.lastModifiedSort
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

export function compareVersions(current, got){
	function compare(a, b) {
		if (a === b) {
		   return 0;
		}
	
		var a_components = a.split(".");
		var b_components = b.split(".");
	
		var len = Math.min(a_components.length, b_components.length);

		for (var i = 0; i < len; i++) {
			if (parseInt(a_components[i]) > parseInt(b_components[i])) {
				return 1;
			}
	
			if (parseInt(a_components[i]) < parseInt(b_components[i])) {
				return -1;
			}
		}
	
		if (a_components.length > b_components.length) {
			return 1;
		}
	
		if (a_components.length < b_components.length) {
			return -1;
		}
	
		return 0;
	}

	let res = compare(current, got)

	if(res == -1){
		return "update"
	}
	else{
		return "ok"
	}
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

	this.count = function() {
		return counter
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

export const deriveKeyFromPassword = (password, salt, iterations = 200000, hash = "SHA-512", bitLength = 512, returnHex = true) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.deriveKeyFromPassword({
            password,
            salt,
            iterations,
            hash,
            bitLength,
            returnHex
        }).then(resolve).catch(reject)
    })
}

export const decryptMetadata = (data, key) => {
	return new Promise((resolve, reject) => {
        global.nodeThread.decryptMetadata({
            data,
            key
        }).then(resolve).catch(reject)
    })
}

export const encryptMetadata = (data, key) => {
	return new Promise((resolve, reject) => {
        global.nodeThread.encryptMetadata({
            data,
            key
        }).then(resolve).catch(reject)
    })
}

export const decryptFolderLinkKey = (masterKeys, metadata) => {
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

export const decryptFileMetadataPrivateKey = (metadata, privateKey, uuid) => {
    return new Promise((resolve, reject) => {
        const cacheKey = "metadataCache:file:" + uuid + ":" + metadata

        try{
            var metadataCache = storage.getString(cacheKey)
        }
        catch(e){
            console.log(e)
        }

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
                            lastModified: metadataCache.lastModified
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
            lastModified: unixTimestamp()
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
                        lastModified: decrypted.lastModified
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

export const decryptFolderNamePrivateKey = (privateKey, metadata, uuid) => {
    return new Promise((resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        const cacheKey = "metadataCache:folder:" + uuid + ":" + metadata

        try{
            var metadataCache = storage.getString(cacheKey)
        }
        catch(e){
            console.log(e)
        }

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
                    try{
                        storage.set(cacheKey, JSON.stringify({
                            name
                        }))
                    }
                    catch(e){
                        console.log(e)
                    }
                }
            }

            return resolve(name)
        }).catch((err) => {
            console.log(err)

            return resolve(name)
        })
    })
}

export const decryptFolderName = (masterKeys, metadata, uuid) => {
    return new Promise((resolve, reject) => {
        if(metadata == "default"){
            return resolve("Default")
        }

        /*try{
            var masterKeys = storage.getString("masterKeys")
        }
        catch(e){
            return reject(e)
        }

        if(typeof masterKeys == "undefined"){
            return reject(new Error("Master keys undefined"))
        }
        
        try{
            masterKeys = JSON.parse(masterKeys)
        }
        catch(e){
            return reject(e)
        }

        if(masterKeys.length == 0){
            return reject(new Error("Master keys undefined"))
        }*/

        const cacheKey = "metadataCache:folder:" + uuid + ":" + metadata

        try{
            var metadataCache = storage.getString(cacheKey)
        }
        catch(e){
            console.log(e)
        }

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
                            try{
                                storage.set(cacheKey, JSON.stringify({
                                    name
                                }))
                            }
                            catch(e){
                                console.log(e)
                            }
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

export const decryptFileMetadata = (masterKeys, metadata, uuid) => {
    return new Promise((resolve, reject) => {
        const cacheKey = "metadataCache:file:" + uuid + ":" + metadata

        try{
            var metadataCache = storage.getString(cacheKey)
        }
        catch(e){
            console.log(e)
        }

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
                                lastModified: metadataCache.lastModified
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
            lastModified: Math.floor((+new Date()) / 1000)
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
                                    lastModified: decrypted.lastModified
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
                        if(file.name > 0){
                            try{
                                storage.set(cacheKey, JSON.stringify(file))
                            }
                            catch(e){
                                console.log(e)
                            }
                        }
                    }

                    return resolve(file)
                }
            }).catch((err) => {
                iterated += 1
            })
        }
    })
}

export const encryptData = (base64, key) => {
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

export const utf8ToHex = (str) => {
    return Array.from(str).map(c => 
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : encodeURIComponent(c).replace(/\%/g, "").toLowerCase()
    ).join('')
}

export const decryptData = (encrypted, key, version) => {
    return new Promise((resolve, reject) => {
        global.nodeThread.decryptData({
            base64: arrayBufferToBase64(encrypted),
            key,
            version
        }).then(resolve).catch(reject)
    })
}

export const getAPIKey = () => {
    try{
        return storage.getString("apiKey")
    }
    catch(e){
        return ""
    }
}

export const fetchArrayBuffer = ({ url, timeout = 3600000 }) => {
    return new Promise((resolve, reject) => {
        InteractionManager.runAfterInteractions(() => {
            const request = new XMLHttpRequest()

            request.open("GET", url, true)
            request.responseType = "arraybuffer"
            request.timeout = timeout

            request.onloadend = () => {
                const response = request.response

                if(typeof response == "object"){
                    if(typeof response.byteLength == "number"){
                        if(response.byteLength > 0){
                            resolve(response)
                        }
                    }
                    else{
                        reject(new Error("Response is not an arrayBuffer"))
                    }
                }
                else{
                    reject(new Error("Response is not an arrayBuffer"))
                }
            }

            request.onerror = (err) => {
                reject(err)
            }

            request.send()
        })
    })
}

export const getNavigationAnimationType = (from, to) => {
    //export declare type StackAnimationTypes = 'default' | 'fade' | 'fade_from_bottom' | 'flip' | 'none' | 'simple_push' | 'slide_from_bottom' | 'slide_from_right' | 'slide_from_left';

    const defaultAnimation = Platform.OS == "android" ? "fade" : "default"

    if(from == "recents" && to == "base"){
        return "slide_from_right"
    }
    else if(from == "base" && to == "photos"){
        return "slide_from_right"
    }
    else if(from == "photos" && to == "settings"){
        return "slide_from_right"
    }
    else if(from == "settings" && to == "photos"){
        return "slide_from_left"
    }
    else if(from == "photos" && to == "base"){
        return "slide_from_left"
    }
    else if(from == "base" && to == "recents"){
        return "slide_from_left"
    }
    else if(from == "recents" && to == "shared-in"){
        return "none"
    }
    else if(from == "recents" && to == "shared-out"){
        return "none"
    }
    else if(from == "recents" && to == "links"){
        return "none"
    }
    else if(from == "recents" && to == "favorites"){
        return "none"
    }
    else if(from == "recents" && to == "offline"){
        return "none"
    }
    else{
        return defaultAnimation
    }
}

export function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

export const getFileExt = (name) => {
    if(name.indexOf(".") == -1){
        return ""
    }

    let ex = name.split(".")

    return ex[ex.length - 1].toLowerCase()
}

export function uuidv4(){ // Public Domain/MIT (UNSAFE, predictable rng)
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

export const arrayBufferToBase64JS = (arrayBuffer) => {
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

export const promiseAllSettled = (promises) => Promise.all(
    promises.map(p => p
        .then(value => ({
            status: "fulfilled",
            value
        }))
        .catch(reason => ({
            status: "rejected",
            reason
        }))
    )
)

export const asyncJSON = {
    stringify: (data) => {
        return new Promise((resolve, reject) => {
            try{
                return resolve(JSON.stringify(data))
            }
            catch(e){
                return reject(e)
            }
        })
    },
    parse: (data) => {
        return new Promise((resolve, reject) => {
            try{
                return resolve(JSON.parse(data))
            }
            catch(e){
                return reject(e)
            }
        })
    }
}