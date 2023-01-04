import React, { memo } from "react"
import { View } from "react-native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"
import FastImage from "react-native-fast-image"

export const SetupScreen = memo(() => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                height: "100%",
                backgroundColor: getColor(darkMode, "backgroundPrimary"),
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            <FastImage
                source={require("../../assets/images/logo_animated.gif")}
                style={{
                    width: 100,
                    height: 100
                }}
            />
        </View>
    )
})