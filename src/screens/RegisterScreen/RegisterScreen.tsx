import React, { useState, memo, useMemo } from "react"
import { Text, TextInput, TouchableOpacity, View, useWindowDimensions, Linking } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { register } from "../../lib/services/auth/register"
import { navigationAnimation } from "../../lib/state"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import AuthContainer from "../../components/AuthContainer"
import { NavigationContainerRef } from "@react-navigation/native"
import { StackActions } from "@react-navigation/native"

export interface RegisterScreenProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const RegisterScreen = memo(({ navigation }: RegisterScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [confirmPassword, setConfirmPassword] = useState<string>("")
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
                    marginTop: 10,
                    fontSize: 15
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
                onPress={() => register({ email, password, confirmPassword, setEmail, setPassword, setConfirmPassword, navigation })}
            >
                <Text
                    style={{
                        color: "white",
                        fontSize: 15,
                        fontWeight: "bold"
                    }}
                >
                    {i18n(lang, "registerBtn")}
                </Text>
            </TouchableOpacity>
            <Text
                style={{
                    color: getColor(darkMode, "textSecondary"),
                    width: contentWidth,
                    textAlign: "center",
                    marginTop: 12,
                    fontSize: 12,
                    alignItems: "center"
                }}
            >
                <Text>
                    By creating an account you automatically agree to our
                </Text>
                <Text
                    style={{
                        color: getColor(darkMode, "linkPrimary")
                    }}
                    onPress={() => {
                        Linking.canOpenURL("https://filen.io/terms").then((supported) => {
                            if(supported){
                                Linking.openURL("https://filen.io/terms").catch(console.error)
                            }
                        }).catch(console.error)
                    }}
                >
                    &nbsp;Terms of Service
                </Text>
                <Text>
                    &nbsp;and
                </Text>
                <Text
                    style={{
                        color: getColor(darkMode, "linkPrimary")
                    }}
                    onPress={() => {
                        Linking.canOpenURL("https://filen.io/privacy").then((supported) => {
                            if(supported){
                                Linking.openURL("https://filen.io/privacy").catch(console.error)
                            }
                        }).catch(console.error)
                    }}
                >
                    &nbsp;Privacy Policy
                </Text>
            </Text>
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
                    backgroundColor: getColor(darkMode, "backgroundTertiary"),
                    borderRadius: 10,
                    width: contentWidth,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 30
                }}
                onPress={() => navigation.goBack()}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "textPrimary"),
                        fontSize: 15
                    }}
                >
                    {i18n(lang, "loginBtn")}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    width: contentWidth,
                    height: "auto",
                    alignItems: "center",
                    marginTop: 20
                }}
                onPress={async () => {
                    await navigationAnimation({ enable: true })
                    
                    navigation.dispatch(StackActions.push("ResendConfirmationScreen"))
                }}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "linkPrimary"),
                        fontSize: 15
                    }}
                >
                    {i18n(lang, "resendConfirmationBtn")}
                </Text>
            </TouchableOpacity>
        </AuthContainer>
    )
})