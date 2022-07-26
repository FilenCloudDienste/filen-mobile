import React, { useState, useEffect, useCallback, memo } from "react"
import { ActivityIndicator, TouchableOpacity, View } from "react-native"
import storage from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../lib/state"
import { navigationAnimation } from "../lib/state"
import AnimatedProgressWheel from "react-native-progress-wheel"
import memoryCache from "../lib/memoryCache"

const isEqual = require("react-fast-compare")

export const TransfersIndicator = memo(({ navigation }) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const uploadsCount = useStore(useCallback(state => Object.keys(state.uploads).length))
    const downloadsCount = useStore(useCallback(state => Object.keys(state.downloads).length))
    const [visible, setVisible] = useState(false)
    const uploads = useStore(useCallback(state => state.uploads), (current, next) => !isEqual(current, next))
    const downloads = useStore(useCallback(state => state.downloads), (current, next) => !isEqual(current, next))
    const [progress, setProgress] = useState(0)
    const currentRoutes = useStore(useCallback(state => state.currentRoutes))
    const [currentRouteName, setCurrentRouteName] = useState("")
    const biometricAuthScreenVisible = useStore(useCallback(state => state.biometricAuthScreenVisible))

    useEffect(() => {
        if((uploadsCount + downloadsCount) > 0 && currentRouteName !== "TransfersScreen" && !biometricAuthScreenVisible){
            setVisible(true)
        }
        else{
            setVisible(false)
        }
    }, [uploadsCount, downloadsCount, currentRouteName, biometricAuthScreenVisible])

    useEffect(() => {
        if(typeof currentRoutes !== "undefined"){
			if(typeof currentRoutes[currentRoutes.length - 1] !== "undefined"){
                setCurrentRouteName(currentRoutes[currentRoutes.length - 1].name)
			}
		}
    }, [currentRoutes])

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

            for(let prop in transfers){
                const transferDone = transfers[prop].chunksDone >= transfers[prop].file.chunks ? 1 : 0

                if(!transferDone){
                    chunks = chunks + transfers[prop].file.chunks
                    chunksDone = chunksDone + transfers[prop].chunksDone
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

    useEffect(() => {
        if((uploadsCount + downloadsCount) <= 0){
            const transfers = memoryCache.get("transfers") || {}
            
            for(let prop in transfers){
                transfers[prop].chunksDone = transfers[prop].file.chunks
            }

            memoryCache.set("transfers", transfers)
        }
    }, [uploadsCount, downloadsCount])

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
            if(currentRouteName == "TransfersScreen"){
                return false
            }

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
                {/*color={progress > 0 ? "#0A84FF" : darkMode ? "#171717" : "lightgray"}
                    progress={progress}
                    backgroundColor={darkMode ? "#171717" : "lightgray"}
                    containerColor={darkMode ? "#171717" : "lightgray"}*/}
                <AnimatedProgressWheel
                    size={50} 
                    width={4}
                    color="transparent"
                    progress={progress}
                    backgroundColor="transparent"
                    containerColor="transparent"
                />
                <ActivityIndicator size={"small"} color={darkMode ? "white" : "black"} style={{
                    position: "absolute",
                    marginLeft: 15
                }} />
            </View>
        </TouchableOpacity>
    )
})