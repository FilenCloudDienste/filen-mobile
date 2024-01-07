import { Platform } from "react-native"
import * as NavigationBar from "expo-navigation-bar"
import * as StatusBar from "expo-status-bar"
import { getColor } from "../../style"

export const setStatusBarStyle = (darkMode: boolean): void => {
	StatusBar.setStatusBarStyle(darkMode ? "light" : "dark")

	if (Platform.OS === "android") {
		NavigationBar.setBackgroundColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.error)

		if (Platform.constants.Version >= 28) {
			NavigationBar.setBorderColorAsync(getColor(darkMode, "backgroundPrimary")).catch(console.error)
		}

		NavigationBar.setButtonStyleAsync(darkMode ? "light" : "dark").catch(console.error)

		StatusBar.setStatusBarBackgroundColor(getColor(darkMode, "backgroundPrimary"), false)
		StatusBar.setStatusBarTranslucent(false)
	}
}

export default setStatusBarStyle
