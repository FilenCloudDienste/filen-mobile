import React, { memo } from "react"
import { View, Image } from "react-native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"

export const SetupScreen = memo(() => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: getColor(darkMode, "backgroundPrimary"),
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            <Image
                source={require("../../assets/images/logo_animated.gif")}
                style={{
                    width: 100,
                    height: 100
                }}
            />
        </View>
    )
})