import React, { memo } from "react"
import { View, ActivityIndicator } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"

export const SetupScreen = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    return (
        <View
            style={{
                height: "100%",
                backgroundColor: darkMode ? "black" : "white",
                justifyContent: "center"
            }}
        >
            <ActivityIndicator
                size={"small"}
                color={darkMode ? "white" : "black"}
            />
        </View>
    )
})