import React, { memo } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"

export const LanguageScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    return (
        <>
            <View style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <TouchableOpacity style={{
                    marginTop: Platform.OS == "ios" ? 17 : 4,
                    marginLeft: 15,
                }} onPress={() => navigation.goBack()}>
                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                </TouchableOpacity>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 24,
                    marginLeft: 10,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}>
                    {i18n(lang, "language")}
                </Text>
            </View>
            <ScrollView style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight title="English" onPress={() => {
                        setLang("en")
                    }} />
                    <SettingsButtonLinkHighlight title="Français" onPress={() => {
                        setLang("fr")
                    }} />
                    <SettingsButtonLinkHighlight title="Italiano" onPress={() => {
                        setLang("it")
                    }} />
                    <SettingsButtonLinkHighlight title="Русский" onPress={() => {
                        setLang("ru")
                    }} />
                    <SettingsButtonLinkHighlight title="Українська" onPress={() => {
                        setLang("uk")
                    }} />
                    <SettingsButtonLinkHighlight title="日本" onPress={() => {
                        setLang("ja")
                    }} />
                </SettingsGroup>
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
})
