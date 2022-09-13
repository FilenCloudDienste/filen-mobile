import React, { useState, memo } from "react"
import { View, Text, Platform, TouchableOpacity, Pressable, TextInput, Keyboard, Alert, KeyboardAvoidingView } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"
import { useStore, navigationAnimation } from "../../lib/state"
import { enable2FA } from "../../lib/api"
import { CommonActions } from "@react-navigation/native"

export interface TwoFactorScreenProps {
    navigation: any,
    route: any
}

export const TwoFactorScreen = memo(({ navigation, route }: TwoFactorScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [enabled, setEnabled] = useState<boolean>(route.params.accountSettings.twoFactorEnabled == 1 ? true : false)
    const [accountSettings, setAccountSettings] = useState(route.params.accountSettings)
    const dimensions = useStore(state => state.dimensions)
    const [twoFactorKey, setTwoFactorKey] = useState<string>("")
    const setDisable2FATwoFactorDialogVisible = useStore(state => state.setDisable2FATwoFactorDialogVisible)

    return (
        <KeyboardAvoidingView behavior="position">
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
                        size={24} color={darkMode ? "white" : "black"}
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
                    {i18n(lang, "twoFactorAuthentication")}
                </Text>
            </View>
            <View
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                {
                    enabled ? (
                        <>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
                                    onPress={() => {
                                        Alert.alert(i18n(lang, "disable2FA"), i18n(lang, "disable2FAInfo"), [
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
                                                    Alert.alert(i18n(lang, "disable2FA"), i18n(lang, "areYouReallySure"), [
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
                                                                setDisable2FATwoFactorDialogVisible(true)
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
                                    }}
                                    title={i18n(lang, "disable2FA")}
                                />
                            </SettingsGroup>
                            <View
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                    marginTop: 5
                                }}
                            >
                                <View
                                    style={{
                                        width: "100%",
                                        height: "auto",
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingLeft: 10,
                                        paddingRight: 10,
                                        paddingTop: 10,
                                        paddingBottom: 10
                                    }}
                                >
                                    <View>
                                        <Text
                                            style={{
                                                color: "gray",
                                                fontSize: 11
                                            }}
                                        >
                                            {i18n(lang, "disable2FAInfo")}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <View
                                style={{
                                    backgroundColor: "white",
                                    width: "100%",
                                    height: dimensions.screen.width,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginTop: 10
                                }}
                            >
                                <QRCode
                                    value={"otpauth://totp/" + encodeURIComponent("Filen") + ":" + encodeURIComponent(accountSettings.email) + "?secret=" + encodeURIComponent(accountSettings.twoFactorKey) + "&issuer=" + encodeURIComponent("Filen") + "&digits=6&period=30"}
                                    size={dimensions.screen.width - 60}
                                    backgroundColor="white"
                                />
                            </View>
                            <SettingsGroup>
                                <Pressable
                                    style={{
                                        width: "100%",
                                        height: "auto"
                                    }}
                                >
                                    <View
                                        style={{
                                            width: "100%",
                                            height: "auto",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            paddingLeft: 10,
                                            paddingRight: 10,
                                            paddingTop: 10,
                                            paddingBottom: 10
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: darkMode ? "white" : "black",
                                                width: "70%"
                                            }}
                                            numberOfLines={1}
                                        >
                                            {accountSettings.twoFactorKey}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Clipboard.setString(accountSettings.twoFactorKey)

                                                showToast({ message: i18n(lang, "copiedToClipboard") })
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#0A84FF"
                                                }}
                                            >
                                                {i18n(lang, "copy")}
                                            </Text>
                                       </TouchableOpacity>
                                    </View>
                                </Pressable>
                            </SettingsGroup>
                            <SettingsGroup>
                                <Pressable
                                    style={{
                                        width: "100%",
                                        height: "auto"
                                    }}
                                >
                                    <View 
                                        style={{
                                            width: "100%",
                                            height: "auto",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            paddingLeft: 10,
                                            paddingRight: 10,
                                            paddingTop: 10,
                                            paddingBottom: 10
                                        }}
                                    >
                                        <TextInput
                                            onChangeText={setTwoFactorKey}
                                            value={twoFactorKey}
                                            placeholder={i18n(lang, "twoFactorPlaceholder")}
                                            placeholderTextColor={"gray"}
                                            autoCapitalize="none"
                                            autoComplete="off"
                                            returnKeyType="done"
                                            autoCorrect={false}
                                            style={{
                                                height: 35,
                                                width: "80%",
                                                maxWidth: "80%",
                                                padding: 5,
                                                backgroundColor: darkMode ? "#222222" : "lightgray",
                                                color: "gray",
                                                borderRadius: 10,
                                                paddingLeft: 10,
                                                paddingRight: 10
                                            }}
                                        />
                                        <TouchableOpacity
                                            onPress={() => {
                                                const code = twoFactorKey.trim()

                                                if(code.length == 0){
                                                    return false
                                                }

                                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                                Keyboard.dismiss()

                                                enable2FA({ code }).then(() => {
                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: i18n(lang, "twoFactorEnabledSuccess") })

                                                    navigationAnimation({ enable: false }).then(() => {
                                                        navigation.dispatch(CommonActions.reset({
                                                            index: 1,
                                                            routes: [
                                                                {
                                                                    name: "SettingsScreen"
                                                                },
                                                                {
                                                                    name: "SettingsAccountScreen"
                                                                }
                                                            ]
                                                        }))
                                                    })
                                                }).catch((err) => {
                                                    console.log(err)

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                                    showToast({ message: err.toString() })
                                                })
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#0A84FF",
                                                    paddingTop: 7
                                                }}
                                            >
                                                {i18n(lang, "enable")}
                                            </Text>
                                       </TouchableOpacity>
                                    </View>
                                </Pressable>
                            </SettingsGroup>
                        </>
                    )
                }
            </View>
        </KeyboardAvoidingView>
    )
})