import storage from "../../storage"
import * as FileSystem from "expo-file-system"
import { logger, fileAsyncTransport, mapConsoleTransport } from "react-native-logs"
import * as Network from "expo-network"
import { DeviceEventEmitter } from "react-native"
import { AppState } from "react-native"

const log = logger.createLogger({
    severity: "debug",
    transport: [fileAsyncTransport, mapConsoleTransport],
    transportOptions: {
        FS: FileSystem,
        fileName: "logs/isOnline.log"
    }
})

let INTERVAL: any = undefined
let STATE_INTERVAL: any = undefined

export const runNetworkCheck = async (skipTimeout: boolean = false) => {
    if(storage.getBoolean("isOnlineRunning") && !skipTimeout){
        return
    }

    if(!skipTimeout){
        storage.set("isOnlineRunning", true)
    }

    const controller = new AbortController()
    const timeoutTimer = setTimeout(() => controller.abort(), 10000)

    try{
        const response = await fetch("https://api.filen.io", {
            method: "GET",
            signal: controller.signal
        })

        if(response.status == 200){
            const text = await response.text()

            if(text.indexOf("endpoint") !== -1){
                storage.set("isOnline", true)

                DeviceEventEmitter.emit("networkInfoChange", { online: true, wifi: isWifi() })
            }
            else{
                storage.set("isOnline", false)

                DeviceEventEmitter.emit("networkInfoChange", { online: false, wifi: isWifi() })
            }
        }
        else{
            storage.set("isOnline", false)

            DeviceEventEmitter.emit("networkInfoChange", { online: false, wifi: isWifi() })
        }
    }
    catch(e){
        console.error(e)

        log.error(e)

        storage.set("isOnline", false)

        DeviceEventEmitter.emit("networkInfoChange", { online: false, wifi: isWifi() })
    }

    clearTimeout(timeoutTimer)

    if(!skipTimeout){
        storage.set("isOnlineRunning", false)
    }
}

export const runWifiCheck = () => {
    Network.getNetworkStateAsync().then((state) => {
        if(state.type == Network.NetworkStateType.WIFI){
            storage.set("isWifi", true)

            DeviceEventEmitter.emit("networkInfoChange", { online: isOnline(), wifi: true })
        }
        else{
            storage.set("isWifi", false)

            DeviceEventEmitter.emit("networkInfoChange", { online: isOnline(), wifi: false })
        }
    }).catch(log.error)
}

export const run = () => {
    clearInterval(INTERVAL)
    clearInterval(STATE_INTERVAL)

    runNetworkCheck()
    runWifiCheck()

    INTERVAL = setInterval(runNetworkCheck, 15000)
    STATE_INTERVAL = setInterval(runWifiCheck, 15000)
}

run()

AppState.addEventListener("change", (nextAppState) => {
    if(nextAppState == "active"){
        runNetworkCheck()
        runWifiCheck()
    }
})

export const isOnline = (): boolean => {
    try{
        return storage.getBoolean("isOnline")
    }
    catch{
        return false
    }
}

export const networkState = async () => {
    return Network.getNetworkStateAsync()
}

export const isWifi = (): boolean => {
    try{
        return storage.getBoolean("isWifi")
    }
    catch{
        return false
    }
}