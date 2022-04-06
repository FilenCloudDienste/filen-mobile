import React, { useEffect, useState, useCallback, Component, memo, useRef } from "react"
import { View, Text, Platform, ScrollView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, TouchableHighlight } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Ionicon from "react-native-vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { SettingsGroup, SettingsButton } from "./SettingsScreen"
import { fetchEvents, fetchEventInfo } from "../lib/api"
import { showToast } from "./Toasts"
import { useStore } from "../lib/state"
import { navigationAnimation } from "../lib/state"
import { StackActions } from "@react-navigation/native"
import { getMasterKeys, decryptFileMetadata, decryptFolderName } from "../lib/helpers"
import striptags from "striptags"
import { ListEmpty } from "./ListEmpty"
import { useMountedState } from "react-use"

export const EventsInfoScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [eventInfo, setEventInfo] = useState(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const [eventText, setEventText] = useState("")
    const isMounted = useMountedState()

    const uuid = route?.params?.uuid

    useEffect(() => {
        setIsLoading(true)

        fetchEventInfo({ uuid }).then((info) => {
            if(isMounted()){
                setEventInfo(info)

                getEventText({ item: info, masterKeys: getMasterKeys(), lang }).then((text) => {
                    if(isMounted()){
                        setEventText(text)
                        setIsLoading(false)
                    }
                })
            }
        }).catch((err) => {
            console.log(err)

            showToast({ message: err.toString() })
        })
    }, [])

    return (
        <>
            <View style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                <TouchableOpacity style={{
                    marginTop: Platform.OS == "ios" ? 17 : 4,
                    marginLeft: 15,
                }} onPress={() => navigation.goBack()}>
                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                </TouchableOpacity>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 24,
                    marginLeft: 10,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}>
                    {i18n(lang, "eventInfo")}
                </Text>
            </View>
            <ScrollView style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}>
                
                {
                    isLoading ? (
                        <ActivityIndicator size="small" color={darkMode ? "white" : "black"} style={{
                            marginTop: 100
                        }} />
                    ) : (
                        <>
                            <SettingsGroup>
                                <SettingsButton title={eventText} />
                            </SettingsGroup>
                            <SettingsGroup marginTop={10}>
                                <SettingsButton title={new Date(eventInfo.timestamp * 1000).toLocaleDateString() + " " + new Date(eventInfo.timestamp * 1000).toLocaleTimeString()} />
                            </SettingsGroup>
                            <SettingsGroup marginTop={10}>
                                <SettingsButton title={eventInfo.info.userAgent} />
                            </SettingsGroup>
                            <SettingsGroup marginTop={10}>
                                <SettingsButton title={eventInfo.info.ip} />
                            </SettingsGroup>
                        </>
                    )
                }
                <View style={{ height: 25 }}></View>
            </ScrollView>
        </>
    )
})

export const eventTypes = (lang = "en") => {
    return {
        fileUploaded: i18n(lang, "eventFileUploaded"),
        fileVersioned: i18n(lang, "eventFileVersioned"),
        versionedFileRestored: i18n(lang, "eventVersionedFileRestored"),
        fileMoved: i18n(lang, "eventFileMoved"),
        fileRenamed: i18n(lang, "eventFileRenamed"),
        fileTrash: i18n(lang, "eventFileTrash"),
        fileRm: i18n(lang, "eventFileRm"),
        fileRestored: i18n(lang, "eventFileRestored"),
        fileShared: i18n(lang, "eventFileShared"),
        fileLinkEdited: i18n(lang, "eventFileLinkEdited"),
        folderTrash: i18n(lang, "eventFolderTrash"),
        folderShared: i18n(lang, "eventFolderShared"),
        folderMoved: i18n(lang, "eventFolderMoved"),
        folderRenamed: i18n(lang, "eventFolderRenamed"),
        subFolderCreated: i18n(lang, "eventFolderCreated"),
        baseFolderCreated: i18n(lang, "eventFolderCreated"),
        folderRestored: i18n(lang, "eventFolderRestored"),
        folderColorChanged: i18n(lang, "eventFolderColorChanged"),
        login: i18n(lang, "eventLogin"),
        deleteVersioned: i18n(lang, "eventDeleteVersioned"),
        deleteAll: i18n(lang, "eventDeleteAll"),
        deleteUnfinished: i18n(lang, "eventDeleteUnfinished"),
        trashEmptied: i18n(lang, "eventTrashEmptied"),
        requestAccountDeletion: i18n(lang, "eventRequestAccountDeletion"),
        "2faEnabled": i18n(lang, "event2FAEnabled"),
        "2faDisabled": i18n(lang, "event2FADisabled"),
        codeRedeem: i18n(lang, "eventCodeRedeem"),
        emailChanged: i18n(lang, "eventEmailChanged"),
        passwordChanged: i18n(lang, "eventPasswordChanged"),
        removedSharedInItems: i18n(lang, "eventRemovedSharedInItems"),
        removedSharedOutItems: i18n(lang, "eventRemovedSharedOutItems")
    }
}

export const getEventText = async ({ item, masterKeys, lang }) => {
    let eventText = ""

    switch(item.type){
        case "fileUploaded":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileUploadedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileVersioned":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileVersionedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "versionedFileRestored":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventVersionedFileRestoredInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileMoved":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileMovedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRenamed":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)
            var decryptedOld = await decryptFileMetadata(masterKeys, item.info.oldMetadata, item.info.uuid)

            eventText = i18n(lang, "eventFileRenamedInfo", true, ["__NAME__", "__NEW__"], [striptags(decryptedOld.name), striptags(decrypted.name)])
        break
        case "fileTrash":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileTrashInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRm":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileRmInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRestored":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileRestoredInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileShared":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileSharedInfo", true, ["__NAME__", "__EMAIL__"], [striptags(decrypted.name), item.info.receiverEmail])
        break
        case "fileLinkEdited":
            var decrypted = await decryptFileMetadata(masterKeys, item.info.metadata, item.info.uuid)

            eventText = i18n(lang, "eventFileLinkEditedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "folderTrash":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderTrashInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderShared":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderSharedInfo", true, ["__NAME__", "__EMAIL__"], [striptags(decrypted), item.info.receiverEmail])
        break
        case "folderMoved":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderMovedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderRenamed":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)
            var decryptedOld = await decryptFolderName(masterKeys, item.info.oldName, item.info.uuid)

            str += `
                ` + escapeHTML(decryptedOld) + ` renamed to ` + escapeHTML(decrypted) + `
            `
            eventText = i18n(lang, "eventFolderRenamedInfo", true, ["__NAME__", "__NEW__"], [striptags(decryptedOld), striptags(decrypted)])
        break
        case "subFolderCreated":
        case "baseFolderCreated":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderCreatedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderRestored":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderRestoredInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderColorChanged":
            var decrypted = await decryptFolderName(masterKeys, item.info.name, item.info.uuid)

            eventText = i18n(lang, "eventFolderColorChangedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "login":
            eventText = i18n(lang, "eventLoginInfo")
        break
        case "deleteVersioned":
            eventText = i18n(lang, "eventDeleteVersionedInfo")
        break
        case "deleteAll":
            eventText = i18n(lang, "eventDeleteAllInfo")
        break
        case "deleteUnfinished":
            eventText = i18n(lang, "eventDeleteUnfinishedInfo")
        break
        case "trashEmptied":
            eventText = i18n(lang, "eventTrashEmptiedInfo")
        break
        case "requestAccountDeletion":
            eventText = i18n(lang, "eventRequestAccountDeletionInfo")
        break
        case "2faEnabled":
            eventText = i18n(lang, "event2FAEnabledInfo")
        break
        case "2faDisabled":
            eventText = i18n(lang, "event2FADisabledInfo")
        break
        case "codeRedeemed":
            eventText = i18n(lang, "eventCodeRedeemInfo", true, ["__CODE__"], [item.info.code])
        break
        case "emailChanged":
            eventText = i18n(lang, "eventEmailChangedInfo", true, ["__CODE__"], [item.info.email])
        break
        case "passwordChanged":
            eventText = i18n(lang, "eventPasswordChangedInfo")
        break
        case "removedSharedInItems":
            eventText = i18n(lang, "eventRemovedSharedInItemsInfo", true, ["__COUNT__", "__EMAIL__"], [item.info.count, item.info.sharerEmail])
        break
        case "removedSharedOutItems":
            eventText = i18n(lang, "eventRemovedSharedOutItemsInfo", true, ["__COUNT__", "__EMAIL__"], [item.info.count, item.info.receiverEmail])
        break
        default:
            eventText = item.type
        break
    }

    return eventText
}

export class EventRow extends Component {
    state = {
        eventText: ""
    }

    async componentDidMount(){
        const { item, masterKeys, lang } = this.props
        const eventText = await getEventText({ item, masterKeys, lang })

        this.setState({ eventText })
    }

    render(){
        const { item, index, darkMode, lang, navigation } = this.props

        return (
            <View key={index} style={{
                height: 35,
                width: "100%",
                paddingLeft: 15,
                paddingRight: 15,
                marginBottom: 10
            }}>
                <View style={{
                    height: "auto",
                    width: "100%",
                    backgroundColor: darkMode ? "#171717" : "lightgray",
                    borderRadius: 10
                }}>
                    <TouchableHighlight underlayColor={"gray"} style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: 10
                    }} onPress={() => {
                        navigationAnimation({ enable: true }).then(() => {
                            navigation.dispatch(StackActions.push("EventsInfoScreen", {
                                uuid: item.uuid
                            }))
                        })
                    }}>
                        <View style={{
                            width: "100%",
                            height: "auto",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingLeft: 10,
                            paddingRight: 10,
                            paddingTop: 9,
                            paddingBottom: 10
                        }}>
                            <Text style={{
                                color: darkMode ? "white" : "black",
                                fontSize: 13,
                                width: "45%"
                            }} numberOfLines={1}>
                                {this.state.eventText}
                            </Text>
                            <View style={{
                                flexDirection: "row",
                                paddingTop: 2
                            }}>
                                <Text style={{
                                    color: "gray",
                                    paddingRight: 10,
                                    fontSize: 12
                                }}>
                                    {new Date(item.timestamp * 1000).toLocaleDateString()} {new Date(item.timestamp * 1000).toLocaleTimeString()}
                                </Text>
                                <Ionicon name="chevron-forward-outline" size={15} color="gray" style={{
                                    marginTop: 0
                                }} />
                            </View>
                        </View>
                    </TouchableHighlight>
                </View>
            </View>
        )
    }
}

export const EventsScreen = memo(({ navigation, route }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState("all")
    const [limit, setLimit] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const dimensions = useStore(useCallback(state => state.dimensions))
    const [masterKeys, setMasterKeys] = useState(getMasterKeys())
    const isMounted = useMountedState()
    const [topHeight, setTopHeight] = useState(0)
    const bottomBarHeight = useStore(useCallback(state => state.bottomBarHeight))
    const contentHeight = useStore(useCallback(state => state.contentHeight))
    const onEndReachedCalledDuringMomentum = useRef(false)
    const lastEventId = useRef(0)

    const getEvents = useCallback((lastId) => {
        setIsLoading(true)
        
        fetchEvents({ lastId, filter }).then((data) => {
            if(isMounted()){
                setIsLoading(false)
                setRefreshing(false)

                const newEvents = data.events
                const limit = data.limit

                setEvents(prev => [...prev, ...newEvents])
                setLimit(limit)

                newEvents.map(event => console.log(event.id))
                
                lastEventId.current = newEvents[newEvents.length - 1].id
            }
        }).catch((err) => {
            console.log(err)

            showToast({ message: err.toString() })
        })
    })

    useEffect(() => {
        setEvents([])

        getEvents(lastEventId.current)
    }, [])

    return (
        <>
            <View style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                backgroundColor: darkMode ? "black" : "white"
            }} onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>
                <TouchableOpacity style={{
                    marginTop: Platform.OS == "ios" ? 17 : 4,
                    marginLeft: 15,
                }} onPress={() => navigation.goBack()}>
                    <Ionicon name="chevron-back" size={24} color={darkMode ? "white" : "black"}></Ionicon>
                </TouchableOpacity>
                <Text style={{
                    color: darkMode ? "white" : "black",
                    fontWeight: "bold",
                    fontSize: 24,
                    marginLeft: 10,
                    marginTop: Platform.OS == "ios" ? 15 : 0
                }}>
                    {i18n(lang, "events")}
                </Text>
            </View>
            <View style={{
                height: Math.floor(contentHeight - topHeight - bottomBarHeight + 31),
                width: "100%",
                backgroundColor: darkMode ? "black" : "white",
                paddingTop: 15
            }}>
                <FlatList
                    data={events}
                    keyExtractor={(item, index) => index}
                    key="events"
                    windowSize={10}
                    initialNumToRender={32}
                    removeClippedSubviews={true}
                    numColumns={1}
                    renderItem={({ item, index }) => <EventRow item={item} index={index} darkMode={darkMode} lang={lang} navigation={navigation} masterKeys={masterKeys} />}
                    onMomentumScrollBegin={() => onEndReachedCalledDuringMomentum.current = false}
                    onEndReachedThreshold={0.1}
                    onEndReached={() => {
                        if(limit <= events.length && limit > 0 && events.length > 0 && !onEndReachedCalledDuringMomentum.current){
                            onEndReachedCalledDuringMomentum.current = true

                            console.log("called")

                            getEvents(lastEventId.current)
                        }
                    }}
                    getItemLayout={(data, index) => (
                        {length: 45, offset: 45 * index, index}
                    )}
                    ListEmptyComponent={() => {
                        return (
                            <View style={{
                                width: "100%",
                                height: Math.floor(dimensions.screen.height - 255),
                                justifyContent: "center",
                                alignItems: "center",
                                alignContent: "center"
                            }}>
                                {
                                    isLoading ? (
                                        <View>
                                            <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
                                            <Text style={{
                                                color: darkMode ? "white" : "black",
                                                marginTop: 15
                                            }}>
                                                {i18n(lang, "loading")}
                                            </Text>
                                        </View>
                                    ) : (
                                        <ListEmpty route={route} searchTerm={""} />
                                    )
                                }
                            </View>
                        )
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                if(!isLoading){
                                    return false
                                }
    
                                setRefreshing(true)
            
                                getEvents(0)
                            }}
                            tintColor={darkMode ? "white" : "black"}
                            size="default"
                        />
                    }
                    style={{
                        height: "100%",
                        width: "100%"
                    }}
                    ListFooterComponent={
                        isLoading ? (
                            <></>
                        ) : (
                            limit <= events.length && limit > 0 && events.length > 0 ? (
                                <View style={{
                                    height: 50,
                                    marginTop: 15
                                }}>
                                    <ActivityIndicator color={darkMode ? "white" : "black"} size="small" />
                                </View>
                            ) : (
                                <></>
                            )
                        )
                    }
                />
            </View>
        </>
    )
})