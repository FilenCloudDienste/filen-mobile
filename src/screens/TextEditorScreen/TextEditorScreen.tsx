import React, { useState, useEffect, useRef, memo } from "react"
import { View, Text, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Alert } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../../lib/services/download/download"
import { queueFileUpload } from "../../lib/services/upload/upload"
import { useStore } from "../../lib/state"
import { getColor } from "../../lib/style/colors"
import { getParent } from "../../lib/helpers"

export interface TextEditorScreenProps {
    navigation: any
}

export const TextEditorScreen = memo(({ navigation }: TextEditorScreenProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const textEditorText = useStore(state => state.textEditorText)
    const textEditorState = useStore(state => state.textEditorState)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
    const inputRef = useRef<any>()
    const [value, setValue] = useState<string>("")
    const [initialValue, setInitialValue] = useState<string>("")
    const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
    const dimensions = useStore(state => state.dimensions)
    const textEditorParent = useStore(state => state.textEditorParent)
    const [offset, setOffset] = useState<number>(0)
    const setTextEditorState = useStore(state => state.setTextEditorState)
    const [textEditorActive, setTextEditorActive] = useState<boolean>(false)
    const [textEditorFocused, setTextEditorFocused] = useState<boolean>(false)

    const fileName: string = textEditorState == "edit" ? createTextFileDialogName : currentActionSheetItem?.name as string

    const save = (): void => {
        if(value.length <= 0){
            return
        }

        if(value == initialValue){
            return navigation.goBack()
        }

        let parent: string = getParent()

        if(textEditorParent.length > 16){
            parent = textEditorParent
        }

        if(parent.length < 16){
            return
        }

        navigation.goBack()

        getDownloadPath({ type: "temp" }).then(async (path) => {
            path = path + fileName

            try{
                if((await RNFS.exists(path))){
                    await RNFS.unlink(path)
                }
            }
            catch(e){
                //console.log(e)
            }

            RNFS.writeFile(path, value, "utf8").then(async () => {
                try{
                    var stat = await RNFS.stat(path)
                }
                catch(e: any){
                    console.log(e)

                    return showToast({ message: e.toString() })
                }

                if(typeof stat !== "object"){
                    return false
                }

                queueFileUpload({
                    file: {
                        path: decodeURIComponent(path).replace("file://", ""),
                        name: fileName,
                        size: stat.size,
                        mime: "text/plain",
                        lastModified: new Date().getTime()
                    },
                    parent
                }).catch((err) => {
                    if(err == "wifiOnly"){
                        return showToast({ message: i18n(lang, "onlyWifiUploads") })
                    }
    
                    console.log(err)
    
                    showToast({ message: err.toString() })
                })
            }).catch((err) => {
                console.log(err)

                showToast({ message: err.toString() })
            })
        })
    }

    const close = (): void => {
        if(initialValue !== value){
            return Alert.alert(i18n(lang, "exit"), i18n(lang, "exitWithoutSavingChanges"), [
                {
                    text: i18n(lang, "cancel"),
                    onPress: () => {
                        return false
                    },
                    style: "cancel"
                },
                {
                    text: i18n(lang, "exit"),
                    onPress: () => {
                        navigation.goBack()
                    },
                    style: "default"
                }
            ], {
                cancelable: true
            })
        }
        else{
            navigation.goBack()
        }
    }

    useEffect(() => {
        if(textEditorText.length > 0){
            setValue(textEditorText)
            setInitialValue(textEditorText)
        }
        else{
            setValue("")
            setInitialValue("")
        }
    }, [])

    return (
        <View onLayout={(e) => setOffset(dimensions.window.height - e.nativeEvent.layout.height)}>
            <View
                style={{
                    height: 35,
                    paddingLeft: 15,
                    paddingRight: 15,
                    backgroundColor: darkMode ? "black" : "white",
                    borderBottomColor: getColor(darkMode, "primaryBorder"),
                    borderBottomWidth: 1,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}
            >
                <View
                    style={{
                        justifyContent: "space-between",
                        flexDirection: "row"
                    }}
                >
                    <View
                        style={{
                            marginLeft: 0,
                            width: "70%",
                            flexDirection: "row"
                        }}
                    >
                        <TouchableOpacity onPress={() => close()}>
                            <Ionicon
                                name="chevron-back-outline"
                                size={21}
                                color={darkMode ? "white" : "black"}
                                style={{
                                    marginTop: Platform.OS == "android" ? 4 : 2.5
                                }}
                            />
                        </TouchableOpacity>
                        <Text
                            style={{
                                fontSize: 20,
                                color: darkMode ? "white" : "black",
                                marginLeft: 10
                            }}
                            numberOfLines={1}
                        >
                            {fileName}
                        </Text>
                    </View>
                    {
                        textEditorState == "edit" && (
                            <View
                                style={{
                                    alignItems: "flex-start",
                                    flexDirection: "row"
                                }}
                            >
                                {
                                    textEditorFocused && (
                                        <TouchableOpacity
                                            onPress={() => Keyboard.dismiss()}
                                            style={{
                                                marginRight: initialValue !== value ? 25 : 0
                                            }}
                                        >
                                            <Ionicon
                                                name="chevron-down-outline"
                                                size={21}
                                                color={darkMode ? "white" : "black"}
                                                style={{
                                                    marginTop: 5
                                                }}
                                            />
                                        </TouchableOpacity>
                                    )
                                }
                                {
                                    initialValue !== value && (
                                        <TouchableOpacity onPress={() => save()}>
                                            <Ionicon
                                                name="save-outline"
                                                size={21}
                                                color={darkMode ? "white" : "black"}
                                                style={{
                                                    marginTop: 5
                                                }}
                                            />
                                        </TouchableOpacity>
                                    )
                                }
                            </View>
                        )
                    }
                </View>
            </View>
            <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={offset}
                style={{
                    backgroundColor: darkMode ? "black" : "white"
                }}
            >
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={(e) => {
                        setValue(e)
                        setTextEditorState("edit")
                    }}
                    onFocus={() => {
                        setTextEditorActive(true)
                        setTextEditorState("edit")
                        setTextEditorFocused(true)
                    }}
                    onBlur={() => {
                        setTextEditorFocused(false)
                    }}
                    multiline={true}
                    numberOfLines={10}
                    textAlign="left"
                    textAlignVertical="top"
                    autoFocus={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    placeholder={i18n(lang, "textEditorPlaceholder")}
                    selection={textEditorActive ? undefined : { start: 0 }}
                    placeholderTextColor={darkMode ? "white" : "black"}
                    style={{
                        width: "100%",
                        height: "100%",
                        color: darkMode ? "white" : "black",
                        backgroundColor: darkMode ? "black" : "white",
                        paddingLeft: 15,
                        paddingRight: 15,
                        paddingTop: 10,
                        paddingBottom: 0
                    }}
                />
            </KeyboardAvoidingView>
        </View>
    )
})