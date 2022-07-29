import React, { useState, useEffect, memo } from "react"
import { ActivityIndicator, TouchableOpacity, View, DeviceEventEmitter } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../lib/state"
import { navigationAnimation } from "../lib/state"
// @ts-ignore
import AnimatedProgressWheel from "react-native-progress-wheel"

export interface TransfersIndicatorProps {
    navigation: any
}

export const TransfersIndicator = memo(({ navigation }: TransfersIndicatorProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [visible, setVisible] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)
    const currentRoutes = useStore(state => state.currentRoutes)
    const [currentRouteName, setCurrentRouteName] = useState<string>("")
    const biometricAuthScreenVisible = useStore(state => state.biometricAuthScreenVisible)
    const [currentUploads, setCurrentUploads] = useState<any>({})
    const [currentDownloads, setCurrentDownloads] = useState<any>({})

    const calcSpeed = (now: number, started: number, bytes: number): number => {
        now = new Date().getTime() - 1000

        const secondsDiff: number = ((now - started) / 1000)
        const bps: number = Math.floor((bytes / secondsDiff) * 1)

        return bps > 0 ? bps : 0
    }

    const calcTimeLeft = (loadedBytes: number, totalBytes: number, started: number): number => {
        const elapsed: number = (new Date().getTime() - started)
        const speed: number = (loadedBytes / (elapsed / 1000))
        const remaining: number = ((totalBytes - loadedBytes) / speed)

        return remaining > 0 ? remaining : 0
    }

    useEffect(() => {
        if((Object.keys(currentUploads).length + Object.keys(currentDownloads).length) > 0 && currentRouteName !== "TransfersScreen" && !biometricAuthScreenVisible){
            setVisible(true)
        }
        else{
            setVisible(false)
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
    }, [currentUploads, currentDownloads, currentRouteName, biometricAuthScreenVisible])

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
            else if(data.type == "done" || data.type == "err"){
                setCurrentUploads((prev: any) => Object.keys(prev).filter(key => key !== data.data.uuid).reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {}))
            }
        })

        const downloadListener = DeviceEventEmitter.addListener("download", (data) => {
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
            else if(data.type == "done" || data.type == "err"){
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

        return () => {
            uploadListener.remove()
            downloadListener.remove()
            uploadProgressListener.remove()
            downloadProgressListener.remove()
        }
    }, [])

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