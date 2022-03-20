import React, { useState, useEffect, useCallback, memo } from "react"
import { ActivityIndicator, TouchableOpacity, View } from "react-native"
import { storage } from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../lib/state"
import { navigationAnimation } from "../lib/state"
import AnimatedProgressWheel from "react-native-progress-wheel"
import { memoryCache } from "../lib/memoryCache"

const isEqual = require("react-fast-compare")

export const TransfersIndicator = memo(({ navigation }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const uploadsCount = useStore(useCallback(state => Object.keys(state.uploads).length))
    const downloadsCount = useStore(useCallback(state => Object.keys(state.downloads).length))
    const [visible, setVisible] = useState(false)
    const uploads = useStore(useCallback(state => state.uploads), (current, next) => !isEqual(current, next))
    const downloads = useStore(useCallback(state => state.downloads), (current, next) => !isEqual(current, next))
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if((uploadsCount + downloadsCount) > 0){
            setVisible(true)
        }
        else{
            setVisible(false)
        }
    }, [uploadsCount, downloadsCount])

    useEffect(() => {
        if((uploadsCount + downloadsCount) > 0){
            const transfers = memoryCache.get("transfers") || {}
            
            let chunks = 0
            let chunksDone = 0

            for(let prop in uploads){
                if(typeof transfers['upload:' + uploads[prop].id] == "undefined"){
                    transfers['upload:' + uploads[prop].id] = uploads[prop]
                }
            }

            for(let prop in downloads){
                if(typeof transfers['download:' + downloads[prop].id] == "undefined"){
                    transfers['download:' + downloads[prop].id] = downloads[prop]
                }
            }

            memoryCache.set("transfers", transfers)

            let prevTransfersDoneCount = 0

            for(let prop in transfers){
                if(transfers[prop].chunksDone >= transfers[prop].file.chunks){
                    prevTransfersDoneCount += 1
                }
            }

            for(let prop in transfers){
                if(prevTransfersDoneCount >= Object.keys(transfers).length){
                    chunks = chunks + transfers[prop].file.chunks
                    chunksDone = chunksDone + transfers[prop].chunksDone
                }
                else{
                    if(transfers[prop].chunksDone < transfers[prop].file.chunks){
                        chunks = chunks + transfers[prop].file.chunks
                        chunksDone = chunksDone + transfers[prop].chunksDone
                    }
                }
            }

            let prog = Math.round((chunksDone / chunks) * 100)

            if(isNaN(prog)){
                prog = 0
            }

            if(prog >= 100){
                prog = 100
            }

            setProgress(prog)
        }
        else{
            setProgress(0)
        }
    }, [JSON.stringify(uploads), JSON.stringify(downloads), uploadsCount, downloadsCount])

    return (
        <TouchableOpacity style={{
            width: 50,
            height: 50,
            borderRadius: 50,
            backgroundColor: darkMode ? "#171717" : "lightgray",
            position: "absolute",
            bottom: 60,
            right: 10,
            zIndex: 999999,
            display: visible ? "flex" : "none"
        }} onPress={() => {
            navigationAnimation({ enable: true }).then(() => {
                navigation.current.dispatch(StackActions.push("TransfersScreen"))
            })
        }}>
            <View style={{
                justifyContent: "center",
                alignContent: "center",
                transform: [
                    {
                        rotate: "270deg"
                    }
                ]
            }}>
                <AnimatedProgressWheel
                    size={50} 
                    width={4}
                    color={progress > 0 ? "#0A84FF" : darkMode ? "#171717" : "lightgray"}
                    progress={progress}
                    backgroundColor={darkMode ? "#171717" : "lightgray"}
                    containerColor={darkMode ? "#171717" : "lightgray"}
                />
                <ActivityIndicator size={"small"} color={darkMode ? "white" : "black"} style={{
                    position: "absolute",
                    marginLeft: 15
                }} />
            </View>
        </TouchableOpacity>
    )
})