import { registerPlugin, Capacitor } from "@capacitor/core"
import { fetchBlobWriter } from "./workers"

const BlobWriter = registerPlugin("BlobWriter")

let cachedConfig = undefined

function getConfig(){
    return new Promise((resolve, reject) => {
        if(typeof cachedConfig !== "undefined"){
            return resolve(cachedConfig)
        }

        BlobWriter.get_config().then((config) => {
            cachedConfig = config

            config = null

            return resolve(cachedConfig)
        }).catch((err) => {
            return reject(err)
        })
    })
}

function writeBlob(options){
    return new Promise((resolve, reject) => {
        if(!Capacitor.isNative){
            return resolve("not native")
        }
        
        let {
            path,
            blob,
            recursive,
            append
        } = options

        return window.customVariables.blobWriterSemaphore.acquire().then(() => {
            return getConfig().then((config) => {
                let { base_url, auth_token } = config
                let absolute_path = path.replace("file://", "")
        
                return fetchBlobWriter(base_url + absolute_path + (recursive ? "?recursive=true" : "?recursive=false") + (append ? "&append=true" : "&append=false"), {
                    headers: {
                        authorization: auth_token
                    },
                    method: "PUT",
                    body: blob
                }, 300000)
            }).then((status) => {
                window.customVariables.blobWriterSemaphore.release()

                if(status !== 204){
                    reject(new Error("Bad HTTP status: " + status))
    
                    blob = null
                    status = null
    
                    return false
                }
        
                blob = null
                status = null
        
                return resolve(path)
            }).catch((err) => {
                window.customVariables.blobWriterSemaphore.release()

                blob = null
        
                return reject(err)
            })
        }).catch((err) => {
            blob = null
    
            return reject(err)
        })
    })
}

export default writeBlob