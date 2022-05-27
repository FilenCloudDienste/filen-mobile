import { StatusBar } from "react-native"
import changeNavigationBarColor from "react-native-navigation-bar-color"

export const setStatusBarStyle = (darkMode) => {
    if(Platform.OS == "android"){
        StatusBar.setBackgroundColor(darkMode ? "black" : "white")
        
        changeNavigationBarColor(darkMode ? "black" : "white", darkMode ? false : true, false)
    }

    StatusBar.setBarStyle(darkMode ? "light-content" : "dark-content")

}