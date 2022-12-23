import React, { useState, memo, useMemo } from "react"
import { Text, TextInput, TouchableOpacity, useWindowDimensions, View, Linking } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { login } from "../../lib/services/auth/login"
import { navigationAnimation } from "../../lib/state"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import AuthContainer from "../../components/AuthContainer"

export interface LoginScreenProps {
    navigation: any,
    setSetupDone: React.Dispatch<React.SetStateAction<boolean>>
}

export const LoginScreen = memo(({ navigation, setSetupDone }: LoginScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [twoFactorKey, setTwoFactorKey] = useState<string>("")
    const [showTwoFactorField, setShowTwoFactorField] = useState<boolean>(false)
    const dimensions = useWindowDimensions()

    const contentWidth = useMemo(() => {
        const scaled = Math.floor(dimensions.width * 0.7)

        if(scaled > 300){
            return 300
        }

        return 300
    }, [dimensions])

    return (
        <AuthContainer>
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
                    height: 44,
                    width: contentWidth,
                    padding: 5,
                    paddingLeft: 10,
                    paddingRight: 10,
                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                    color: "gray",
                    borderRadius: 10,
                    marginTop: 10,
                    fontSize: 15
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
                    height: 44,
                    width: contentWidth,
                    padding: 5,
                    paddingLeft: 10,
                    paddingRight: 10,
                    backgroundColor: getColor(darkMode, "backgroundSecondary"),
                    color: "gray",
                    borderRadius: 10,
                    marginTop: 12,
                    fontSize: 15
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
                        returnKeyType="done"
                        autoCorrect={false}
                        style={{
                            height: 44,
                            width: contentWidth,
                            padding: 5,
                            paddingLeft: 10,
                            paddingRight: 10,
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            color: "gray",
                            borderRadius: 10,
                            marginTop: 12,
                            fontSize: 15
                        }}
                    />
                )
            }
            <TouchableOpacity
                style={{
                    backgroundColor: getColor(darkMode, "indigo"),
                    borderRadius: 10,
                    width: contentWidth,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 12
                }}
                onPress={() => login({ email, password, twoFactorKey, setEmail, setPassword, setTwoFactorKey, setShowTwoFactorField, navigation, setSetupDone })}
            >
                <Text
                    style={{
                        color: "white",
                        fontSize: 17,
                        fontWeight: "bold"
                    }}
                >
                    {i18n(lang, "loginBtn")}
                </Text>
            </TouchableOpacity>
            <View
                style={{
                    width: contentWidth,
                    height: 0,
                    borderBottomColor: "rgba(84, 84, 88, 0.2)",
                    borderBottomWidth: 0.5,
                    marginTop: 50
                }}
            />
            <TouchableOpacity
                style={{
                    backgroundColor: getColor(darkMode, "backgroundPrimary"),
                    borderColor: getColor(darkMode, "backgroundTertiary"),
                    borderWidth: 1,
                    borderRadius: 10,
                    width: contentWidth,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
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
                        color: getColor(darkMode, "textPrimary"),
                        fontSize: 15
                    }}
                >
                    {i18n(lang, "createAccountBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    width: contentWidth,
                    height: "auto",
                    alignItems: "center",
                    marginTop: 20
                }}
                onPress={() => {
                    Linking.canOpenURL("https://drive.filen.io/forgot-password").then((supported) => {
                        if(supported){
                            Linking.openURL("https://drive.filen.io/forgot-password").catch(console.error)
                        }
                    }).catch(console.error)
                }}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "linkPrimary"),
                        fontSize: 15
                    }}
                >
                    {i18n(lang, "forgotPasswordBtn")}
                </Text>
            </TouchableOpacity>
        </AuthContainer>
    )
})