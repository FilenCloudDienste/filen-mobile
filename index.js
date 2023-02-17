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
    const max = new Date().getTime() + 25000

    const task = async () => {
        if(new Date().getTime() >= max) return

        const start = new Date().getTime()

        try{
            await runCameraUpload(1, true)
        }
        catch(e){
            console.error(e)
        }

        const timeTaken = new Date().getTime() - start

        if((new Date().getTime() + (timeTaken * 2)) >= max) return

        task().catch(console.error)
    }

    await task().catch(console.error)

    return BackgroundFetch.BackgroundFetchResult.NewData
})

setTimeout(() => runCameraUpload(), 5000)

registerBackgroundFetch().then(() => console.log("BG fetch registered")).catch(console.error)

AppRegistry.registerComponent(appName, () => App)