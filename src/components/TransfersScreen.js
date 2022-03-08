import React from "react"
import { View, ScrollView, Text, TouchableOpacity } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { TopBar } from "./TopBar"
import { useStore } from "../lib/state"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"

const isEqual = require("react-fast-compare")

export const TransfersScreen = ({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const uploadsCount = useStore(state => Object.keys(state.uploads).length)
    const downloadsCount = useStore(state => Object.keys(state.downloads).length)
    const uploads = useStore(state => state.uploads, (current, next) => !isEqual(current, next))
    const downloads = useStore(state => state.downloads, (current, next) => !isEqual(current, next))

    return (
        <View style={{
            height: "100%",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <TopBar navigation={navigation} route={route} />
            <ScrollView style={{
                width: "100%",
                height: "100%"
            }}>
                {
                    (uploadsCount + downloadsCount) > 0 ? (
                        <>
                            {
                                Object.keys(uploads).map((prop) => {
                                    return (
                                        <View key={prop} style={{
                                            width: "100%",
                                            height: 40,
                                            paddingTop: 10,
                                            paddingBottom: 10,
                                            paddingLeft: 15,
                                            paddingRight: 15,
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderBottomColor: getColor(darkMode, "primaryBorder"),
                                            borderBottomWidth: 1
                                        }}>
                                            <View style={{
                                                flexDirection: "row"
                                            }}>
                                                <Ionicon name={uploads[prop].paused ? "pause-circle-outline" : "arrow-up-outline"} size={20} color={darkMode ? "white" : "black"} />
                                                <Text style={{
                                                    color: darkMode ? "white" : "black",
                                                    marginLeft: 10,
                                                    width: "45%",
                                                    paddingTop: 2
                                                }} numberOfLines={1}>
                                                    {uploads[prop].file.name}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={{
                                                    color: darkMode ? "white" : "black"
                                                }}>
                                                    {
                                                        uploads[prop].chunksDone == 0 ? (
                                                            <>{i18n(lang, "queued")}</>
                                                        ) : (
                                                            <>{!isNaN(Math.round((uploads[prop].chunksDone / uploads[prop].file.chunks) * 100)) ? Math.round((uploads[prop].chunksDone / uploads[prop].file.chunks) * 100) : 0}%</>
                                                        )
                                                    }
                                                </Text>
                                            </View>
                                            {
                                                uploads[prop].paused ? (
                                                    <TouchableOpacity onPress={() => {
                                                        const currentUploads = useStore.getState().uploads
        
                                                        if(typeof currentUploads[prop] !== "undefined"){
                                                            currentUploads[prop].paused = false
                                                
                                                            useStore.setState({
                                                                uploads: currentUploads
                                                            })
                                                        }
                                                    }}>
                                                        <Text style={{
                                                            color: "#0A84FF"
                                                        }}>
                                                            {i18n(lang, "resume")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity onPress={() => {
                                                        const currentUploads = useStore.getState().uploads
        
                                                        if(typeof currentUploads[prop] !== "undefined"){
                                                            currentUploads[prop].paused = true
                                                
                                                            useStore.setState({
                                                                uploads: currentUploads
                                                            })
                                                        }
                                                    }}>
                                                        <Text style={{
                                                            color: "#0A84FF"
                                                        }}>
                                                            {i18n(lang, "pause")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            }
                                            <TouchableOpacity onPress={() => {
                                                const currentUploads = useStore.getState().uploads

                                                if(typeof currentUploads[prop] !== "undefined"){
                                                    currentUploads[prop].stopped = true
                                        
                                                    useStore.setState({
                                                        uploads: currentUploads
                                                    })
                                                }
                                            }}>
                                                <Text style={{
                                                    color: "#0A84FF"
                                                }}>
                                                    {i18n(lang, "stop")}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )
                                })
                            }
                            {
                                Object.keys(downloads).map((prop) => {
                                    return (
                                        <View key={prop} style={{
                                            width: "100%",
                                            height: 40,
                                            paddingTop: 10,
                                            paddingBottom: 10,
                                            paddingLeft: 15,
                                            paddingRight: 15,
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            borderBottomColor: getColor(darkMode, "primaryBorder"),
                                            borderBottomWidth: 1
                                        }}>
                                            <View style={{
                                                flexDirection: "row"
                                            }}>
                                                <Ionicon name={downloads[prop].paused ? "pause-circle-outline" : "arrow-down-outline"} size={20} color={darkMode ? "white" : "black"} />
                                                <Text style={{
                                                    color: darkMode ? "white" : "black",
                                                    marginLeft: 10,
                                                    width: "45%",
                                                    paddingTop: 2
                                                }} numberOfLines={1}>
                                                    {downloads[prop].file.name}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={{
                                                    color: darkMode ? "white" : "black"
                                                }}>
                                                    {
                                                        downloads[prop].chunksDone == 0 ? (
                                                            <>{i18n(lang, "queued")}</>
                                                        ) : (
                                                            <>{!isNaN(Math.round((downloads[prop].chunksDone / downloads[prop].file.chunks) * 100)) ? Math.round((downloads[prop].chunksDone / downloads[prop].file.chunks) * 100) : 0}%</>
                                                        )
                                                    }
                                                </Text>
                                            </View>
                                            {
                                                downloads[prop].paused ? (
                                                    <TouchableOpacity onPress={() => {
                                                        const currentDownloads = useStore.getState().downloads
        
                                                        if(typeof currentDownloads[prop] !== "undefined"){
                                                            currentDownloads[prop].paused = false
                                                
                                                            useStore.setState({
                                                                downloads: currentDownloads
                                                            })
                                                        }
                                                    }}>
                                                        <Text style={{
                                                            color: "#0A84FF"
                                                        }}>
                                                            {i18n(lang, "resume")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity onPress={() => {
                                                        const currentDownloads = useStore.getState().downloads
        
                                                        if(typeof currentDownloads[prop] !== "undefined"){
                                                            currentDownloads[prop].paused = true
                                                
                                                            useStore.setState({
                                                                downloads: currentDownloads
                                                            })
                                                        }
                                                    }}>
                                                        <Text style={{
                                                            color: "#0A84FF"
                                                        }}>
                                                            {i18n(lang, "pause")}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )
                                            }
                                            <TouchableOpacity onPress={() => {
                                                const currentDownloads = useStore.getState().downloads

                                                if(typeof currentDownloads[prop] !== "undefined"){
                                                    currentDownloads[prop].stopped = true
                                        
                                                    useStore.setState({
                                                        downloads: currentDownloads
                                                    })
                                                }
                                            }}>
                                                <Text style={{
                                                    color: "#0A84FF"
                                                }}>
                                                    {i18n(lang, "stop")}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )
                                })
                            }
                        </>
                    ) : (
                        <View style={{
                            marginTop: "60%",
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            <Ionicon name="repeat-outline" size={70} color="gray" />
                            <Text style={{
                                color: "gray",
                                marginTop: 5
                            }}>
                                {i18n(lang, "noTransfers")}
                            </Text>
                        </View>
                    )
                }
            </ScrollView>
        </View>
    )
}