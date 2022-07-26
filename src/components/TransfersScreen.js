import React, { useCallback, memo, useEffect, useState } from "react"
import { View, Text, TouchableOpacity, Platform, FlatList } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useStore } from "../lib/state"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"
import memoryCache from "../lib/memoryCache"
import { useMountedState } from "react-use"
import BackgroundTimer from "react-native-background-timer"
import { SheetManager } from "react-native-actions-sheet"

export const TransfersScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [sortedTransfers, setSortedTransfers] = useState([])
    const isMounted = useMountedState()
    const [currentView, setCurrentView] = useState("ongoing")
    const [ongoingTransfers, setOngoingTransfers] = useState(0)
    const [finishedTransfers, setFinishedTransfers] = useState(0)
    const [ongoingTransfersList, setOngoingTransfersList] = useState([])
    const [finishedTransfersList, setFinishedTransfersList] = useState([])
    const bottomBarHeight = useStore(useCallback(state => state.bottomBarHeight))
    const contentHeight = useStore(useCallback(state => state.contentHeight))
    const [topBarHeight, setTopBarHeight] = useState(useStore.getState().topBarHeight)

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

            const finishedList = []
            const ongoingList = []

            if(sortedTransfers.length > 0){
                //const sorted = sortedTransfers.sort((a, b) => {
                //    return a.done > b.done
                //})

                const sorted = sortedTransfers.sort((a, b) => {
                    return (isNaN(Math.round((a.transfer.chunksDone / a.transfer.file.chunks) * 100)) ? 0 : Math.round((a.transfer.chunksDone / a.transfer.file.chunks) * 100)) < (isNaN(Math.round((b.transfer.chunksDone / b.transfer.file.chunks) * 100)) ? 0 : Math.round((b.transfer.chunksDone / b.transfer.file.chunks) * 100))
                })
    
                setSortedTransfers(sorted)

                for(let i = 0; i < sorted.length; i++){
                    if(sorted[i].done){
                        finishedList.push(sorted[i])
                    }
                    else{
                        ongoingList.push(sorted[i])
                    }
                }
            }

            setFinishedTransfersList(finishedList)
            setOngoingTransfersList(ongoingList)

            BackgroundTimer.setTimeout(updateTransfers, 100)
        }
    })

    useEffect(() => {
        updateTransfers()
    }, [])

    return (
        <View style={{
            height: "100%",
            width: "100%",
            backgroundColor: darkMode ? "black" : "white"
        }}>
            <View style={{
                width: "100%",
                height: Platform.OS == "android" ? 75 : 87
            }} onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}>
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    backgroundColor: darkMode ? "black" : "white"
                }}>
                    <View style={{
                        flexDirection: "row"
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
                    <TouchableOpacity hitSlop={{
                        top: 10,
                        right: 10,
                        left: 10,
                        bottom: 10
                    }} style={{
                        alignItems: "flex-end",
                        flexDirection: "row",
                        backgroundColor: "transparent",
                        height: "100%",
                        paddingLeft: 0,
                        paddingRight: 15
                    }} onPress={() => SheetManager.show("TopBarActionSheet")}>
                        {
                            ongoingTransfers > 0 && (
                                <View>
                                    <Ionicon name="ellipsis-horizontal-sharp" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                                </View>
                            )
                        }
                    </TouchableOpacity>
                </View>
                <View style={{
                    height: "auto",
                    width: "100%",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 20
                }}>
                    <TouchableOpacity style={{
                        borderBottomWidth: currentView == "ongoing" ? Platform.OS == "ios" ? 1.5 : 2 : 1,
                        borderBottomColor: currentView == "ongoing" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                        height: 27,
                        paddingLeft: 15,
                        paddingRight: 15,
                        width: "50%",
                        alignItems: "center"
                    }} hitSlop={{
                        top: 20
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
                        borderBottomWidth: currentView == "finished" ? Platform.OS == "ios" ? 1.5 : 2 : 1,
                        borderBottomColor: currentView == "finished" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                        height: 27,
                        paddingLeft: 15,
                        paddingRight: 15,
                        width: "50%",
                        alignItems: "center"
                    }} hitSlop={{
                        top: 20
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
            </View>
            <View style={{
                width: "100%",
                height: (contentHeight - topBarHeight - bottomBarHeight + 30)
            }}>
                {
                    currentView == "ongoing" && (
                        <FlatList
                            data={ongoingTransfersList}
                            keyExtractor={(item, index) => index}
                            key="ongoing"
                            windowSize={10}
                            initialNumToRender={32}
                            removeClippedSubviews={true}
                            numColumns={1}
                            renderItem={({ item, index }) => {
                                const transfer = item
                                
                                return (
                                    <View key={index} style={{
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
                                            flexDirection: "row",
                                            width: "50%"
                                        }}>
                                            <Ionicon name={transfer.transfer.paused ? "pause-circle-outline" : transfer.type == "upload" ? "arrow-up-outline" : "arrow-down-outline"} size={20} color={darkMode ? "white" : "black"} />
                                            <Text style={{
                                                color: darkMode ? "white" : "black",
                                                marginLeft: 10,
                                                paddingTop: 2
                                            }} numberOfLines={1}>
                                                {transfer.transfer.file.name}
                                            </Text>
                                        </View>
                                        <View style={{
                                            marginLeft: 20
                                        }}>
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
                                                    if(transfer.type == "upload"){
                                                        const currentUploads = useStore.getState().uploads
                                                        let didChange = false

                                                        for(let prop in currentUploads){
                                                            if(transfer.transfer.id == currentUploads[prop].id){
                                                                currentUploads[prop].paused = false
                                                                didChange = true
                                                            }
                                                        }

                                                        if(didChange){
                                                            useStore.setState({
                                                                uploads: currentUploads
                                                            })
                                                        }
                                                    }
                                                    else{
                                                        const currentDownloads = useStore.getState().downloads
                                                        let didChange = false
    
                                                        for(let prop in currentDownloads){
                                                            if(transfer.transfer.id == currentDownloads[prop].id){
                                                                currentDownloads[prop].paused = false
                                                                didChange = true
                                                            }
                                                        }

                                                        if(didChange){
                                                            useStore.setState({
                                                                downloads: currentDownloads
                                                            })
                                                        }
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
                                                    if(transfer.type == "upload"){
                                                        const currentUploads = useStore.getState().uploads
                                                        let didChange = false
    
                                                        for(let prop in currentUploads){
                                                            if(transfer.transfer.id == currentUploads[prop].id){
                                                                currentUploads[prop].paused = true
                                                                didChange = true
                                                            }
                                                        }

                                                        if(didChange){
                                                            useStore.setState({
                                                                uploads: currentUploads
                                                            })
                                                        }
                                                    }
                                                    else{
                                                        const currentDownloads = useStore.getState().downloads
                                                        let didChange = false
    
                                                        for(let prop in currentDownloads){
                                                            if(transfer.transfer.id == currentDownloads[prop].id){
                                                                currentDownloads[prop].paused = true
                                                                didChange = true
                                                            }
                                                        }

                                                        if(didChange){
                                                            useStore.setState({
                                                                downloads: currentDownloads
                                                            })
                                                        }
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
                                            if(transfer.type == "upload"){
                                                const currentUploads = useStore.getState().uploads
                                                let didChange = false

                                                for(let prop in currentUploads){
                                                    if(transfer.transfer.id == currentUploads[prop].id){
                                                        currentUploads[prop].stopped = true
                                                        didChange = true
                                                    }
                                                }

                                                if(didChange){
                                                    useStore.setState({
                                                        uploads: currentUploads
                                                    })
                                                }
                                            }
                                            else{
                                                const currentDownloads = useStore.getState().downloads
                                                let didChange = false

                                                for(let prop in currentDownloads){
                                                    if(transfer.transfer.id == currentDownloads[prop].id){
                                                        currentDownloads[prop].stopped = true
                                                        didChange = true
                                                    }
                                                }

                                                if(didChange){
                                                    useStore.setState({
                                                        downloads: currentDownloads
                                                    })
                                                }
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
                            }}
                            getItemLayout={(data, index) => (
                                {length: 40, offset: 40 * index, index}
                            )}
                            style={{
                                height: "100%",
                                width: "100%"
                            }}
                            ListEmptyComponent={() => {
                                return (
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
                            }}
                        />
                    )
                }
                {
                    currentView == "finished" && (
                        <FlatList
                            data={finishedTransfersList}
                            keyExtractor={(item, index) => index}
                            key="ongoing"
                            windowSize={10}
                            initialNumToRender={32}
                            removeClippedSubviews={true}
                            numColumns={1}
                            renderItem={({ item, index }) => {
                                const transfer = item
                                
                                return (
                                    <View key={index} style={{
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
                                            flexDirection: "row",
                                            width: "90%"
                                        }}>
                                            <Ionicon name={transfer.type == "upload" ? "arrow-up-outline" : "arrow-down-outline"} size={20} color={darkMode ? "white" : "black"} />
                                            <Text style={{
                                                color: darkMode ? "white" : "black",
                                                marginLeft: 10,
                                                paddingTop: 2
                                            }} numberOfLines={1}>
                                                {transfer.transfer.file.name}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            }}
                            getItemLayout={(data, index) => (
                                {length: 40, offset: 40 * index, index}
                            )}
                            style={{
                                height: "100%",
                                width: "100%"
                            }}
                            ListEmptyComponent={() => {
                                return (
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
                            }}
                        />
                    )
                }
            </View>
        </View>
    )
})