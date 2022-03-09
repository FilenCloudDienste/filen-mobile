import React, { useState, useEffect } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Share } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { showToast } from "./Toasts"
import { getAccount } from "../lib/api"
import { SettingsGroup } from "./SettingsScreen"
import Clipboard from "@react-native-clipboard/clipboard"

export const InviteScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [isLoading, setIsLoading] = useState(true)
    const [accountData, setAccountData] = useState({})

    useEffect(() => {
        getAccount().then((data) => {
            setAccountData(data)
            setIsLoading(false)
        }).catch((err) => {
            console.log(err)

            setIsLoading(false)

            showToast({ message: err.toString() })
        })
    }, [])

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
                    {i18n(lang, "invite")}
                </Text>
            </View>
            <ScrollView style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                {
                    isLoading ? (
                        <ActivityIndicator size={"small"} color={darkMode ? "white" : "black"} style={{
                            marginTop: "70%"
                        }} />
                    ) : (
                        <>
                            <SettingsGroup>
                                <View style={{
                                    width: "100%",
                                    height: "auto"
                                }}>
                                    <View style={{
                                        width: "100%",
                                        height: "auto",
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingLeft: 10,
                                        paddingRight: 10,
                                        paddingTop: 10,
                                        paddingBottom: 10
                                    }}>
                                        <View>
                                            <Text style={{
                                                color: darkMode ? "white" : "black"
                                            }}>
                                                {i18n(lang, "inviteInfo")}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </SettingsGroup>
                            <SettingsGroup>
                                <View style={{
                                    width: "100%",
                                    height: "auto"
                                }}>
                                    <View style={{
                                        width: "100%",
                                        height: "auto",
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingLeft: 10,
                                        paddingRight: 10,
                                        paddingTop: 10,
                                        paddingBottom: 10
                                    }}>
                                        <View>
                                            <Text style={{
                                                color: darkMode ? "white" : "black"
                                            }}>
                                                {i18n(lang, "inviteCount")}
                                            </Text>
                                        </View>
                                        <Text>
                                            {accountData.referCount}/{accountData.refLimit}
                                        </Text>
                                    </View>
                                </View>
                            </SettingsGroup>
                            <SettingsGroup>
                                <Pressable style={{
                                    width: "100%",
                                    height: "auto"
                                }} onPress={() => {
                                    Clipboard.setString("https://filen.io/r/" + accountData.refId)

                                    showToast({ message: i18n(lang, "copiedToClipboard") })
                                }}>
                                    <View style={{
                                        width: "100%",
                                        height: "auto",
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingLeft: 10,
                                        paddingRight: 10,
                                        paddingTop: 10,
                                        paddingBottom: 10
                                    }}>
                                        <Text style={{
                                            color: darkMode ? "white" : "black",
                                            width: "70%"
                                        }} numberOfLines={1}>
                                            https://filen.io/r/{accountData.refId}
                                        </Text>
                                        <TouchableOpacity onPress={() => {
                                            Share.share({
                                                message: i18n(lang, "shareRefLinkMessage"),
                                                url: "https://filen.io/r/" + accountData.refId
                                            })
                                        }}>
                                            <Text style={{
                                                color: "#0A84FF"
                                            }}>
                                                {i18n(lang, "share")}
                                            </Text>
                                       </TouchableOpacity>
                                        <TouchableOpacity onPress={() => {
                                            Clipboard.setString("https://filen.io/r/" + accountData.refId)

                                            showToast({ message: i18n(lang, "copiedToClipboard") })
                                        }}>
                                            <Text style={{
                                                color: "#0A84FF"
                                            }}>
                                                {i18n(lang, "copy")}
                                            </Text>
                                       </TouchableOpacity>
                                    </View>
                                </Pressable>
                            </SettingsGroup>
                            <View style={{
                                width: "100%",
                                height: "auto",
                                paddingLeft: 8,
                                paddingRight: 8,
                                marginTop: 5
                            }}>
                                <View style={{
                                    width: "100%",
                                    height: "auto",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    paddingTop: 10,
                                    paddingBottom: 10
                                }}>
                                    <View>
                                        <Text style={{
                                            color: "gray",
                                            fontSize: 10
                                        }}>
                                            {i18n(lang, "inviteInfo2")}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    )
                }
            </ScrollView>
        </>
    )
}