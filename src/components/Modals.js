import React from "react"
import { Pressable, ActivityIndicator } from "react-native"
import { useStore } from "../lib/state"
import Modal from "react-native-modalbox"
import { storage } from "../lib/storage"
import { useMMKVBoolean } from "react-native-mmkv"

export const FullscreenLoadingModal = () => {
    const fullscreenLoadingModalVisible = useStore(state => state.fullscreenLoadingModalVisible)
    const setFullscreenLoadingModalVisible = useStore(state => state.setFullscreenLoadingModalVisible)
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)

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
            console.log("loading pressed -> dismiss and cancel")
        }}>
            <ActivityIndicator size={"small"} color="white" />
        </Pressable>
    )
}