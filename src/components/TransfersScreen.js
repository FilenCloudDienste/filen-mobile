import React, { useCallback, memo, useEffect, useState } from "react"
import { View, ScrollView, Text, TouchableOpacity } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useStore } from "../lib/state"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"
import { memoryCache } from "../lib/memoryCache"
import { useMountedState } from "react-use"

export const TransfersScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [sortedTransfers, setSortedTransfers] = useState({})
    const isMounted = useMountedState()
    const [currentView, setCurrentView] = useState("ongoing")
    const [ongoingTransfers, setOngoingTransfers] = useState(0)
    const [finishedTransfers, setFinishedTransfers] = useState(0)

    const updateTransfers = useCallback(() => {
        if(isMounted()){
            const transfers = memoryCache.get("transfers") || {}
            
            for(let prop in transfers){
                if(prop.indexOf("upload") !== -1){
                    if(typeof transfers['upload:' + transfers[prop].id] == "undefined"){
                        transfers['upload:' + transfers[prop].id] = transfers[prop]
                    }
                }
                else{
                    if(typeof transfers['download:' + transfers[prop].id] == "undefined"){
                        transfers['download:' + transfers[prop].id] = transfers[prop]
                    }
                }
            }

            const sortedTransfers = []
            let finished = 0
            let ongoing = 0

            for(let prop in transfers){
                const transferDone = transfers[prop].chunksDone >= transfers[prop].file.chunks ? 1 : 0

                sortedTransfers.push({
                    id: prop,
                    type: prop.indexOf("upload") !== -1 ? "upload" : "download",
                    done: transferDone,
                    transfer: transfers[prop]
                })

                if(transferDone){
                    finished += 1
                }
                else{
                    ongoing += 1
                }
            }

            setOngoingTransfers(ongoing)
            setFinishedTransfers(finished)

            if(sortedTransfers.length > 0){
                const sorted = sortedTransfers.sort((a, b) => {
                    return a.done > b.done
                })
    
                setSortedTransfers(sorted)
            }

            setTimeout(updateTransfers, 100)
        }
    })

    useEffect(() => {
        updateTransfers()
    }, [])

    return (
        <View style={{
            height: "100%",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <View style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <TouchableOpacity style={{
                    marginTop: Platform.OS == "ios" ? 16 : 3,
                    marginLeft: 15,
                }} onPress={() => navigation.goBack()}>
                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                </TouchableOpacity>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 22,
                    marginLeft: 10,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}>
                    {i18n(lang, "transfers")}
                </Text>
            </View>
            <View style={{
                height: "auto",
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20
            }}>
                <TouchableOpacity style={{
                    borderBottomWidth: currentView == "ongoing" ? 1.5 : 1,
                    borderBottomColor: currentView == "ongoing" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                    height: 27,
                    paddingLeft: 15,
                    paddingRight: 15,
                    width: "50%",
                    alignItems: "center"
                }} onPress={() => setCurrentView("ongoing")}>
                    <Text style={{
                        color: currentView == "ongoing" ? "#0A84FF" : "gray",
                        fontWeight: "bold",
                        fontSize: 14
                    }}>
                        {i18n(lang, "ongoing")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={{
                    borderBottomWidth: currentView == "finished" ? 1.5 : 1,
                    borderBottomColor: currentView == "finished" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                    height: 27,
                    paddingLeft: 15,
                    paddingRight: 15,
                    width: "50%",
                    alignItems: "center"
                }} onPress={() => setCurrentView("finished")}>
                    <Text style={{
                        color: currentView == "finished" ? "#0A84FF" : "gray",
                        fontWeight: "bold",
                        fontSize: 14
                    }}>
                        {i18n(lang, "finished")}
                    </Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={{
                width: "100%",
                height: "100%"
            }}>
                {
                    Object.keys(sortedTransfers).length > 0 && (
                        <>
                            {
                                currentView == "ongoing" && sortedTransfers.map((transfer) => {
                                    return transfer.done ? null : (
                                        <View key={transfer.id} style={{
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
                                                <Ionicon name={transfer.transfer.paused ? "pause-circle-outline" : transfer.type == "upload" ? "arrow-up-outline" : "arrow-down-outline"} size={20} color={darkMode ? "white" : "black"} />
                                                <Text style={{
                                                    color: darkMode ? "white" : "black",
                                                    marginLeft: 10,
                                                    width: "45%",
                                                    paddingTop: 2
                                                }} numberOfLines={1}>
                                                    {transfer.transfer.file.name}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={{
                                                    color: darkMode ? "white" : "black"
                                                }}>
                                                    {
                                                        transfer.transfer.chunksDone == 0 ? (
                                                            <>{i18n(lang, "queued")}</>
                                                        ) : (
                                                            <>{!isNaN(Math.round((transfer.transfer.chunksDone / transfer.transfer.file.chunks) * 100)) ? (Math.round((transfer.transfer.chunksDone / transfer.transfer.file.chunks) * 100) >= 100 ? 100 : Math.round((transfer.transfer.chunksDone / transfer.transfer.file.chunks) * 100)) : 0}%</>
                                                        )
                                                    }
                                                </Text>
                                            </View>
                                            {
                                                transfer.transfer.paused ? (
                                                    <TouchableOpacity onPress={() => {
                                                        const currentUploads = useStore.getState().sortedTransfers
        
                                                        if(typeof currentUploads[prop] !== "undefined"){
                                                            currentUploads[prop].paused = false
                                                
                                                            useStore.setState({
                                                                sortedTransfers: currentUploads
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
                                                        const currentUploads = useStore.getState().sortedTransfers
        
                                                        if(typeof currentUploads[prop] !== "undefined"){
                                                            currentUploads[prop].paused = true
                                                
                                                            useStore.setState({
                                                                uploads: sortedTransfers
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
                                                const currentUploads = useStore.getState().currentTransfers

                                                if(typeof currentUploads[prop] !== "undefined"){
                                                    currentUploads[prop].stopped = true
                                        
                                                    useStore.setState({
                                                        currentTransfers: currentUploads
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
                                currentView == "finished" && sortedTransfers.map((transfer) => {
                                    return !transfer.done ? null : (
                                        <View key={transfer.id} style={{
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
                                                <Ionicon name={transfer.transfer.paused ? "pause-circle-outline" : transfer.type == "upload" ? "arrow-up-outline" : "arrow-down-outline"} size={20} color={darkMode ? "white" : "black"} />
                                                <Text style={{
                                                    color: darkMode ? "white" : "black",
                                                    marginLeft: 10,
                                                    width: "93%",
                                                    paddingTop: 2
                                                }} numberOfLines={1}>
                                                    {transfer.transfer.file.name}
                                                </Text>
                                            </View>
                                        </View>
                                    )
                                })
                            }
                        </>
                    )
                }
                {
                    ongoingTransfers == 0 && currentView == "ongoing" && (
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
                {
                    finishedTransfers == 0 && currentView == "finished" && (
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
                                {i18n(lang, "noFinishedTransfers")}
                            </Text>
                        </View>
                    )
                }
            </ScrollView>
        </View>
    )
})