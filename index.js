import { AppRegistry } from "react-native"
import { name as appName } from "./app.json"
import "./src/lib/globals"
import "./src/lib/node"
import { App } from "./src/App"
import { runCameraUpload } from "./src/lib/services/cameraUpload"

if(!__DEV__){
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
}

setTimeout(() => runCameraUpload(), 5000)

AppRegistry.registerComponent(appName, () => App)