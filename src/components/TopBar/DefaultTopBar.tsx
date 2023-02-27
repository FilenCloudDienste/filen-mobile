import React, { memo } from "react"
import { View, TouchableOpacity, Text } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"

export interface DefaultTopBarProps {
    onPressBack: Function,
    leftText: string,
    middleText: string,
    rightComponent?: React.ReactNode | undefined,
    height?: number,
    hideLeftComponent?: boolean
}

const DefaultTopBar = memo(({ onPressBack, leftText, middleText, rightComponent, height, hideLeftComponent }: DefaultTopBarProps) => {
    const darkMode = useDarkMode()

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                height: typeof height !== "undefined" ? height : undefined
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
                hitSlop={{
                    top: 15,
                    bottom: 15,
                    right: 15,
                    left: 15
                }}
                onPress={typeof hideLeftComponent == "undefined" ? () => onPressBack() : undefined}
            >
                {
                    typeof hideLeftComponent == "undefined" && (
                        <>
                            <Ionicon
                                name="chevron-back"
                                size={28}
                                color={getColor(darkMode, "linkPrimary")}
                            />
                            <Text
                                style={{
                                    fontSize: 17,
                                    color: getColor(darkMode, "linkPrimary"),
                                    fontWeight: "400",
                                    maxWidth: "80%"
                                }}
                                numberOfLines={1}
                            >
                                {leftText}
                            </Text>
                        </>
                    )
                }
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