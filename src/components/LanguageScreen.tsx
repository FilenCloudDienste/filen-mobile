import React, { memo } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"
import type { NavigationContainerRef } from "@react-navigation/native"

export interface LanguageScreenProps {
    navigation: NavigationContainerRef<{}>
}

export const LanguageScreen = memo(({ navigation }: LanguageScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    return (
        <>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <TouchableOpacity
                    style={{
                        marginTop: Platform.OS == "ios" ? 17 : 4,
                        marginLeft: 15,
                    }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicon
                        name="chevron-back"
                        size={24}
                        color={darkMode ? "white" : "black"}
                    />
                </TouchableOpacity>
                <Text
                    style={{
                        color: darkMode ? "white" : "black",
                        fontWeight: "bold",
                        fontSize: 24,
                        marginLeft: 10,
                        marginTop: Platform.OS == "ios" ? 15 : 0
                    }}
                >
                    {i18n(lang, "language")}
                </Text>
            </View>
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <SettingsGroup>
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="English"
                        onPress={() => setLang("en")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Deutsch"
                        onPress={() => setLang("de")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Français"
                        onPress={() => setLang("fr")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Italiano"
                        onPress={() => setLang("it")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Nederlands"
                        onPress={() => setLang("nl")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Polski"
                        onPress={() => setLang("pl")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Русский"
                        onPress={() => setLang("ru")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Українська"
                        onPress={() => setLang("uk")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="日本語"
                        onPress={() => setLang("ja")} 
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="简体字"
                        onPress={() => setLang("zh")}
                    />
                    <SettingsButtonLinkHighlight
                        // @ts-ignore
                        title="Türk"
                        onPress={() => setLang("tr")}
                    />
                </SettingsGroup>
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
})
