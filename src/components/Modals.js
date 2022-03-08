import React, { useState, useEffect, useRef, useCallback } from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, SafeAreaView, Platform, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useStore } from "../lib/state"
import Modal from "react-native-modalbox"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import ImageView from "react-native-image-viewing"
import Ionicon from "react-native-vector-icons/Ionicons"
import { showToast } from "./Toasts"
import { setStatusBarStyle } from "../lib/statusbar"
import RNFS from "react-native-fs"
import { getDownloadPath } from "../lib/download"
import { queueFileUpload } from "../lib/upload"
import { getParent } from "../lib/helpers"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"

export const TextViewerModal = () => {
    const textViewerModalVisible = useStore(state => state.textViewerModalVisible)
    const setTextViewerModalVisible = useStore(state => state.setTextViewerModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const textViewerModalContent = useStore(state => state.textViewerModalContent)
    const textViewerModalType = useStore(state => state.textViewerModalType)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)

    return (
        <Modal
            isOpen={textViewerModalVisible}
            onClosed={() => setTextViewerModalVisible(false)}
            backdropColor="black"
            backButtonClose={false}
            backdropPressToClose={false}
            swipeToClose={true}
            animationDuration={250}
            backButtonClose={true}
            position="center"
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white",
                paddingTop: Platform.OS == "android" ? 10 : 0
            }}
        >
            <SafeAreaView style={{
                backgroundColor: darkMode ? "black" : "white",
                height: "100%",
                width: "100%",
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
                            width: "90%",
                            flexDirection: "row"
                        }}>
                            <TouchableOpacity onPress={() => setTextViewerModalVisible(false)}>
                                <Ionicon name="chevron-back-outline" size={21} color={darkMode ? "white" : "black"} style={{
                                    marginTop: Platform.OS == "android" ? 4 : 2.5
                                }}></Ionicon>
                            </TouchableOpacity>
                            <Text style={{
                                fontSize: 20,
                                color: darkMode ? "white" : "black",
                                marginLeft: 10
                            }} numberOfLines={1}>
                                {currentActionSheetItem?.name}
                            </Text>
                        </View>
                    </View>
                </View>
                <ScrollView style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: darkMode ? "black" : "white",
                    overflow: "scroll",
                    paddingTop: 10,
                    paddingLeft: 15,
                    paddingRight: 15
                }}>
                    {
                        textViewerModalType == "text" ? (
                            <Text style={{
                                color: darkMode ? "white" : "black"
                            }}>{textViewerModalContent}</Text>
                        ) : (
                            <Text style={{
                                color: darkMode ? "white" : "black"
                            }}>{textViewerModalContent}</Text>
                        )
                    }
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

export const ImageViewerModal = () => {
    const imageViewerModalVisible = useStore(state => state.imageViewerModalVisible)
    const setImageViewerModalVisible = useStore(state => state.setImageViewerModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const imageViewerImages = useStore(state => state.imageViewerImages)

    return (
        <ImageView
            images={imageViewerImages}
            imageIndex={0}
            visible={imageViewerModalVisible}
            onRequestClose={() => {
                setStatusBarStyle(darkMode)
                setImageViewerModalVisible(false)
            }}
            swipeToCloseEnabled={Platform.OS == "ios"}
            animationType="slide"
            doubleTapToZoomEnabled={true}
            HeaderComponent={() => {
                return (
                    <></>
                )
            }}
            FooterComponent={() => {
                return (
                    <></>
                )
            }}
        />
    )
}

export const FullscreenLoadingModal = () => {
    const fullscreenLoadingModalVisible = useStore(state => state.fullscreenLoadingModalVisible)
    const setFullscreenLoadingModalVisible = useStore(state => state.setFullscreenLoadingModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

    if(!fullscreenLoadingModalVisible){
        return null
    }

    return (
        <Pressable style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center"
        }} onPress={() => {
            console.log("loading pressed -> dismiss and cancel")
        }}>
            <ActivityIndicator size={"small"} color="white" />
        </Pressable>
    )
}

export const VideoViewerModal = () => {
    const videoViewerModalVisible = useStore(state => state.videoViewerModalVisible)
    const setVideoViewerModalVisible = useStore(state => state.setVideoViewerModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const videoViewerVideos = useStore(state => state.videoViewerVideos)

    return (
        <></>
    )
}

export const TextEditorModal = () => {
    const textEditorModalVisible = useStore(state => state.textEditorModalVisible)
    const setTextEditorModalVisible = useStore(state => state.setTextEditorModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const createTextFileDialogName = useStore(state => state.createTextFileDialogName)
    const inputRef = useRef()
    const textEditorText = useStore(state => state.textEditorText)
    const [value, setValue] = useState("")
    const dimensions = useStore(state => state.dimensions)
    const textEditorParent = useStore(state => state.textEditorParent)
    const [initialValue, setInitialValue] = useState("")
    const [lang, setLang] = useMMKVString("lang", storage)

    const save = useCallback(() => {
        if(value.length <= 0){
            return false
        }

        if(value == initialValue){
            return setTextEditorModalVisible(false)
        }

        let parent = getParent()

        if(textEditorParent.length > 16){
            parent = textEditorParent
        }

        if(parent.length < 16){
            return false
        }

        setTextEditorModalVisible(false)

        getDownloadPath({ type: "temp" }).then(async (path) => {
            path = path + createTextFileDialogName

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
                        name: createTextFileDialogName,
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
                        setTextEditorModalVisible(false)
                    },
                    style: "default"
                }
            ], {
                cancelable: true
            })
        }
        else{
            setTextEditorModalVisible(false)
        }
    })

    useEffect(() => {
        if(textEditorModalVisible){
            if(textEditorText.length > 0){
                setValue(textEditorText)
                setInitialValue(textEditorText)
            }
            else{
                setValue("")
                setInitialValue("")
            }

            setTimeout(() => {
                inputRef.current.focus()
            }, 500)
        }
    }, [textEditorModalVisible])

    return (
        <Modal
            isOpen={textEditorModalVisible}
            onClosed={() => setTextEditorModalVisible(false)}
            backdropColor="black"
            backButtonClose={false}
            backdropPressToClose={false}
            swipeToClose={false}
            animationDuration={250}
            backButtonClose={true}
            position="center"
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white",
                paddingTop: Platform.OS == "android" ? 10 : 0
            }}
        >
            <SafeAreaView style={{
                backgroundColor: darkMode ? "black" : "white",
                height: "100%",
                width: "100%",
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
                            }} numberOfLines={1}>{createTextFileDialogName}</Text>
                        </View>
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
                    </View>
                </View>
                <ScrollView style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: darkMode ? "black" : "white",
                    overflow: "scroll",
                    paddingLeft: 15,
                    paddingRight: 15
                }}>
                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={(e) => setValue(e)}
                        multiline={true}
                        numberOfLines={10}
                        textAlign="left"
                        textAlignVertical="top"
                        textContentType="none"
                        autoFocus={true}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        spellCheck={false}
                        keyboardType="default"
                        underlineColorAndroid="transparent"
                        placeholder={i18n(lang, "textEditorPlaceholder")}
                        style={{
                            width: "100%",
                            height: dimensions.screen.height - 125,
                            color: darkMode ? "white" : "black"
                        }}
                    />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}