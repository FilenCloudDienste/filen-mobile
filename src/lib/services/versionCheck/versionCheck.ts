import DeviceInfo from "react-native-device-info"
import storage from "../../storage"
import { useStore } from "../../state"
import { CommonActions } from "@react-navigation/native"
import { navigationAnimation } from "../../state"
import { compareVersions } from "../../helpers"
import { getLatestVersion } from "../../api"

const CHECK_TIMEOUT = 500 // In seconds

export const checkAppVersion = async ({ navigation }: { navigation: any }): Promise<void> => {
    if(typeof navigation !== "undefined"){
        if(typeof navigation.current !== "undefined"){
            if(typeof navigation.current.routes !== "undefined"){
                if(navigation.current.getState().routes.filter((route: any) => route.name == "UpdateScreen").length !== 0){
                    return
                }
            }
        }
    }

    const netInfo = useStore.getState().netInfo

    if(!netInfo.isConnected || !netInfo.isInternetReachable){
        return
    }

    if((storage.getNumber("lastAppVersionCheck") + CHECK_TIMEOUT) > Math.floor(+new Date() / 1000)){
        return
    }

    storage.set("lastAppVersionCheck", Math.floor(+new Date() / 1000))

    try{
        var latestVersion = await getLatestVersion()
        var currentVersion = DeviceInfo.getVersion()
        var needsUpdate = compareVersions(currentVersion, latestVersion) == "update"
    }
    catch(e){
        console.log(e)

        return
    }

    if(!needsUpdate){
        return
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
}

export default checkAppVersion