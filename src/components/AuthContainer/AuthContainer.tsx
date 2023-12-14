import React, { memo } from "react"
import { TouchableOpacity, KeyboardAvoidingView } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import storage from "../../lib/storage"
import { Image } from "expo-image"

const AuthContainer = memo(({ children }: { children: React.ReactNode[] }) => {
	const darkMode = useDarkMode()

	return (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={65}
			style={{
				flex: 1,
				width: "100%",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<TouchableOpacity onPress={() => storage.set("darkMode", !darkMode)}>
				<Image
					source={darkMode ? require("../../assets/images/light_logo.png") : require("../../assets/images/dark_logo.png")}
					cachePolicy="memory-disk"
					style={{
						width: 100,
						height: 100,
						marginBottom: 30
					}}
				/>
			</TouchableOpacity>
			{children}
		</KeyboardAvoidingView>
	)
})

export default AuthContainer
