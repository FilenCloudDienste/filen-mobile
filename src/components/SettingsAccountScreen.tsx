import React, { useState, useEffect, memo } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "./SettingsScreen"
import { navigationAnimation } from "../lib/state"
import { deleteAccount, deleteAllFilesAndFolders, deleteAllVersionedFiles, getSettings } from "../lib/api"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import { StackActions } from "@react-navigation/native"
import { logout } from "../lib/auth/logout"
import { formatBytes } from "../lib/helpers"
import { useMountedState } from "react-use"

export interface SettingsAccountScreenProps {
    navigation: any
}

export const SettingsAccountScreen = memo(({ navigation }: SettingsAccountScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const setRedeemCodeDialogVisible = useStore(state => state.setRedeemCodeDialogVisible)
    const setDeleteAccountTwoFactorDialogVisible = useStore(state => state.setDeleteAccountTwoFactorDialogVisible)
    const [accountSettings, setAccountSettings] = useState<any>({})
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const isMounted: () => boolean = useMountedState()

    useEffect(() => {
        getSettings().then((settings) => {
            if(isMounted()){
                setAccountSettings(settings)
                setIsLoading(false)
            }
        }).catch((err) => {
            console.log(err)

            showToast({ message: err.toString() })
        })
    }, [])

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
                    {i18n(lang, "accountSettings")}
                </Text>
            </View>
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                {
                    isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={darkMode ? "white" : "black"}
                            style={{
                                marginTop: "70%"
                            }}
                        />
                    ) : (
                        <>
                            {/* @ts-ignore */}
                            <SettingsGroup marginTop={15}>
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("ChangeEmailPasswordScreen"))
                                        })
                                    }}
                                    title={i18n(lang, "changeEmailPassword")}
                                />
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("TwoFactorScreen", {
                                                accountSettings
                                            }))
                                        })
                                    }}
                                    title={i18n(lang, accountSettings.twoFactorEnabled ? "disable2FA" : "enable2FA")}
                                />
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("GDPRScreen"))
                                        })
                                    }}
                                    title={i18n(lang, "showGDPR")}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    rightText={formatBytes(accountSettings.storageUsed)}
                                    onPress={() => {
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

                                                                    setAccountSettings((prev: any) => ({ ...prev, storageUsed: 0  }))
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
                                    }}
                                    title={i18n(lang, "deleteAllFiles")}
                                />
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    rightText={formatBytes(accountSettings.versionedStorage)}
                                    onPress={() => {
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

                                                                    setAccountSettings((prev: any) => ({ ...prev, storageUsed: (prev.storageUsed - prev.versionedStorage) }))
                                                                    setAccountSettings((prev: any) => ({ ...prev, versionedStorage: 0  }))
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
                                    }}
                                    title={i18n(lang, "deleteAllVersionedFiles")}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => setRedeemCodeDialogVisible(true)}
                                    title={i18n(lang, "redeemACode")}
                                />
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("InviteScreen"))
                                        })
                                    }}
                                    title={i18n(lang, "invite")}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
                                        Alert.alert(i18n(lang, "logout"), i18n(lang, "areYouReallySure"), [
                                            {
                                                text: i18n(lang, "cancel"),
                                                onPress: () => {
                                                    return false
                                                },
                                                style: "cancel"
                                            },
                                            {
                                                text: i18n(lang, "ok"),
                                                onPress: () => logout({ navigation }),
                                                style: "default"
                                            }
                                        ], {
                                            cancelable: true
                                        })
                                    }}
                                    title={i18n(lang, "logout")}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
                                    // @ts-ignore
                                    onPress={() => {
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
                                                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                                                getSettings().then((settings) => {
                                                                    if(settings.twoFactorEnabled){
                                                                        useStore.setState({ fullscreenLoadingModalVisible: false })

                                                                        return setDeleteAccountTwoFactorDialogVisible(true)
                                                                    }

                                                                    deleteAccount({ twoFactorKey: "XXXXXX" }).then(() => {
                                                                        useStore.setState({ fullscreenLoadingModalVisible: false })

                                                                        logout({ navigation })
                                                                    }).catch((err) => {
                                                                        console.log(err)

                                                                        useStore.setState({ fullscreenLoadingModalVisible: false })

                                                                        showToast({ message: err.toString() })
                                                                    })
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
                                    }}
                                    title={i18n(lang, "deleteAccount")}
                                />
                            </SettingsGroup>
                            <View 
                                style={{
                                    height: 25
                                }} 
                            />
                        </>
                    )
                }
            </ScrollView>
        </>
    )
})