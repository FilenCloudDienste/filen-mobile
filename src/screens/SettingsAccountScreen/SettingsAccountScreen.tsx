import React, { useState, useEffect, memo } from "react"
import { View, ScrollView, Linking, Alert, ActivityIndicator, DeviceEventEmitter } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { navigationAnimation } from "../../lib/state"
import { deleteAccount, deleteAllFilesAndFolders, deleteAllVersionedFiles, getSettings } from "../../lib/api"
import { useStore } from "../../lib/state"
import { showToast } from "../../components/Toasts"
import { StackActions } from "@react-navigation/native"
import { logout } from "../../lib/services/auth/logout"
import { formatBytes } from "../../lib/helpers"
import { useMountedState } from "react-use"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"
import type { NavigationContainerRef } from "@react-navigation/native"

export interface SettingsAccountScreenProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const SettingsAccountScreen = memo(({ navigation }: SettingsAccountScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
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
            <DefaultTopBar
                onPressBack={() => navigation.goBack()}
                leftText={i18n(lang, "settings")}
                middleText={i18n(lang, "accountSettings")}
            />
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: getColor(darkMode, "backgroundPrimary")
                }}
            >
                {
                    isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={getColor(darkMode, "textPrimary")}
                            style={{
                                marginTop: "70%"
                            }}
                        />
                    ) : (
                        <>
                            <SettingsGroup marginTop={15}>
                                <SettingsButtonLinkHighlight
                                    onPress={() => {
                                        Linking.canOpenURL("https://drive.filen.io").then((supported) => {
                                            if(supported){
                                                Linking.openURL("https://drive.filen.io").catch(console.error)
                                            }
                                        }).catch(console.error)
                                    }}
                                    title={i18n(lang, "changeEmailPassword")}
                                    withBottomBorder={true}
                                    borderTopRadius={10}
                                />
                                <SettingsButtonLinkHighlight
                                    onPress={() => {
                                        Linking.canOpenURL("https://drive.filen.io").then((supported) => {
                                            if(supported){
                                                Linking.openURL("https://drive.filen.io").catch(console.error)
                                            }
                                        }).catch(console.error)
                                    }}
                                    title={i18n(lang, accountSettings.twoFactorEnabled ? "disable2FA" : "enable2FA")}
                                    withBottomBorder={true}
                                />
                                <SettingsButtonLinkHighlight
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("GDPRScreen"))
                                        })
                                    }}
                                    title={i18n(lang, "showGDPR")}
                                    withBottomBorder={true}
                                />
                                <SettingsButtonLinkHighlight
                                    onPress={() => {
                                        navigationAnimation({ enable: true }).then(() => {
                                            navigation.dispatch(StackActions.push("InviteScreen"))
                                        })
                                    }}
                                    title={i18n(lang, "invite")}
                                    borderBottomRadius={10}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
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
                                    withBottomBorder={true}
                                    borderTopRadius={10}
                                />
                                <SettingsButtonLinkHighlight
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
                                    borderBottomRadius={10}
                                />
                            </SettingsGroup>
                            <SettingsGroup>
                                <SettingsButtonLinkHighlight
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
                                    withBottomBorder={true}
                                    borderTopRadius={10}
                                />
                                <SettingsButtonLinkHighlight
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

                                                                        DeviceEventEmitter.emit("openDeleteAccountTwoFactorDialog")

                                                                        return
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
                                    borderBottomRadius={10}
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