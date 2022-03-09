import React from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"
import { navigationAnimation } from "../lib/state"
import { deleteAccount, deleteAllFilesAndFolders, deleteAllVersionedFiles } from "../lib/api"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import { StackActions } from "@react-navigation/native"

export const SettingsAccountScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const setRedeemCodeDialogVisible = useStore(state => state.setRedeemCodeDialogVisible)

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
                    {i18n(lang, "accountSettings")}
                </Text>
            </View>
            <ScrollView style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <SettingsGroup marginTop={15}>
                    <SettingsButtonLinkHighlight onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("LanguageScreen"))
                        })
                    }} title={i18n(lang, "changeEmailPassword")} />
                    <SettingsButtonLinkHighlight onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("LanguageScreen"))
                        })
                    }} title={i18n(lang, "enable2FA")} />
                    <SettingsButtonLinkHighlight onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("GDPRScreen"))
                        })
                    }} title={i18n(lang, "showGDPR")} />
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight onPress={() => {
                        Alert.alert(i18n(lang, "deleteAllFiles"), i18n(lang, "deleteAllFilesInfo"), [
                            {
                                text: i18n(lang, "cancel"),
                                onPress: () => {
                                    return false
                                },
                                style: "cancel"
                            },
                            {
                                text: i18n(lang, "ok"),
                                onPress: () => {
                                    Alert.alert(i18n(lang, "deleteAllFiles"), i18n(lang, "areYouReallySure"), [
                                        {
                                            text: i18n(lang, "cancel"),
                                            onPress: () => {
                                                return false
                                            },
                                            style: "cancel"
                                        },
                                        {
                                            text: i18n(lang, "ok"),
                                            onPress: () => {
                                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                                deleteAllFilesAndFolders().then(() => {
                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: i18n(lang, "deleteAllFilesSuccess") })
                                                }).catch((err) => {
                                                    console.log(err)

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: err.toString() })
                                                })
                                            },
                                            style: "default"
                                        }
                                    ], {
                                        cancelable: true
                                    })
                                },
                                style: "default"
                            }
                        ], {
                            cancelable: true
                        })
                    }} title={i18n(lang, "deleteAllFiles")} />
                    <SettingsButtonLinkHighlight onPress={() => {
                        Alert.alert(i18n(lang, "deleteAllVersionedFiles"), i18n(lang, "deleteAllVersionedFilesInfo"), [
                            {
                                text: i18n(lang, "cancel"),
                                onPress: () => {
                                    return false
                                },
                                style: "cancel"
                            },
                            {
                                text: i18n(lang, "ok"),
                                onPress: () => {
                                    Alert.alert(i18n(lang, "deleteAllVersionedFiles"), i18n(lang, "areYouReallySure"), [
                                        {
                                            text: i18n(lang, "cancel"),
                                            onPress: () => {
                                                return false
                                            },
                                            style: "cancel"
                                        },
                                        {
                                            text: i18n(lang, "ok"),
                                            onPress: () => {
                                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                                deleteAllVersionedFiles().then(() => {
                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: i18n(lang, "deleteAllVersionedFilesSuccess") })
                                                }).catch((err) => {
                                                    console.log(err)

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: err.toString() })
                                                })
                                            },
                                            style: "default"
                                        }
                                    ], {
                                        cancelable: true
                                    })
                                },
                                style: "default"
                            }
                        ], {
                            cancelable: true
                        })
                    }} title={i18n(lang, "deleteAllVersionedFiles")} />
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight onPress={() => setRedeemCodeDialogVisible(true)} title={i18n(lang, "redeemACode")} />
                    <SettingsButtonLinkHighlight onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("InviteScreen"))
                        })
                    }} title={i18n(lang, "invite")} />
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsButtonLinkHighlight onPress={() => {
                        Alert.alert(i18n(lang, "deleteAccount"), i18n(lang, "deleteAccountInfo"), [
                            {
                                text: i18n(lang, "cancel"),
                                onPress: () => {
                                    return false
                                },
                                style: "cancel"
                            },
                            {
                                text: i18n(lang, "ok"),
                                onPress: () => {
                                    Alert.alert(i18n(lang, "deleteAccount"), i18n(lang, "areYouReallySure"), [
                                        {
                                            text: i18n(lang, "cancel"),
                                            onPress: () => {
                                                return false
                                            },
                                            style: "cancel"
                                        },
                                        {
                                            text: i18n(lang, "ok"),
                                            onPress: () => {
                                                
                                            },
                                            style: "default"
                                        }
                                    ], {
                                        cancelable: true
                                    })
                                },
                                style: "default"
                            }
                        ], {
                            cancelable: true
                        })
                    }} title={i18n(lang, "deleteAccount")} />
                </SettingsGroup>
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
}