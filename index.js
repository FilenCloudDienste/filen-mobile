import { AppRegistry } from "react-native"
import { App } from "./src/App"
import { name as appName } from "./app.json"
import { runCameraUpload } from "./src/lib/services/cameraUpload"

if(!__DEV__){
    console.log = () => {}
}

runCameraUpload()

AppRegistry.registerComponent(appName, () => App)