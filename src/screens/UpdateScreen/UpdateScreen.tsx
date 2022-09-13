import React, { memo } from "react"
import { View, Text, TouchableOpacity, Linking, Platform } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"

const APPSTORE_LINK = "itms-apps://itunes.apple.com/app/id1549224518"
const PLAYSTORE_LINK = "market://details?id=io.filen.app"

export const UpdateScreen = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    return (
        <View
            style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkMode ? "black" : "white"
            }}
        >
            <View 
                style={{
                    width: "70%",
                    height: "auto",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -50
                }}
            >
                <Ionicon
                    name="information-circle-outline"
                    size={60}
                    color={darkMode ? "white" : "black"}
                />
                <Text
                    style={{
                        color: darkMode ? "white" : "black",
                        fontSize: 20,
                        marginTop: 15
                    }}
                >
                    {i18n(lang, "updateAvailable")}
                </Text>
                <Text 
                    style={{
                        color: darkMode ? "white" : "black",
                        textAlign: "center",
                        marginTop: 15
                    }}
                >
                    {i18n(lang, "updateNeeded")}
                </Text>
                <TouchableOpacity
                    style={{
                        marginTop: 25
                    }}
                    onPress={() => {
                        const link = Platform.OS == "android" ? PLAYSTORE_LINK : APPSTORE_LINK

                        Linking.canOpenURL(link).then((supported) => {
                            if(supported){
                                Linking.openURL(link)
                            }
                            else{
                                showToast({ message: i18n(lang, "couldNotOpenAppStoreLink") })
                            }
                        }).catch((err) => {
                            console.log(err)

                            showToast({ message: i18n(lang, "couldNotOpenAppStoreLink") })
                        })
                    }}
                >
                    <Text
                        style={{
                            color: "#0A84FF"
                        }}
                    >
                        {i18n(lang, "updateNow")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})