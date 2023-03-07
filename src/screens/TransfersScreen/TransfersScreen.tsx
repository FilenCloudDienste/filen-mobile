import React, { memo, useEffect, useState, useRef, useCallback, useMemo } from "react"
import { View, Text, TouchableOpacity, Platform, FlatList, ScrollView, DeviceEventEmitter, useWindowDimensions, ScaledSize, LayoutChangeEvent, Image } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { useStore } from "../../lib/state"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { getColor } from "../../style/colors"
import { SheetManager } from "react-native-actions-sheet"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { Bar } from "react-native-progress"
import { getImageForItem } from "../../assets/thumbnails"
import { Item } from "../../types"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { normalizeProgress } from "../../lib/helpers"

const TRANSFER_ITEM_HEIGHT: number = 60

export interface FinishedTransfersListProps {
    finishedTransfers: any
}

export interface FinishedTransferItemProps {
    index: number,
    item: any,
    containerWidth: number,
    darkMode: boolean
}

export const FinishedTransferItem = memo(({ index, item, containerWidth, darkMode }: FinishedTransferItemProps) => {
    return (
        <View
            key={index.toString()}
            style={{
                width: "100%",
                height: TRANSFER_ITEM_HEIGHT,
                paddingLeft: 15,
                paddingRight: 15,
                flexDirection: "row"
            }}
        >
            <View
                style={{
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                <Image
                    source={getImageForItem({ name: item.name, type: "file" } as Item)}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 5
                    }}
                />
            </View>
            <View
                style={{
                    justifyContent: "center",
                    marginLeft: 10,
                    maxWidth: (containerWidth - 60),
                    paddingRight: 10
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center"
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "textPrimary"),
                            fontSize: 16,
                            fontWeight: "400"
                        }}
                        numberOfLines={1}
                    >
                        {item.name || ""}
                    </Text>
                </View>
                <View
                    style={{
                        marginTop: 7
                    }}
                >
                    <Bar
                        animated={true}
                        indeterminate={false}
                        progress={1}
                        color={getColor(darkMode, "green")}
                        width={containerWidth - 71}
                        height={4}
                        borderColor={getColor(darkMode, "backgroundPrimary")}
                        unfilledColor={getColor(darkMode, "backgroundSecondary")}
                    />
                </View>
            </View>
        </View>
    )
})

export const FinishedTransfersList = memo(({ finishedTransfers }: FinishedTransfersListProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const dimensions = useWindowDimensions()
    const [containerWidth, setContainerWidth] = useState<number>(dimensions.width - 30)
    const [containerHeight, setContainerHeight] = useState<number>(dimensions.height - 100)
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
    const insets = useSafeAreaInsets()

    const renderItem = useCallback(({ item, index }) => {
        return (
            <FinishedTransferItem
                darkMode={darkMode}
                item={item}
                containerWidth={containerWidth}
                index={index}
            />
        )
    }, [containerWidth, portrait, darkMode])

    const getItemLayout = useCallback((_, index) => ({ length: TRANSFER_ITEM_HEIGHT, offset: TRANSFER_ITEM_HEIGHT * index, index }), [])
    const keyExtractor = useCallback((_, index) => index.toString(), [])
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width - insets.left - insets.right)
        setContainerHeight(e.nativeEvent.layout.height)
    }, [])

    useEffect(() => {
        setPortrait(dimensions.height >= dimensions.width)
    }, [dimensions])

    return (
        <FlatList
            data={finishedTransfers}
            scrollEnabled={finishedTransfers.length > 0}
            keyExtractor={keyExtractor}
            key={"finished-list-" + (portrait ? "portrait" : "landscape")}
            windowSize={10}
            numColumns={1}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            onLayout={onLayout}
            style={{
                height: "100%",
                width: "100%"
            }}
            ListEmptyComponent={() => {
                return (
                    <View
                        style={{
                            marginTop: (containerHeight / 2) - 60,
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: !portrait && insets.left > 0  && insets.right > 0 ? -(insets.left + insets.right) : 0
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

export interface OngoingTransferItemProps {
    index: number,
    item: any,
    containerWidth: number,
    darkMode: boolean,
    lang: string,
    pausedTransfers: Record<string, boolean>,
    setPausedTransfers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export const OngoingTransferItem = memo(({ index, item, containerWidth, darkMode, lang, pausedTransfers, setPausedTransfers }: OngoingTransferItemProps) => {
    const progress = useMemo(() => {
        return normalizeProgress(item.percent)
    }, [item.percent])

    const isPaused = useMemo(() => {
        return typeof pausedTransfers[item.uuid] == "boolean" ? pausedTransfers[item.uuid] : false
    }, [pausedTransfers])

    return (
        <View
            key={index.toString()}
            style={{
                width: "100%",
                height: TRANSFER_ITEM_HEIGHT,
                paddingLeft: 15,
                paddingRight: 15,
                flexDirection: "row"
            }}
        >
            <View
                style={{
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                <Image
                    source={getImageForItem({ name: item.name, type: "file" } as Item)}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 5
                    }}
                />
            </View>
            <View
                style={{
                    justifyContent: "center",
                    marginLeft: 10,
                    maxWidth: (containerWidth - (isPaused ? 170 : 160)),
                    paddingRight: 10
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center"
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "textPrimary"),
                            fontSize: 16,
                            fontWeight: "400"
                        }}
                        numberOfLines={1}
                    >
                        {item.name || ""}
                    </Text>
                </View>
                <View
                    style={{
                        marginTop: 7
                    }}
                >
                    <Bar
                        animated={true}
                        indeterminate={isPaused}
                        progress={progress}
                        color={getColor(darkMode, "green")}
                        width={containerWidth - 67}
                        height={4}
                        borderColor={getColor(darkMode, "backgroundPrimary")}
                        unfilledColor={getColor(darkMode, "backgroundSecondary")}
                    />
                </View>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    paddingTop: 11
                }}
            >
                <TouchableOpacity
                    onPress={() => {
                        setPausedTransfers(prev => ({
                            ...prev,
                            [item.uuid]: !isPaused
                        }))
    
                        DeviceEventEmitter.emit(isPaused ? "resumeTransfer" : "pauseTransfer", item.uuid)
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "linkPrimary"),
                            fontSize: 16,
                            fontWeight: "400"
                        }}
                    >
                        {isPaused ? i18n(lang, "resume") : i18n(lang, "pause")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        marginLeft: 10
                    }}
                    onPress={() => DeviceEventEmitter.emit("stopTransfer", item.uuid)}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "linkPrimary"),
                            fontSize: 16,
                            fontWeight: "400"
                        }}
                    >
                        {i18n(lang, "stop")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})

export const OngoingTransfersList = memo(({ currentTransfers }: OngoingTransfersListProps) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const [pausedTransfers, setPausedTransfers] = useState<Record<string, boolean>>({})
    const dimensions = useWindowDimensions()
    const [containerWidth, setContainerWidth] = useState<number>(dimensions.width - 30)
    const [containerHeight, setContainerHeight] = useState<number>(dimensions.height - 100)
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)
    const insets = useSafeAreaInsets()

    const renderItem = useCallback(({ item, index }) => {
        return (
            <OngoingTransferItem
                darkMode={darkMode}
                lang={lang}
                pausedTransfers={pausedTransfers}
                setPausedTransfers={setPausedTransfers}
                item={item}
                containerWidth={containerWidth}
                index={index}
            />
        )
    }, [containerWidth, portrait, pausedTransfers, darkMode, lang])

    const getItemLayout = useCallback((_, index) => ({ length: TRANSFER_ITEM_HEIGHT, offset: TRANSFER_ITEM_HEIGHT * index, index }), [])
    const keyExtractor = useCallback((_, index) => index.toString(), [])
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width - insets.left - insets.right)
        setContainerHeight(e.nativeEvent.layout.height)
    }, [])

    useEffect(() => {
        setPortrait(dimensions.height >= dimensions.width)
    }, [dimensions])

    useEffect(() => {
        if(currentTransfers.length == 0){
            setPausedTransfers({})
        }
    }, [currentTransfers.length])

    return (
        <FlatList
            data={currentTransfers}
            scrollEnabled={currentTransfers.length > 0}
            keyExtractor={keyExtractor}
            key={"ongoing-list-" + (portrait ? "portrait" : "landscape")}
            windowSize={10}
            numColumns={1}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            onLayout={onLayout}
            style={{
                height: "100%",
                width: "100%"
            }}
            ListEmptyComponent={() => {
                return (
                    <View
                        style={{
                            marginTop: (containerHeight / 2) - 60,
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: !portrait && insets.left > 0  && insets.right > 0 ? -(insets.left + insets.right) : 0
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
    navigation: any
}

export const TransfersScreenBody = memo(({ currentTransfers, currentUploads, currentDownloads, finishedTransfers, navigation }: TransfersScreenBodyProps) => {
    const bottomBarHeight = useStore(state => state.bottomBarHeight)
    const contentHeight = useStore(state => state.contentHeight)
    const dimensions: ScaledSize = useWindowDimensions()
    const [topBarHeight, setTopBarHeight] = useState<number>(useStore.getState().topBarHeight)
    const darkMode = useDarkMode()
    const lang = useLang()
    const [currentView, setCurrentView] = useState<"ongoing" | "finished">("ongoing")
    const scrollViewRef = useRef<any>()
    const [portrait, setPortrait] = useState<boolean>(dimensions.height >= dimensions.width)

    useEffect(() => {
        setPortrait(dimensions.height >= dimensions.width)
    }, [dimensions])

    return (
        <View
            style={{
                height: "100%",
                width: "100%",
                backgroundColor: getColor(darkMode, "backgroundPrimary")
            }}
        >
            <View
                style={{
                    width: "100%",
                    height: 78
                }}
                onLayout={(e) => setTopBarHeight(e.nativeEvent.layout.height)}
            >
                <DefaultTopBar
                    onPressBack={() => navigation.goBack()}
                    leftText={i18n(lang, "back")}
                    middleText={i18n(lang, "transfers")}
                    rightComponent={
                        <TouchableOpacity
                            hitSlop={{
                                top: 15,
                                bottom: 15,
                                right: 15,
                                left: 15
                            }}
                            style={{
                                alignItems: "center",
                                justifyContent: "flex-end",
                                flexDirection: "row",
                                backgroundColor: "transparent",
                                height: "100%",
                                paddingLeft: 0,
                                paddingRight: 15,
                                width: "33%",
                                opacity: (Object.keys(currentUploads).length + Object.keys(currentDownloads).length) > 0 ? 1 : 0
                            }}
                            onPress={() => SheetManager.show("TopBarActionSheet")}
                        >
                            <Ionicon
                                name="ellipsis-horizontal-sharp"
                                size={24}
                                color={getColor(darkMode, "textPrimary")}
                            />
                        </TouchableOpacity>
                    }
                />
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
                            borderBottomColor: currentView == "ongoing" ? getColor(darkMode, "linkPrimary") : getColor(darkMode, "primaryBorder"),
                            height: 27,
                            paddingLeft: 15,
                            paddingRight: 15,
                            width: "50%",
                            alignItems: "center"
                        }}
                        hitSlop={{
                            top: 20
                        }}
                        onPress={() => {
                            scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true })

                            setCurrentView("ongoing")
                        }}
                    >
                        <Text
                            style={{
                                color: currentView == "ongoing" ? getColor(darkMode, "linkPrimary") : "gray",
                                fontWeight: "bold",
                                fontSize: 15
                            }}
                        >
                            {i18n(lang, "ongoing")}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            borderBottomWidth: currentView == "finished" ? Platform.OS == "ios" ? 1.5 : 2 : 1,
                            borderBottomColor: currentView == "finished" ? getColor(darkMode, "linkPrimary") : getColor(darkMode, "primaryBorder"),
                            height: 27,
                            paddingLeft: 15,
                            paddingRight: 15,
                            width: "50%",
                            alignItems: "center"
                        }}
                        hitSlop={{
                            top: 20
                        }}
                        onPress={() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true })
                            
                            setCurrentView("finished")
                        }}
                    >
                        <Text
                            style={{
                                color: currentView == "finished" ? getColor(darkMode, "linkPrimary") : "gray",
                                fontWeight: "bold",
                                fontSize: 15
                            }}
                        >
                            {i18n(lang, "finished")}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                style={{
                    width: dimensions.width,
                    height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                }}
                pagingEnabled={true}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                disableIntervalMomentum={true} 
                snapToAlignment="center"
                key={"transfers-list-" + (portrait ? "portrait" : "landscape")}
                onMomentumScrollEnd={(e) => setCurrentView(e.nativeEvent.contentOffset.x == 0 ? "ongoing" : "finished")}
                ref={scrollViewRef}
            >
                <View
                    style={{
                        width: dimensions.width,
                        height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                    }}
                >
                    <OngoingTransfersList
                        currentTransfers={currentTransfers}
                    />
                </View>
                <View
                    style={{
                        width: dimensions.width,
                        height: (contentHeight - topBarHeight - bottomBarHeight + 30)
                    }}
                >
                    <FinishedTransfersList
                        finishedTransfers={finishedTransfers}
                    />
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