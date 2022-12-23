import React, { memo } from "react"
import { View, TouchableOpacity, Text } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"

export interface DefaultTopBarProps {
    onPressBack: Function,
    leftText: string,
    middleText: string,
    rightComponent?: React.ReactNode | undefined
}

const DefaultTopBar = memo(({ onPressBack, leftText, middleText, rightComponent }: DefaultTopBarProps) => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
            }}
        >
            <TouchableOpacity
                style={{
                    paddingLeft: 10,
                    alignItems: "center",
                    flexDirection: "row",
                    width: "33%",
                    justifyContent: "flex-start"
                }}
                onPress={() => onPressBack()}
            >
                <Ionicon
                    name="chevron-back"
                    size={28}
                    color="#0A84FF"
                />
                <Text
                    style={{
                        fontSize: 17,
                        color: "#0A84FF",
                        fontWeight: "400",
                        maxWidth: "80%"
                    }}
                    numberOfLines={1}
                >
                    {leftText}
                </Text>
            </TouchableOpacity>
            <View
                style={{
                    width: "33%",
                    alignItems: "center"
                }}
            >
                <Text
                    style={{
                        fontSize: 17,
                        color: getColor(darkMode, "textPrimary"),
                        fontWeight: "600"
                    }}
                    numberOfLines={1}
                >
                    {middleText}
                </Text>
            </View>
            {
                typeof rightComponent == "undefined" ? (
                    <View style={{ width: "33%" }} />
                ) : rightComponent
            }
        </View>
    )
})

export default DefaultTopBar