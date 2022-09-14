import React, { useState, memo } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Button } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import { generatePasswordAndMasterKeysBasedOnAuthVersion } from "../../lib/services/auth/login"
import { getAuthInfo, changeEmail, changePassword } from "../../lib/api"
import { useStore } from "../../lib/state"
import { encryptMetadata, generateRandomString, getMasterKeys } from "../../lib/helpers"
import { logout } from "../../lib/services/auth/logout"

export interface ChangeEmailPasswordScreenProps {
    navigation: any
}

export const ChangeEmailPasswordScreen = memo(({ navigation }: ChangeEmailPasswordScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [emailCurrentPassword, setEmailCurrentPassword] = useState<string>("")
    const [newEmail, setNewEmail] = useState<string>("")
    const [confirmNewEmail, setConfirmNewEmail] = useState<string>("")
    const [newPassword, setNewPassword] = useState<string>("")
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("")
    const [passwordCurrentPassword, setPasswordCurrentPassword] = useState<string>("")

    return (
        <KeyboardAvoidingView behavior="padding">
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
                    {i18n(lang, "changeEmailPassword")}
                </Text>
            </View>
            <ScrollView
                style={{
                    height: "100%",
                    width: "100%",
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <View
                    style={{
                        marginTop: 30,
                        paddingLeft: 5,
                        paddingRight: 5
                    }}
                >
                    <Text
                        style={{
                            color: darkMode ? "white" : "black",
                            paddingLeft: 15,
                            fontSize: 15
                        }}
                    >
                        {i18n(lang, "changeEmail")}
                    </Text>
                    <View
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
                                paddingRight: 10
                            }}
                        >
                            <TextInput
                                onChangeText={setNewEmail}
                                value={newEmail}
                                placeholder={i18n(lang, "newEmailPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                autoCapitalize="none"
                                textContentType="emailAddress"
                                keyboardType="email-address"
                                returnKeyType="next"
                                secureTextEntry={false}
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10,
                                    marginTop: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                onChangeText={setConfirmNewEmail}
                                value={confirmNewEmail}
                                placeholder={i18n(lang, "confirmNewEmailPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                autoCapitalize="none"
                                textContentType="emailAddress"
                                keyboardType="email-address"
                                returnKeyType="next"
                                secureTextEntry={false}
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                paddingBottom: 10
                            }}
                        >
                            <TextInput
                                onChangeText={setEmailCurrentPassword}
                                value={emailCurrentPassword}
                                placeholder={i18n(lang, "currentPasswordPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                returnKeyType="done"
                                secureTextEntry
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                paddingLeft: 10,
                                paddingRight: 10,
                                paddingBottom: 10
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    const email: string = newEmail.trim()
                                    const emailRepeat: string = confirmNewEmail.trim()
                                    const password: string = emailCurrentPassword.trim()

                                    if(!email || !emailRepeat || !password){
                                        setConfirmNewEmail("")
                                        setNewEmail("")
                                        setEmailCurrentPassword("")

                                        return showToast({ message: i18n(lang, "invalidFields") })
                                    }

                                    if(email.length == 0 || emailRepeat.length == 0 || password.length == 0){
                                        setConfirmNewEmail("")
                                        setNewEmail("")
                                        setEmailCurrentPassword("")

                                        return showToast({ message: i18n(lang, "invalidFields") })
                                    }

                                    if(email !== emailRepeat){
                                        setConfirmNewEmail("")
                                        setNewEmail("")
                                        setEmailCurrentPassword("")

                                        return showToast({ message: i18n(lang, "emailsNotMatching") })
                                    }

                                    useStore.setState({ fullscreenLoadingModalVisible: true })

                                    getAuthInfo({ email: storage.getString("email") as string }).then((authInfo) => {
                                        const { authVersion, salt } = authInfo

                                        generatePasswordAndMasterKeysBasedOnAuthVersion({ rawPassword: password, authVersion, salt }).then((generated) => {
                                            const { derivedPassword } = generated

                                            changeEmail({ email, emailRepeat, password: derivedPassword, authVersion }).then(() => {
                                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                                setConfirmNewEmail("")
                                                setNewEmail("")
                                                setEmailCurrentPassword("")

                                                logout({ navigation })
                                                
                                                showToast({ message: i18n(lang, "emailChangeSuccessConfirm"), duration: 10000 })
                                            }).catch((err) => {
                                                console.log(err)

                                                setConfirmNewEmail("")
                                                setNewEmail("")
                                                setEmailCurrentPassword("")

                                                useStore.setState({ fullscreenLoadingModalVisible: false })
                                                
                                                showToast({ message: err.toString() })
                                            })
                                        }).catch((err) => {
                                            console.log(err)

                                            setEmailCurrentPassword("")

                                            useStore.setState({ fullscreenLoadingModalVisible: false })
                                            
                                            showToast({ message: err.toString() })
                                        })
                                    }).catch((err) => {
                                        console.log(err)

                                        setEmailCurrentPassword("")

                                        useStore.setState({ fullscreenLoadingModalVisible: false })
                                        
                                        showToast({ message: err.toString() })
                                    })
                                }}
                                style={{
                                    width: "100%",
                                    backgroundColor: darkMode ? "#444444" : "gray",
                                    padding: 5,
                                    borderRadius: 10,
                                    alignItems: "center"
                                }}
                            >
                                <Text
                                    style={{
                                        color: "white",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {i18n(lang, "save")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                <View
                    style={{
                        marginTop: 30,
                        paddingLeft: 5,
                        paddingRight: 5
                    }}
                >
                    <Text
                        style={{
                            color: darkMode ? "white" : "black",
                            paddingLeft: 15,
                            fontSize: 15
                        }}
                    >
                        {i18n(lang, "changePassword")}
                    </Text>
                    <View
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
                                paddingRight: 10
                            }}
                        >
                            <TextInput
                                onChangeText={setNewPassword}
                                value={newPassword}
                                placeholder={i18n(lang, "newPasswordPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                secureTextEntry
                                returnKeyType="next"
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10,
                                    marginTop: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                onChangeText={setConfirmNewPassword}
                                value={confirmNewPassword}
                                placeholder={i18n(lang, "confirmNewPasswordPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                secureTextEntry
                                returnKeyType="next"
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                paddingBottom: 10
                            }}
                        >
                            <TextInput
                                onChangeText={setPasswordCurrentPassword}
                                value={passwordCurrentPassword}
                                placeholder={i18n(lang, "currentPasswordPlaceholder")}
                                placeholderTextColor={darkMode ? "gray" : "gray"}
                                returnKeyType="done"
                                secureTextEntry
                                style={{
                                    height: 35,
                                    width: "100%",
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    backgroundColor: darkMode ? "#222222" : "lightgray",
                                    color: darkMode ? "gray" : "gray",
                                    borderRadius: 10
                                }}
                            />
                        </View>
                    </View>
                    <View
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
                                paddingLeft: 10,
                                paddingRight: 10,
                                paddingBottom: 10
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    let password: string = newPassword.trim()
                                    let passwordRepeat: string = confirmNewPassword.trim()
                                    let currentPassword: string = passwordCurrentPassword.trim()

                                    if(!password || !passwordRepeat || !currentPassword){
                                        setNewPassword("")
                                        setConfirmNewPassword("")
                                        setPasswordCurrentPassword("")

                                        return showToast({ message: i18n(lang, "invalidFields") })
                                    }

                                    if(password.length == 0 || passwordRepeat.length == 0 || currentPassword.length == 0){
                                        setNewPassword("")
                                        setConfirmNewPassword("")
                                        setPasswordCurrentPassword("")

                                        return showToast({ message: i18n(lang, "invalidFields") })
                                    }

                                    if(password !== passwordRepeat){
                                        setNewPassword("")
                                        setConfirmNewPassword("")
                                        setPasswordCurrentPassword("")

                                        return showToast({ message: i18n(lang, "passwordsNotMatching") })
                                    }

                                    useStore.setState({ fullscreenLoadingModalVisible: true })

                                    getAuthInfo({ email: storage.getString("email") as string }).then((authInfo) => {
                                        const { authVersion, salt } = authInfo

                                        generatePasswordAndMasterKeysBasedOnAuthVersion({ rawPassword: currentPassword, authVersion, salt }).then((generated) => {
                                            currentPassword = generated.derivedPassword

                                            generateRandomString(256).then((newSalt) => {
                                                const masterKeys = getMasterKeys()

                                                if(masterKeys.length == 0){
                                                    setNewPassword("")
                                                    setConfirmNewPassword("")
                                                    setPasswordCurrentPassword("")

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })
                                                    
                                                    return showToast({ message: i18n(lang, "invalidMasterKeys") })
                                                }

                                                generatePasswordAndMasterKeysBasedOnAuthVersion({ rawPassword: newPassword, authVersion, salt: newSalt }).then((newGenerated) => {
                                                    const { derivedPassword, derivedMasterKeys } = newGenerated

                                                    masterKeys.push(derivedMasterKeys)

                                                    encryptMetadata(masterKeys.join("|"), masterKeys[masterKeys.length - 1]).then((encryptedMasterKeys) => {
                                                        changePassword({ password: derivedPassword, passwordRepeat: derivedPassword, currentPassword, authVersion, salt: newSalt, masterKeys: encryptedMasterKeys }).then((data) => {
                                                            try{
                                                                storage.set("apiKey", data.newAPIKey)
                                                                storage.set("masterKeys", JSON.stringify(masterKeys))
                                                            }
                                                            catch(e){
                                                                return logout({ navigation })
                                                            }

                                                            setNewPassword("")
                                                            setConfirmNewPassword("")
                                                            setPasswordCurrentPassword("")

                                                            useStore.setState({ fullscreenLoadingModalVisible: false })
                                                            
                                                            showToast({ message: i18n(lang, "passwordChangedSuccess") })
                                                        }).catch((err) => {
                                                            console.log(err)

                                                            setNewPassword("")
                                                            setConfirmNewPassword("")
                                                            setPasswordCurrentPassword("")

                                                            useStore.setState({ fullscreenLoadingModalVisible: false })
                                                            
                                                            showToast({ message: err.toString() })
                                                        })
                                                    }).catch((err) => {
                                                        console.log(err)

                                                        setNewPassword("")
                                                        setConfirmNewPassword("")
                                                        setPasswordCurrentPassword("")

                                                        useStore.setState({ fullscreenLoadingModalVisible: false })
                                                        
                                                        showToast({ message: err.toString() })
                                                    })
                                                }).catch((err) => {
                                                    console.log(err)

                                                    setNewPassword("")
                                                    setConfirmNewPassword("")
                                                    setPasswordCurrentPassword("")

                                                    useStore.setState({ fullscreenLoadingModalVisible: false })
                                                    
                                                    showToast({ message: err.toString() })
                                                })
                                            }).catch((err) => {
                                                console.log(err)

                                                setNewPassword("")
                                                setConfirmNewPassword("")
                                                setPasswordCurrentPassword("")

                                                useStore.setState({ fullscreenLoadingModalVisible: false })
                                                
                                                showToast({ message: err.toString() })
                                            })
                                        }).catch((err) => {
                                            console.log(err)

                                            setNewPassword("")
                                            setConfirmNewPassword("")
                                            setPasswordCurrentPassword("")

                                            useStore.setState({ fullscreenLoadingModalVisible: false })
                                            
                                            showToast({ message: err.toString() })
                                        })
                                    }).catch((err) => {
                                        console.log(err)

                                        setNewPassword("")
                                        setConfirmNewPassword("")
                                        setPasswordCurrentPassword("")

                                        useStore.setState({ fullscreenLoadingModalVisible: false })
                                        
                                        showToast({ message: err.toString() })
                                    })
                                }}
                                style={{
                                    width: "100%",
                                    backgroundColor: darkMode ? "#444444" : "gray",
                                    padding: 5,
                                    borderRadius: 10,
                                    alignItems: "center"
                                }}
                            >
                                <Text
                                    style={{
                                        color: "white"
                                    }}
                                >
                                    {i18n(lang, "save")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
})