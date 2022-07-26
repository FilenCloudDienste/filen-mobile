import storage from "./storage"
import { InteractionManager, Platform } from "react-native"
import * as cppBase64 from "react-native-quick-base64"
import { useStore } from "./state"
import { i18n } from "../i18n/i18n"

export const base64Decode = (str: string): string => {
    return cppBase64.atob(str)
}

export const base64Encode = (str: string): string => {
    return cppBase64.btoa(str)
}

export const getAPIServer = (): string => {
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

export const getDownloadServer = (): string => {
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

export const getUploadServer = (): string => {
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

export const getMasterKeys = (): string[] => {
    try{
        return JSON.parse(storage.getString("masterKeys") || "[]")
    }
    catch(e){
        return []
    }
}

export const getFolderColor = (color: string): string => {
    const colors = getAvailableFolderColors()

    if(typeof colors[color] !== "undefined"){
        return colors[color]
    }

    return colors['default']
}

export const getAvailableFolderColors = (): { [key: string]: string } => {
    return {
        "default": "#F6C358",
        "blue": "#2992E5",
        "green": "#57A15B",
        "purple": "#8E3A9D",
        "red": "#CB2E35",
        "gray": "gray"
    }
}

export const fileAndFolderNameValidation = (name: string): boolean => {
    const regex = /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i

    if(regex.test(name)){
        return false
    }

    return true
}

export const getFileParentPath = (filePath: string): string => {
	const ex = filePath.split("/")
  
    ex.pop()
  
 	return ex.join("/")
}

export const getFilenameFromPath = (path: string): string => {
    return path.split("\\")?.pop()?.split("/")?.pop() as string
}

export const getRouteURL = (passedRoute?: any): string => {
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

export const getParent = (passedRoute?: any): string => {
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

export const getRandomArbitrary = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min) + min)
}

export const sleep = (ms: number = 1000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const formatBytes = (bytes: number, decimals: number = 2) => {
    if(bytes == 0){
        return "0 Bytes"
    }

    let k = 1024
    let dm = decimals < 0 ? 0 : decimals
    let sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    let i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export const arrayBufferToHex = (buffer: ArrayBuffer): string => {
    return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, "0")).join("")
}

export const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
    return cppBase64.toByteArray(b64)
}

export function convertBinaryStringToUint8Array(bStr: string): ArrayBuffer {
    var i: number, len: number = bStr.length, u8_array: Uint8Array = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        u8_array[i] = bStr.charCodeAt(i);
    }
    return u8_array;
}

export function convertWordArrayToUint8Array(wordArray: any): ArrayBuffer {
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

export const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
    return cppBase64.fromByteArray(new Uint8Array(arrayBuffer)) 
}

export const uInt8ArrayConcat = (arrays: Uint8Array[]): Uint8Array => {
    // sum of individual array lengths
    let totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
  
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

export const convertTimestampToMs = (timestamp: number): number => {
    const date = new Date(timestamp * 1000)

    if(date.getFullYear() > 2100){
        return Math.floor(timestamp)
    }
    else{
        return Math.floor(timestamp * 1000)
    }
}

export const simpleDate = (timestamp: number): string => {
    try{
        const date = new Date(convertTimestampToMs(timestamp))

        return date.toLocaleDateString() + ", " + date.toLocaleTimeString()
    }
    catch(e){
        const date = new Date()

        return date.toLocaleDateString() + ", " + date.toLocaleTimeString()
    }
}

export const normalizePhotosRange = (range: string | undefined): string => {
    if(typeof range !== "string"){
        return "all"
    }

    if(!["years", "months", "days", "all"].includes(range)){
        return "all"
    }

    return range
}

export const randomIdUnsafe = (): string => {
    return Math.random().toString().slice(3) + Math.random().toString().slice(3) + Math.random().toString().slice(3)
}

export const generateRandomString = (length: number = 32): Promise<string> => {
    return new Promise((resolve, reject) => {
        global.nodeThread.generateRandomString({ charLength: length }).then(resolve).catch(reject)
    })
}

export function unixTimestamp(): number {
    return Math.floor((+new Date()) / 1000)
}

export const canCompressThumbnail = (ext: string): boolean => {
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

export const canShowThumbnail = (ext: string): boolean => {
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

export const getFilePreviewType = (ext: string, mime?: string): string => {
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

export function convertUint8ArrayToBinaryString(u8Array: Uint8Array | ArrayBuffer): string {
    const arr: Uint8Array = new Uint8Array(u8Array)
    let i, len = arr.length, b_str = ""

    for (i = 0; i < len; i++){
        b_str += String.fromCharCode(arr[i])
    }

    return b_str
}

export const calcCameraUploadCurrentDate = (from: number, to: number, lang: string = "en"): string => {
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

export const calcPhotosGridSize = (num: number): number => {
    if(num <= 0){
        return 3
    }

    return num
}

export function orderItemsByType(items: any[], type: string): any[] {
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

export function compareVersions(current: string, got: string): string {
	function compare(a: string, b: string) {
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

export interface SemaphoreInterface {
    acquire: Function,
    release: Function,
    count: Function,
    setMax: Function,
    purge: Function
  }
  
  export const Semaphore = function(this: SemaphoreInterface, max: number) {
      var counter = 0;
      var waiting: any = [];
      var maxCount = max || 1
      
      var take = function() {
        if (waiting.length > 0 && counter < maxCount){
          counter++;
          let promise = waiting.shift();
          promise.resolve();
        }
      }
      
      this.acquire = function() {
        if(counter < maxCount) {
          counter++
          return new Promise(resolve => {
          resolve(true);
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
  
      this.setMax = function(newMax: number) {
          maxCount = newMax
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
  } as any as { new (max: number): SemaphoreInterface; };

export const deriveKeyFromPassword = (password: string, salt: string, iterations: number = 200000, hash: string = "SHA-512", bitLength: number = 512, returnHex: boolean = true): Promise<any> => {
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

export const decryptMetadata = (data: string, key: string): Promise<any> => {
	return new Promise((resolve, reject) => {
        global.nodeThread.decryptMetadata({
            data,
            key
        }).then(resolve).catch(reject)
    })
}

export const encryptMetadata = (data: string, key: string): Promise<any> => {
	return new Promise((resolve, reject) => {
        global.nodeThread.encryptMetadata({
            data,
            key
        }).then(resolve).catch(reject)
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

export const decryptFileMetadataPrivateKey = (metadata: string, privateKey: string, uuid: string): Promise<any> => {
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

export const decryptFileMetadata = (masterKeys: string[], metadata: string, uuid: string): Promise<{ name: string, size: number, mime: string, key: string, lastModified: number }> => {
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
                        if(file.name.length > 0){
                            storage.set(cacheKey, JSON.stringify(file))
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

export const utf8ToHex = (str: string): string => {
    return Array.from(str).map(c => 
        c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : encodeURIComponent(c).replace(/\%/g, "").toLowerCase()
    ).join('')
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

export const getAPIKey = (): string => {
    try{
        return storage.getString("apiKey") || ""
    }
    catch(e){
        return ""
    }
}

export const getFileExt = (name: string): string => {
    if(name.indexOf(".") == -1){
        return ""
    }

    let ex = name.split(".")

    return ex[ex.length - 1].toLowerCase()
}

export const promiseAllSettled = (promises: Promise<any>[]) => Promise.all(
    promises.map(p => p
        .then((value: any) => ({
            status: "fulfilled",
            value
        }))
        .catch((reason: any) => ({
            status: "rejected",
            reason
        }))
    )
)