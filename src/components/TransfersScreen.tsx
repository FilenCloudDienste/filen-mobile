import React, { memo, useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, Platform, FlatList, ScrollView, DeviceEventEmitter } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { useStore } from "../lib/state"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../i18n/i18n"
import { getColor } from "../lib/style/colors"
import { SheetManager } from "react-native-actions-sheet"

export interface FinishedTransfersListProps {
    finishedTransfers: any
}

export const FinishedTransfersList = memo(({ finishedTransfers }: FinishedTransfersListProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)

    return (
        <FlatList
            data={finishedTransfers}
            keyExtractor={(_, index) => index.toString()}
            key="finished"
            windowSize={10}
            initialNumToRender={32}
            numColumns={1}
            renderItem={({ item, index }) => {
                const transfer = item
                    
                return (
                    <View
                        key={index.toString()}
                        style={{
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
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                width: "90%"
                            }}
                        >
                            <Ionicon
                                name={transfer.transferType == "upload" ? "arrow-up-outline" : "arrow-down-outline"}
                                size={20}
                                color={darkMode ? "white" : "black"}
                            />
                            <Text
                                style={{
                                    color: darkMode ? "white" : "black",
                                    marginLeft: 10,
                                    paddingTop: 2
                                }}
                                numberOfLines={1}
                            >
                                {transfer.name}
                            </Text>
                        </View>
                    </View>
                )
            }}
            getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
            style={{
                height: "100%",
                width: "100%"
            }}
            ListEmptyComponent={() => {
                return (
                    <View
                        style={{
                            marginTop: "60%",
                            justifyContent: "center",
                            alignItems: "center"
                        }}
                    >
                        <Ionicon
                            name="repeat-outline"
                            size={70}
                            color="gray"
                        />
                        <Text
                            style={{
                                color: "gray",
                                marginTop: 5
                            }}
                        >
                            {i18n(lang, "noFinishedTransfers")}
                        </Text>
                    </View>
                )
            }}
        />
    )
})

export interface OngoingTransfersListProps {
    currentTransfers: any
}

export const OngoingTransfersList = memo(({ currentTransfers }: OngoingTransfersListProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [pausedTransfers, setPausedTransfers] = useState<any>({})

    useEffect(() => {
        if(currentTransfers.length == 0){
            setPausedTransfers({})
        }
    }, [currentTransfers.length])

    return (
        <FlatList
            data={currentTransfers}
            keyExtractor={(_, index) => index.toString()}
            key="ongoing"
            windowSize={10}
            initialNumToRender={32}
            numColumns={1}
            renderItem={({ item, index }) => {
                const transfer = item
                const isPaused = typeof pausedTransfers[transfer.uuid] == "boolean" ? pausedTransfers[transfer.uuid] : false
                
                return (
                    <View
                        key={index.toString()}
                        style={{
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
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                width: "50%"
                            }}
                        >
                            <Ionicon
                                name={isPaused ? "pause-circle-outline" : transfer.transferType == "upload" ? "arrow-up-outline" : "arrow-down-outline"}
                                size={20}
                                color={darkMode ? "white" : "black"}
                            />
                            <Text
                                style={{
                                    color: darkMode ? "white" : "black",
                                    marginLeft: 10,
                                    paddingTop: 2
                                }}
                                numberOfLines={1}
                            >
                                {transfer.name}
                            </Text>
                        </View>
                        <View
                            style={{
                                marginLeft: 20
                            }}
                        >
                            <Text
                                style={{
                                    color: darkMode ? "white" : "black"
                                }}
                            >
                                {
                                    isPaused ? "" : transfer.percent == 0 ? (
                                        <>{i18n(lang, "queued")}</>
                                    ) : (
                                        <>{isNaN(transfer.percent) ? 0 : transfer.percent >= 100 ? 100 : transfer.percent.toFixed(2)}%</>
                                    )
                                }
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setPausedTransfers((prev: any) => ({
                                    ...prev,
                                    [transfer.uuid]: !isPaused
                                }))

                                DeviceEventEmitter.emit(isPaused ? "resumeTransfer" : "pauseTransfer", transfer.uuid)
                            }}
                        >
                            <Text
                                style={{
                                    color: "#0A84FF"
                                }}
                            >
                                {isPaused ? i18n(lang, "resume") : i18n(lang, "pause")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => DeviceEventEmitter.emit("stopTransfer", transfer.uuid)}
                        >
                            <Text
                                style={{
                                    color: "#0A84FF"
                                }}
                            >
                                {i18n(lang, "stop")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )
            }}
            getItemLayout={(_, index) => ({ length: 40, offset: 40 * index, index })}
            style={{
                height: "100%",
                width: "100%"
            }}
            ListEmptyComponent={() => {
                return (
                    <View
                        style={{
                            marginTop: "60%",
                            justifyContent: "center",
                            alignItems: "center"
                        }}
                    >
                        <Ionicon
                            name="repeat-outline"
                            size={70}
                            color="gray"
                        />
                        <Text
                            style={{
                                color: "gray",
                                marginTop: 5
                            }}
                        >
                            {i18n(lang, "noTransfers")}
                        </Text>
                    </View>
                )
            }}
        />
    )
})

export interface TransfersScreenBodyProps {
    currentTransfers: any,
    currentUploads: any,
    currentDownloads: any,
    finishedTransfers: any,
    navigation: any,
}

export const TransfersScreenBody = memo(({ currentTransfers, currentUploads, currentDownloads, finishedTransfers, navigation }: TransfersScreenBodyProps) => {
    const bottomBarHeight = useStore(state => state.bottomBarHeight)
    const contentHeight = useStore(state => state.contentHeight)
    const dimensions = useStore(state => state.dimensions)
    const [topBarHeight, setTopBarHeight] = useState<number>(useStore.getState().topBarHeight)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [currentView, setCurrentView] = useState<string>("ongoing")
    const scrollViewRef = useRef<any>()

    return (
        <View
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: darkMode ? "black" : "white"
            }}
        >
            <View
                style={{
                    width: "100%",
                    height: Platform.OS == "android" ? 75 : 87
                }}
                onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        backgroundColor: darkMode ? "black" : "white"
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row"
                        }}
                    >
                        <TouchableOpacity
                            style={{
                                marginTop: Platform.OS == "ios" ? 16 : 3,
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
                                fontSize: 22,
                                marginLeft: 10,
                                marginTop: Platform.OS == "ios" ? 15 : 0
                            }}
                        >
                            {i18n(lang, "transfers")}
                        </Text>
                    </View>
                    <TouchableOpacity
                        hitSlop={{
                            top: 10,
                            right: 10,
                            left: 10,
                            bottom: 10
                        }}
                        style={{
                            alignItems: "flex-end",
                            flexDirection: "row",
                            backgroundColor: "transparent",
                            height: "100%",
                            paddingLeft: 0,
                            paddingRight: 15
                        }}
                        onPress={() => SheetManager.show("TopBarActionSheet")}
                    >
                        {
                            (Object.keys(currentUploads).length + Object.keys(currentDownloads).length) > 0 && (
                                <View>
                                    <Ionicon
                                        name="ellipsis-horizontal-sharp"
                                        size={24}
                                        color={darkMode ? "white" : "black"}
                                    />
                                </View>
                            )
                        }
                    </TouchableOpacity>
                </View>
                <View
                    style={{
                        height: "auto",
                        width: "100%",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 20
                    }}
                >
                    <TouchableOpacity
                        style={{
                            borderBottomWidth: currentView == "ongoing" ? Platform.OS == "ios" ? 1.5 : 2 : 1,
                            borderBottomColor: currentView == "ongoing" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                            height: 27,
                            paddingLeft: 15,
                            paddingRight: 15,
                            width: "50%",
                            alignItems: "center"
                        }}
                        hitSlop={{
                            top: 20
                        }}
                        onPress={() => scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true })}
                    >
                        <Text
                            style={{
                                color: currentView == "ongoing" ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 14
                            }}
                        >
                            {i18n(lang, "ongoing")}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            borderBottomWidth: currentView == "finished" ? Platform.OS == "ios" ? 1.5 : 2 : 1,
                            borderBottomColor: currentView == "finished" ? "#0A84FF" : getColor(darkMode, "primaryBorder"),
                            height: 27,
                            paddingLeft: 15,
                            paddingRight: 15,
                            width: "50%",
                            alignItems: "center"
                        }}
                        hitSlop={{
                            top: 20
                        }}
                        onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        <Text
                            style={{
                                color: currentView == "finished" ? "#0A84FF" : "gray",
                                fontWeight: "bold",
                                fontSize: 14
                            }}
                        >
                            {i18n(lang, "finished")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                style={{
                    width: dimensions.window.width,
                    height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                }}
                pagingEnabled={true}
                horizontal={true}
                disableIntervalMomentum={true} 
                snapToAlignment="center"
                onMomentumScrollEnd={(e) => setCurrentView(e.nativeEvent.contentOffset.x == 0 ? "ongoing" : "finished")}
                ref={scrollViewRef}
            >
                <View
                    style={{
                        width: dimensions.window.width,
                        height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                    }}
                >
                    <OngoingTransfersList
                        currentTransfers={currentTransfers}
                    />
                </View>
                <View
                    style={{
                        width: dimensions.window.width,
                        height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                    }}
                >
                    <FinishedTransfersList finishedTransfers={finishedTransfers} />
                </View>
            </ScrollView>
        </View>
    )
})

export interface TransfersScreenProps {
    navigation: any
}

export const TransfersScreen = memo(({ navigation }: TransfersScreenProps) => {
    const [currentTransfers, setCurrentTransfers] = useState<any>([])
    const currentUploads = useStore(state => state.currentUploads)
    const currentDownloads = useStore(state => state.currentDownloads)
    const finishedTransfers = useStore(state => state.finishedTransfers)

    useEffect(() => {
        const transfers = []

        for(const prop in currentUploads){
            transfers.push({
                ...currentUploads[prop],
                transferType: "upload",
                paused: false
            })
        }

        for(const prop in currentDownloads){
            transfers.push({
                ...currentDownloads[prop],
                transferType: "download",
                paused: false
            })
        }

        setCurrentTransfers(transfers.sort((a, b) => b.percent - a.percent))
    }, [currentUploads, currentDownloads])

    return (
        <TransfersScreenBody
            currentTransfers={currentTransfers}
            currentUploads={currentUploads}
            currentDownloads={currentDownloads}
            finishedTransfers={finishedTransfers}
            navigation={navigation}
        />
    )
})