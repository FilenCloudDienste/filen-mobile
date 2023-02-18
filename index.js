import "./src/lib/globals"
import "./src/lib/node"
import { AppRegistry } from "react-native"
import { App } from "./src/App"
import { name as appName } from "./app.json"
import { runCameraUpload } from "./src/lib/services/cameraUpload"
import * as TaskManager from "expo-task-manager"
import * as BackgroundFetch from "expo-background-fetch"

if(!__DEV__){
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
}

const registerBackgroundFetch = async () => {
    return BackgroundFetch.registerTaskAsync("background-fetch", {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true
    })
}

TaskManager.defineTask("background-fetch", async () => {
    try{
        await runCameraUpload(1, true)
    }
    catch(e){
        console.error(e)
    }

    return BackgroundFetch.BackgroundFetchResult.NewData
})

setTimeout(() => runCameraUpload(), 5000)

registerBackgroundFetch().then(() => console.log("BG fetch registered")).catch(console.error)

AppRegistry.registerComponent(appName, () => App)