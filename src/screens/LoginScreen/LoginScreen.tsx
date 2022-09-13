import React, { useState, memo } from "react"
import { Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { i18n } from "../../i18n"
import { login } from "../../lib/auth/login"
import { navigationAnimation } from "../../lib/state"

export interface LoginScreenProps {
    navigation: any,
    setSetupDone: React.Dispatch<React.SetStateAction<boolean>>
}

export const LoginScreen = memo(({ navigation, setSetupDone }: LoginScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [twoFactorKey, setTwoFactorKey] = useState<string>("")
    const [showTwoFactorField, setShowTwoFactorField] = useState<boolean>(false)

    return (
        <KeyboardAvoidingView
            behavior="padding"
            style={{
                flex: 1,
                width: "100%",
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: darkMode ? "black" : "white"
            }}
        >
            <Image
                source={darkMode ? require("../../assets/images/light_logo.png") : require("../../assets/images/dark_logo.png")}
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 90,
                    marginBottom: 20
                }}
            />
            <TextInput
                onChangeText={setEmail}
                value={email}
                placeholder={i18n(lang, "emailPlaceholder")}
                placeholderTextColor={"gray"}
                autoCapitalize="none"
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
            {
                showTwoFactorField && (
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
                )
            }
            <TouchableOpacity
                style={{
                    backgroundColor: darkMode ? "#444444" : "gray",
                    borderRadius: 10,
                    width: "100%",
                    maxWidth: "70%",
                    height: 30,
                    padding: 5,
                    alignItems: "center",
                    marginTop: 12
                }}
                onPress={() => login({ email, password, twoFactorKey, setEmail, setPassword, setTwoFactorKey, setShowTwoFactorField, navigation, setSetupDone })}
            >
                <Text
                    style={{
                        color: "white"
                    }}
                >
                    {i18n(lang, "loginBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    width: "100%",
                    maxWidth: "70%",
                    height: "auto",
                    alignItems: "center",
                    marginTop: 30
                }}
                onPress={() => {
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.push("RegisterScreen")
                    })
                }}
            >
                <Text
                    style={{
                        color: "#0A84FF"
                    }}
                >
                    {i18n(lang, "createAccountBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    width: "100%",
                    maxWidth: "70%",
                    height: "auto",
                    alignItems: "center",
                    marginTop: 20
                }}
                onPress={() => {
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.push("ForgotPasswordScreen")
                    })
                }}
            >
                <Text
                    style={{
                        color: "#0A84FF"
                    }}
                >
                    {i18n(lang, "forgotPasswordBtn")}
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
})