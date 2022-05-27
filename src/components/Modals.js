import React, { useCallback, memo, useEffect, useState, useRef } from "react"
import { Pressable, ActivityIndicator, Text, View, TouchableOpacity, Platform, FlatList, ImageBackground, SafeAreaView, Modal as RNModal } from "react-native"
import { useStore } from "../lib/state"
import ModalBox from "react-native-modalbox"
import { storage } from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import Image from "react-native-fast-image"
import Ionicon from "react-native-vector-icons/Ionicons"
import { getColor } from "../lib/style/colors"
import ReactNativeZoomableView from "@dudigital/react-native-zoomable-view/src/ReactNativeZoomableView"
import RNFS from "react-native-fs"
import { downloadWholeFileFSStream } from "../lib/download"
import { SheetManager } from "react-native-actions-sheet"

const THUMBNAIL_BASE_PATH = RNFS.DocumentDirectoryPath + (RNFS.DocumentDirectoryPath.slice(-1) == "/" ? "" : "/") + "thumbnailCache/"
const currentImagePreviewDownloads = {}

export const FullscreenLoadingModal = memo(() => {
    const fullscreenLoadingModalVisible = useStore(useCallback(state => state.fullscreenLoadingModalVisible))
    const setFullscreenLoadingModalVisible = useStore(useCallback(state => state.setFullscreenLoadingModalVisible))
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