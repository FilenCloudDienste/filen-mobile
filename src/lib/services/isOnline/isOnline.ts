import storage from "../../storage"
import * as Network from "expo-network"
import { DeviceEventEmitter } from "react-native"
import { AppState } from "react-native"

let INTERVAL: any
let STATE_INTERVAL: any

export const runNetworkCheck = async (skipTimeout: boolean = false) => {
    if(storage.getBoolean("isOnlineRunning") && !skipTimeout){
        return
    }

    if(!skipTimeout){
        storage.set("isOnlineRunning", true)
    }

    const controller = new AbortController()
    const timeoutTimer = setTimeout(() => {
        controller.abort()

        storage.set("isOnlineRunning", false)
    }, 15000)

    try{
        const response = await fetch("https://api.filen.io/health?noCache=" + new Date().getTime(), {
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

        storage.set("isOnline", false)

        DeviceEventEmitter.emit("networkInfoChange", { online: false, wifi: isWifi() })
    }

    clearTimeout(timeoutTimer)

    storage.set("isOnlineRunning", false)
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
    }).catch(console.error)
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
    return storage.getBoolean("isOnline")
}

export const networkState = async () => {
    return Network.getNetworkStateAsync()
}

export const isWifi = (): boolean => {
    return storage.getBoolean("isWifi")
}