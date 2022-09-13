import { AppRegistry } from "react-native"
import { App } from "./src/App"
import { name as appName } from "./app.json"
import { runCameraUpload } from "./src/lib/services/cameraUpload"
import * as TaskManager from "expo-task-manager"
import * as BackgroundFetch from "expo-background-fetch"

if(!__DEV__){
    console.log = () => {}
}

const registerBackgroundFetch = async () => {
    return BackgroundFetch.registerTaskAsync("background-fetch", {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true
    })
}

TaskManager.defineTask("background-fetch", async () => {
    const max = new Date().getTime() + 15000

    const task = async () => {
        if(new Date().getTime() >= max){
            return true
        }

        const start = new Date().getTime()

        try{
            await runCameraUpload(1, true)
        }
        catch(e){
            console.log(e)
        }

        const timeTaken = new Date().getTime() - start

        if((new Date().getTime() + (timeTaken * 2)) >= max){
            return true
        }

        return task()
    }

    await task()

    console.log("BG FETCH DONE")

    return BackgroundFetch.BackgroundFetchResult.NewData
})

runCameraUpload()

registerBackgroundFetch().then(() => {
    console.log("BG fetch registered")
}).catch(console.log)

AppRegistry.registerComponent(appName, () => App)