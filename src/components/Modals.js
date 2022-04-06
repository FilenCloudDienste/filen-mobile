import React, { useCallback, memo } from "react"
import { Pressable, ActivityIndicator } from "react-native"
import { useStore } from "../lib/state"
import Modal from "react-native-modalbox"
import { storage } from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"

export const FullscreenLoadingModal = memo(() => {
    const fullscreenLoadingModalVisible = useStore(useCallback(state => state.fullscreenLoadingModalVisible))
    const setFullscreenLoadingModalVisible = useStore(useCallback(state => state.setFullscreenLoadingModalVisible))
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const setFullscreenLoadingModalDismissable = useStore(useCallback(state => state.setFullscreenLoadingModalDismissable))
    const fullscreenLoadingModalDismissable = useStore(useCallback(state => state.fullscreenLoadingModalDismissable))

    if(!fullscreenLoadingModalVisible){
        return null
    }

    return (
        <Pressable style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center"
        }} onPress={() => {
            if(fullscreenLoadingModalDismissable){
                setFullscreenLoadingModalVisible(false)
                setFullscreenLoadingModalDismissable(false)
            }
        }}>
            <ActivityIndicator size={"small"} color="white" />
        </Pressable>
    )
})