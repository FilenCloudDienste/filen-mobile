import React, { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, Platform, TouchableOpacity, TextInput, KeyboardAvoidingView, Dimensions } from "react-native"
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

export const TextEditorScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const textEditorText = useStore(state => state.textEditorText)
    const textEditorState = useStore(state => state.textEditorState)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
    const inputRef = useRef()
    const [value, setValue] = useState("")
    const [initialValue, setInitialValue] = useState("")
    const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
    const dimensions = useStore(state => state.dimensions)
    const textEditorParent = useStore(state => state.textEditorParent)
    const [offset, setOffset] = useState(0)

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

        setTimeout(() => {
            //if(textEditorState == "edit"){
            //    inputRef.current.focus()
            //}
        }, 500)
    }, [])

    return (
        <View onLayout={(e) => setOffset(dimensions.window.height - e.nativeEvent.layout.height)}>
            <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={{
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <View style={{
                    height: 35,
                    paddingLeft: 15,
                    paddingRight: 15,
                    backgroundColor: darkMode ? "black" : "white",
                    borderBottomColor: getColor(darkMode, "primaryBorder"),
                    borderBottomWidth: 1
                }}>
                    <View style={{
                        justifyContent: "space-between",
                        flexDirection: "row"
                    }}>
                        <View style={{
                            marginLeft: 0,
                            width: "75%",
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
                            textEditorState == "edit" ? (
                                <View style={{
                                    alignItems: "flex-start",
                                    flexDirection: "row"
                                }}>
                                    <TouchableOpacity onPress={() => save()}>
                                        <Ionicon name="save-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                            marginTop: 5
                                        }}></Ionicon>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{
                                    alignItems: "flex-start",
                                    flexDirection: "row"
                                }}>
                                    <TouchableOpacity onPress={() => {
                                        useStore.setState({
                                            textEditorState: "edit",
                                            textEditorParent: currentActionSheetItem.parent,
                                            createTextFileDialogName: currentActionSheetItem.name
                                        })
                                    }}>
                                        <Ionicon name="create-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                            marginTop: 5
                                        }}></Ionicon>
                                    </TouchableOpacity>
                                </View>
                            )
                        }
                    </View>
                </View>
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={(e) => setValue(e)}
                    multiline={true}
                    numberOfLines={10}
                    textAlign="left"
                    textAlignVertical="top"
                    textContentType="name"
                    autoFocus={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    focusable={textEditorState == "edit"}
                    editable={textEditorState == "edit"}
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    placeholder={i18n(lang, "textEditorPlaceholder")}
                    placeholderTextColor={darkMode ? "white" : "black"}
                    style={{
                        width: "100%",
                        height: "100%",
                        color: darkMode ? "white" : "black",
                        backgroundColor: darkMode ? "black" : "white",
                        paddingLeft: 15,
                        paddingRight: 15,
                        paddingTop: 10
                    }}
                />
            </KeyboardAvoidingView>
        </View>
    )
}