import { Platform } from "react-native"
import * as NavigationBar from "expo-navigation-bar"
import * as StatusBar from "expo-status-bar"
import { getColor } from "../../style"

export const setStatusBarStyle = (darkMode: boolean): void => {
    if(Platform.OS == "android"){
        NavigationBar.setBackgroundColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.log)
        NavigationBar.setBorderColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.log)
        NavigationBar.setButtonStyleAsync(darkMode ? "dark" : "light").catch(console.log)
        StatusBar.setStatusBarBackgroundColor(getColor(darkMode, "backgroundPrimary"), false)
    }

    StatusBar.setStatusBarStyle(darkMode ? "light" : "dark")
}

export default setStatusBarStyle