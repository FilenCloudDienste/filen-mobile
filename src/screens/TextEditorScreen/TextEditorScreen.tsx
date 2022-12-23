import React, { useState, useEffect, useRef, memo } from "react"
import { View, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Alert, ScaledSize, useWindowDimensions } from "react-native"
import useLang from "../../lib/hooks/useLang"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../../lib/services/download/download"
import { queueFileUpload } from "../../lib/services/upload/upload"
import { useStore } from "../../lib/state"
import { getColor } from "../../style/colors"
import { getParent } from "../../lib/helpers"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"

export interface TextEditorScreenProps {
    navigation: any
}

export const TextEditorScreen = memo(({ navigation }: TextEditorScreenProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const textEditorText = useStore(state => state.textEditorText)
    const textEditorState = useStore(state => state.textEditorState)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
    const inputRef = useRef<any>()
    const [value, setValue] = useState<string>("")
    const [initialValue, setInitialValue] = useState<string>("")
    const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
    const dimensions: ScaledSize = useWindowDimensions()
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
                        size: parseInt(stat.size),
                        mime: "text/plain",
                        lastModified: new Date().getTime()
                    },
                    parent
                }).catch((err) => {
                    if(err == "stopped"){
                        return
                    }
                    
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
        <View
            onLayout={(e) => setOffset(dimensions.height - e.nativeEvent.layout.height)}
        >
            <DefaultTopBar
                leftText={i18n(lang, "back")}
                middleText={fileName}
                onPressBack={() => close()}
                rightComponent={
                    textEditorState == "edit" ? (
                        <View
                            style={{
                                flexDirection: "row",
                                width: "33%",
                                justifyContent: "flex-end",
                                paddingRight: 15
                            }}
                        >
                            {
                                textEditorFocused && (
                                    <TouchableOpacity
                                        onPress={() => Keyboard.dismiss()}
                                        style={{
                                            marginRight: initialValue !== value ? 15 : 0
                                        }}
                                    >
                                        <Ionicon
                                            name="chevron-down-outline"
                                            size={21}
                                            color={getColor(darkMode, "textPrimary")}
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
                                            color={getColor(darkMode, "textPrimary")}
                                            style={{
                                                marginTop: 5
                                            }}
                                        />
                                    </TouchableOpacity>
                                )
                            }
                        </View>
                    ) : undefined
                }
            />
            <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={offset}
                style={{
                    backgroundColor: getColor(darkMode, "backgroundPrimary")
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
                    spellCheck={false}
                    keyboardType="default"
                    underlineColorAndroid="transparent"
                    placeholder={i18n(lang, "textEditorPlaceholder")}
                    selection={textEditorActive ? undefined : { start: 0 }}
                    placeholderTextColor={getColor(darkMode, "textPrimary")}
                    style={{
                        width: "100%",
                        height: "100%",
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary"),
                        paddingLeft: 15,
                        paddingRight: 15,
                        paddingTop: 15,
                        paddingBottom: 0,
                        fontSize: 15,
                        fontWeight: "400"
                    }}
                />
            </KeyboardAvoidingView>
        </View>
    )
})