import React, { useState, useEffect, useRef, useCallback, memo } from "react"
import { View, Text, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Alert } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { showToast } from "./Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import { queueFileUpload } from "../lib/upload"
import { useStore } from "../lib/state"
import { getColor } from "../lib/style/colors"
import { getParent } from "../lib/helpers"

export const TextEditorScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const textEditorText = useStore(useCallback(state => state.textEditorText))
    const textEditorState = useStore(useCallback(state => state.textEditorState))
    const currentActionSheetItem = useStore(useCallback(state => state.currentActionSheetItem))
    const inputRef = useRef()
    const [value, setValue] = useState("")
    const [initialValue, setInitialValue] = useState("")
    const createTextFileDialogName = useStore(useCallback(state => state.createTextFileDialogName))
    const dimensions = useStore(useCallback(state => state.dimensions))
    const textEditorParent = useStore(useCallback(state => state.textEditorParent))
    const [offset, setOffset] = useState(0)
    const setTextEditorState = useStore(useCallback(state => state.setTextEditorState))
    const [textEditorActive, setTextEditorActive] = useState(false)
    const [textEditorFocused, setTextEditorFocused] = useState(false)

    const fileName = textEditorState == "edit" ? createTextFileDialogName : currentActionSheetItem.name

    const save = useCallback(() => {
        if(value.length <= 0){
            return false
        }

        if(value == initialValue){
            return navigation.goBack()
        }

        let parent = getParent()

        if(textEditorParent.length > 16){
            parent = textEditorParent
        }

        if(parent.length < 16){
            return false
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
                catch(e){
                    console.log(e)

                    return showToast({ message: e.toString() })
                }

                if(typeof stat !== "object"){
                    return false
                }

                queueFileUpload({
                    pickedFile: {
                        name: fileName,
                        size: stat.size,
                        type: "text/plain",
                        uri: path.indexOf("file://") == -1 ? "file://" + path : path
                    },
                    parent
                })
            }).catch((err) => {
                console.log(err)

                showToast({ message: err.toString() })
            })
        })
    })

    const close = useCallback(() => {
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
    })

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
            <View style={{
                height: 35,
                paddingLeft: 15,
                paddingRight: 15,
                backgroundColor: darkMode ? "black" : "white",
                borderBottomColor: getColor(darkMode, "primaryBorder"),
                borderBottomWidth: 1,
                marginTop: Platform.OS == "ios" ? 15 : 0
            }}>
                <View style={{
                    justifyContent: "space-between",
                    flexDirection: "row"
                }}>
                    <View style={{
                        marginLeft: 0,
                        width: "70%",
                        flexDirection: "row"
                    }}>
                        <TouchableOpacity onPress={() => close()}>
                            <Ionicon name="chevron-back-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                marginTop: Platform.OS == "android" ? 4 : 2.5
                            }}></Ionicon>
                        </TouchableOpacity>
                        <Text style={{
                            fontSize: 20,
                            color: darkMode ? "white" : "black",
                            marginLeft: 10
                        }} numberOfLines={1}>{fileName}</Text>
                    </View>
                    {
                        textEditorState == "edit" && (
                            <View style={{
                                alignItems: "flex-start",
                                flexDirection: "row"
                            }}>
                                {
                                    textEditorFocused && (
                                        <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{
                                            marginRight: initialValue !== value ? 25 : 0
                                        }}>
                                            <Ionicon name="chevron-down-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                                marginTop: 5
                                            }}></Ionicon>
                                        </TouchableOpacity>
                                    )
                                }
                                {
                                    initialValue !== value && (
                                        <TouchableOpacity onPress={() => save()}>
                                            <Ionicon name="save-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                                marginTop: 5
                                            }}></Ionicon>
                                        </TouchableOpacity>
                                    )
                                }
                            </View>
                        )
                    }
                </View>
            </View>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={{
                backgroundColor: darkMode ? "black" : "white"
            }}>
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