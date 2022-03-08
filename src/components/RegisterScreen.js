import React, { useState } from "react"
import { Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../i18n/i18n"
import { register } from "../lib/auth/register"
import { navigationAnimation } from "../lib/state"

export const RegisterScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    return (
        <KeyboardAvoidingView behavior="padding" style={{
            flex: 1,
            width: "100%",
            alignSelf: "center",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <Image source={require("../assets/images/appstore.png")} style={{
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
                    marginTop: 10
                }}
            />
            <TextInput
                onChangeText={setPassword}
                value={password}
                placeholder={i18n(lang, "passwordPlaceholder")}
                placeholderTextColor={"gray"}
                returnKeyType="done"
                secureTextEntry
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
                    marginTop: 12
                }}
            />
            <TextInput
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                placeholder={i18n(lang, "passwordConfirmPlaceholder")}
                placeholderTextColor={"gray"}
                returnKeyType="done"
                secureTextEntry
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
                    marginTop: 12
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
            }} onPress={() => register({ email, password, confirmPassword, setEmail, setPassword, setConfirmPassword, navigation })}>
                <Text style={{
                    color: "white"
                }}>
                    {i18n(lang, "registerBtn")}
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
                    {i18n(lang, "loginBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{
                width: "100%",
                maxWidth: "70%",
                height: "auto",
                alignItems: "center",
                marginTop: 20
            }} onPress={() => {
                navigationAnimation({ enable: true }).then(() => {
                    navigation.push("ResendConfirmationScreen")
                })
            }}>
                <Text style={{
                    color: "#0A84FF"
                }}>
                    {i18n(lang, "resendConfirmationBtn")}
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
}