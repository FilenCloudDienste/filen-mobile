import { Platform } from "react-native"
import * as NavigationBar from "expo-navigation-bar"
import * as StatusBar from "expo-status-bar"

export const setStatusBarStyle = (darkMode: boolean): void => {
    if(Platform.OS == "android"){
        NavigationBar.setBackgroundColorAsync(darkMode ? "black" : "white").catch(console.log)
        NavigationBar.setBorderColorAsync(darkMode ? "black" : "white").catch(console.log)
        NavigationBar.setButtonStyleAsync(darkMode ? "dark" : "light").catch(console.log)
    }

    StatusBar.setStatusBarBackgroundColor(darkMode ? "black" : "white", false)
    StatusBar.setStatusBarStyle(darkMode ? "light" : "dark")
}