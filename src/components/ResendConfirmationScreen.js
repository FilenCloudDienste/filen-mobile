import React, { useState, memo } from "react"
import { Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../i18n/i18n"
import { apiRequest } from "../lib/api"
import { useStore } from "../lib/state"
import { showToast } from "./Toasts"
import { Keyboard } from "react-native"

export const ResendConfirmationScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [email, setEmail] = useState("")

    return (
        <KeyboardAvoidingView behavior="padding" style={{
            flex: 1,
            width: "100%",
            alignSelf: "center",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <Image source={darkMode ? require("../assets/images/light_logo.png") : require("../assets/images/dark_logo.png")} style={{
                width: 80,
                height: 80,
                borderRadius: 90,
                marginBottom: 20
            }} />
            <TextInput
                onChangeText={setEmail}
                value={email}
                placeholder={i18n(lang, "emailPlaceholder")}
                placeholderTextColor={"gray"}
                autoCapitalize="none"
                autoCompleteType="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                secureTextEntry={false}
                style={{
                    height: 35,
                    width: "100%",
                    maxWidth: "70%",
                    padding: 5,
                    paddingLeft: 10,
                    paddingRight: 10,
                    backgroundColor: darkMode ? "#222222" : "lightgray",
                    color: "gray",
                    borderRadius: 10,
                    marginTop: 20
                }}
            />
            <TouchableOpacity style={{
                backgroundColor: darkMode ? "#444444" : "gray",
                borderRadius: 10,
                width: "100%",
                maxWidth: "70%",
                height: 30,
                padding: 5,
                alignItems: "center",
                marginTop: 12
            }} onPress={async () => {
                useStore.setState({ fullscreenLoadingModalVisible: true })

                Keyboard.dismiss()

                const resendEmail = email.trim()

                setEmail("")

                if(!resendEmail){
                    useStore.setState({ fullscreenLoadingModalVisible: false })

                    return showToast({ message: i18n(lang, "invalidEmail") })
                }

                try{
                    var res = await apiRequest({
                        method: "POST",
                        endpoint: "/v1/confirmation/resend",
                        data: {
                            email: resendEmail
                        }
                    })
                }
                catch(e){
                    console.log(e)

                    useStore.setState({ fullscreenLoadingModalVisible: false })

                    return showToast({ message: e.toString() })
                }

                if(!res.status){
                    useStore.setState({ fullscreenLoadingModalVisible: false })

                    return showToast({ message: res.message })
                }

                useStore.setState({ fullscreenLoadingModalVisible: false })

                return showToast({ message: i18n(lang, "resendConfirmationSent", true, ["__EMAIL__"], [resendEmail]) })
            }}>
                <Text style={{
                    color: "white"
                }}>
                    {i18n(lang, "resendConfirmationBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{
                width: "100%",
                maxWidth: "70%",
                height: "auto",
                alignItems: "center",
                marginTop: 30
            }} onPress={() => navigation.goBack()}>
                <Text style={{
                    color: "#0A84FF"
                }}>
                    {i18n(lang, "back")}
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
})