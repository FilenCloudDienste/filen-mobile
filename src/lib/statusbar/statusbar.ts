import { Platform } from "react-native"
import * as NavigationBar from "expo-navigation-bar"
import * as StatusBar from "expo-status-bar"
import { getColor } from "../../style"

export const setStatusBarStyle = (darkMode: boolean): void => {
    if(Platform.OS == "android"){
        NavigationBar.setBackgroundColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.error)
        NavigationBar.setBorderColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.error)
        NavigationBar.setButtonStyleAsync(darkMode ? "dark" : "light").catch(console.error)
        StatusBar.setStatusBarBackgroundColor(getColor(darkMode, "backgroundPrimary"), true)
        StatusBar.setStatusBarTranslucent(false)
    }
    
    StatusBar.setStatusBarStyle(darkMode ? "light" : "dark")
}

export default setStatusBarStyle