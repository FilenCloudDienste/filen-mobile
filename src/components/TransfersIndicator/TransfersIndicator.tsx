import React, { useState, useEffect, memo, useCallback } from "react"
import { ActivityIndicator, TouchableOpacity, View, DeviceEventEmitter } from "react-native"
import storage from "../../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../../lib/state"
import { navigationAnimation } from "../../lib/state"
import { calcSpeed, calcTimeLeft } from "../../lib/helpers"
// @ts-ignore
import AnimatedProgressWheel from "react-native-progress-wheel"
import { throttle } from "lodash"
import memoryCache from "../../lib/memoryCache"

export interface TransfersIndicatorProps {
    navigation: any
}

export interface IndicatorProps {
    darkMode: boolean,
    visible: boolean,
    navigation: any,
    progress: number,
    currentRouteName: string
}

export const Indicator = memo(({ darkMode, visible, navigation, progress, currentRouteName }: IndicatorProps) => {
    return (
        <TouchableOpacity
            style={{
                width: 50,
                height: 50,
                borderRadius: 50,
                backgroundColor: darkMode ? "#171717" : "lightgray",
                position: "absolute",
                bottom: 60,
                right: 10,
                zIndex: 999999,
                display: visible ? "flex" : "none"
            }}
            onPress={() => {
                if(currentRouteName == "TransfersScreen"){
                    return false
                }

                navigationAnimation({ enable: true }).then(() => {
                    navigation?.current?.dispatch(StackActions.push("TransfersScreen"))
                })
            }}
        >
            <View
                style={{
                    justifyContent: "center",
                    alignContent: "center",
                    transform: [
                        {
                            rotate: "270deg"
                        }
                    ]
                }}
            >
                <AnimatedProgressWheel
                    size={50} 
                    width={4}
                    color={isNaN(progress) ? 0 : progress > 0 ? "#0A84FF" : darkMode ? "#171717" : "lightgray"}
                    progress={progress}
                    backgroundColor={darkMode ? "#171717" : "lightgray"}
                    containerColor={darkMode ? "#171717" : "lightgray"}
                />
                <ActivityIndicator
                    size="small"
                    color={darkMode ? "white" : "black"}
                    style={{
                        position: "absolute",
                        marginLeft: 15
                    }}
                />
            </View>
        </TouchableOpacity>
    )
})

export const TransfersIndicator = memo(({ navigation }: TransfersIndicatorProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [visible, setVisible] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const currentRoutes = useStore(state => state.currentRoutes)
    const [currentRouteName, setCurrentRouteName] = useState<string>("")
    const biometricAuthScreenVisible = useStore(state => state.biometricAuthScreenVisible)
    const [currentUploads, setCurrentUploads] = useState<any>({})
    const [currentDownloads, setCurrentDownloads] = useState<any>({})
    const setCurrentUploadsGlobal = useStore(state => state.setCurrentUploads)
    const setCurrentDownloadsGlobal = useStore(state => state.setCurrentDownloads)
    const setFinishedTransfersGlobal = useStore(state => state.setFinishedTransfers)
    const [finishedTransfers, setFinishedTransfers] = useState<any>([])

    const throttledUpdate = useCallback(throttle((currentUploads, currentDownloads, visible, finishedTransfers) => {
        setCurrentUploadsGlobal(currentUploads)
        setCurrentDownloadsGlobal(currentDownloads)
        setFinishedTransfersGlobal(finishedTransfers)

        if(!visible){
            setProgress(0)

            return
        }

        if((Object.keys(currentUploads).length + Object.keys(currentDownloads).length) > 0){
            let total = 0
            let bytes = 0

            for(const prop in currentUploads){
                bytes += currentUploads[prop].bytes
                total += currentUploads[prop].size
            }

            for(const prop in currentDownloads){
                bytes += currentDownloads[prop].bytes
                total += currentDownloads[prop].size
            }

            setProgress((bytes / total) * 100)
        }
        else{
            setProgress(0)
        }
    }, 250), [])

    useEffect(() => {
        if((Object.keys(currentUploads).length + Object.keys(currentDownloads).length) > 0 && currentRouteName !== "TransfersScreen" && !biometricAuthScreenVisible){
            setVisible(true)
        }
        else{
            setVisible(false)
        }

        throttledUpdate(currentUploads, currentDownloads, visible, finishedTransfers)
    }, [currentUploads, currentDownloads, currentRouteName, biometricAuthScreenVisible, visible, finishedTransfers])

    useEffect(() => {
        if(typeof currentRoutes !== "undefined"){
			if(typeof currentRoutes[currentRoutes.length - 1] !== "undefined"){
                setCurrentRouteName(currentRoutes[currentRoutes.length - 1].name)
			}
		}
    }, [currentRoutes])

    useEffect(() => {
        const uploadListener = DeviceEventEmitter.addListener("upload", (data) => {
            const now: number = new Date().getTime()

            if(data.type == "start"){
                setCurrentUploads((prev: any) => ({
                    ...prev,
                    [data.data.uuid]: {
                        ...data.data,
                        started: now,
                        bytes: 0,
                        percent: 0,
                        lastTime: now,
                        lastBps: 0,
                        timeLeft: 0,
                        timestamp: now
                    }
                }))
            }
            else if(data.type == "started"){
                setCurrentUploads((prev: any) => ({
                    ...prev,
                    [data.data.uuid]: {
                        ...prev[data.data.uuid],
                        started: now,
                        lastTime: now,
                        timestamp: now
                    }
                }))
            }
            else if(data.type == "done"){
                setCurrentUploads((prev: any) => Object.keys(prev).filter(key => key !== data.data.uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
                setFinishedTransfers((prev: any) => [...[{
                    ...data.data,
                    transferType: "upload"
                }], ...prev])
            }
            else if(data.type == "err"){
                setCurrentUploads((prev: any) => Object.keys(prev).filter(key => key !== data.data.uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
            }
        })

        const downloadListener = DeviceEventEmitter.addListener("download", (data) => {
            if(memoryCache.has("showDownloadProgress:" + data.data.uuid)){
                if(!memoryCache.get("showDownloadProgress:" + data.data.uuid)){
                    return
                }
            }

            const now: number = new Date().getTime()

            if(data.type == "start"){
                setCurrentDownloads((prev: any) => ({
                    ...prev,
                    [data.data.uuid]: {
                        ...data.data,
                        started: now,
                        bytes: 0,
                        percent: 0,
                        lastTime: now,
                        lastBps: 0,
                        timeLeft: 0,
                        timestamp: now
                    }
                }))
            }
            else if(data.type == "started"){
                setCurrentDownloads((prev: any) => ({
                    ...prev,
                    [data.data.uuid]: {
                        ...prev[data.data.uuid],
                        started: now,
                        lastTime: now,
                        timestamp: now
                    }
                }))
            }
            else if(data.type == "done"){
                setCurrentDownloads((prev: any) => Object.keys(prev).filter(key => key !== data.data.uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
                setFinishedTransfers((prev: any) => [...[{
                    ...data.data,
                    transferType: "download"
                }], ...prev])
            }
            else if(data.type == "err"){
                setCurrentDownloads((prev: any) => Object.keys(prev).filter(key => key !== data.data.uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
            }
        })

        const uploadProgressListener = DeviceEventEmitter.addListener("uploadProgress", (data) => {
            const now: number = new Date().getTime()

            setCurrentUploads((prev: any) => Object.keys(prev).filter(key => key == data.data.uuid).length > 0 ? ({
                ...prev,
                [data.data.uuid]: {
                    ...prev[data.data.uuid],
                    percent: ((prev[data.data.uuid].bytes + data.data.bytes) / Math.floor((prev[data.data.uuid].size || 0) * 1)) * 100,
                    lastBps: calcSpeed(now, prev[data.data.uuid].started, (prev[data.data.uuid].bytes + data.data.bytes)),
                    lastTime: now,
                    bytes: prev[data.data.uuid].bytes + data.data.bytes,
                    timeLeft: calcTimeLeft((prev[data.data.uuid].bytes + data.data.bytes), Math.floor((prev[data.data.uuid].size || 0) * 1), prev[data.data.uuid].started)
                }
            }) : prev)
        })

        const downloadProgressListener = DeviceEventEmitter.addListener("downloadProgress", (data) => {
            if(memoryCache.has("showDownloadProgress:" + data.data.uuid)){
                if(!memoryCache.get("showDownloadProgress:" + data.data.uuid)){
                    return
                }
            }
            
            const now: number = new Date().getTime()

            setCurrentDownloads((prev: any) => Object.keys(prev).filter(key => key == data.data.uuid).length > 0 ? ({
                ...prev,
                [data.data.uuid]: {
                    ...prev[data.data.uuid],
                    percent: ((prev[data.data.uuid].bytes + data.data.bytes) / Math.floor((prev[data.data.uuid].size || 0) * 1)) * 100,
                    lastBps: calcSpeed(now, prev[data.data.uuid].started, (prev[data.data.uuid].bytes + data.data.bytes)),
                    lastTime: now,
                    bytes: prev[data.data.uuid].bytes + data.data.bytes,
                    timeLeft: calcTimeLeft((prev[data.data.uuid].bytes + data.data.bytes), Math.floor((prev[data.data.uuid].size || 0) * 1), prev[data.data.uuid].started)
                }
            }) : prev)
        })

        const stopTransferListener = DeviceEventEmitter.addListener("stopTransfer", (uuid) => {
            setCurrentUploads((prev: any) => Object.keys(prev).filter(key => key !== uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
            setCurrentDownloads((prev: any) => Object.keys(prev).filter(key => key !== uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
        })

        return () => {
            uploadListener.remove()
            downloadListener.remove()
            uploadProgressListener.remove()
            downloadProgressListener.remove()
            stopTransferListener.remove()
        }
    }, [])

    return (
        <Indicator
            darkMode={darkMode}
            visible={visible}
            navigation={navigation}
            progress={progress}
            currentRouteName={currentRouteName}
        />
    )
})