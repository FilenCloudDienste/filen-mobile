import DeviceInfo from "react-native-device-info"
import { storage } from "../storage"
import { useStore } from "../state"
import { CommonActions } from "@react-navigation/native"
import { navigationAnimation } from "../state"
import { compareVersions } from "../helpers"
import { getLatestVersion } from "../api"

const CHECK_TIMEOUT = 500 // In seconds

const checkAppVersion = async ({ navigation }) => {
    if(typeof navigation !== "undefined"){
        if(typeof navigation.current !== "undefined"){
            if(typeof navigation.current.routes !== "undefined"){
                if(navigation.current.getState().routes.filter(route => route.name == "UpdateScreen").length !== 0){
                    return false
                }
            }
        }
    }

    const netInfo = useStore.getState().netInfo

    if(!netInfo.isConnected || !netInfo.isInternetReachable){
        return false
    }

    if((storage.getNumber("lastAppVersionCheck") + CHECK_TIMEOUT) > Math.floor(+new Date() / 1000)){
        return false
    }

    storage.set("lastAppVersionCheck", Math.floor(+new Date() / 1000))

    try{
        var latestVersion = await getLatestVersion()
        var currentVersion = DeviceInfo.getVersion()
        var needsUpdate = compareVersions(currentVersion, latestVersion) == "update"
    }
    catch(e){
        return console.log(e)
    }

    if(!needsUpdate.isNeeded){
        return false
    }

    navigationAnimation({ enable: true }).then(() => {
        navigation.current.dispatch(CommonActions.reset({
            index: 0,
            routes: [
                {
                    name: "UpdateScreen"
                }
            ]
        }))
    })

    return true
}

export default checkAppVersion