import React, { memo, useState, useEffect } from "react"
import { Pressable, ActivityIndicator, DeviceEventEmitter } from "react-native"
import { useStore } from "../../../lib/state"

const FullscreenLoadingModal = memo(() => {
    const setFullscreenLoadingModalDismissable = useStore(state => state.setFullscreenLoadingModalDismissable)
    const fullscreenLoadingModalDismissable = useStore(state => state.fullscreenLoadingModalDismissable)
    const fullscreenLoadingModalVisible = useStore(state => state.fullscreenLoadingModalVisible)
    const [open, setOpen] = useState<boolean>(false)

    useEffect(() => {
        setOpen(fullscreenLoadingModalVisible)
    }, [fullscreenLoadingModalVisible])

    useEffect(() => {
        const showFullScreenLoadingModalListener = () => {
            setOpen(true)
        }

        const hideFullScreenLoadingModalListener = () => {
            setOpen(false)
        }

        DeviceEventEmitter.addListener("showFullScreenLoadingModal", showFullScreenLoadingModalListener)
        DeviceEventEmitter.addListener("hideFullScreenLoadingModal", hideFullScreenLoadingModalListener)

        return () => {
            DeviceEventEmitter.removeListener("showFullScreenLoadingModal", showFullScreenLoadingModalListener)
            DeviceEventEmitter.removeListener("hideFullScreenLoadingModal", hideFullScreenLoadingModalListener)
        }
    }, [])

    if(!open){
        return null
    }

    return (
        <Pressable
            style={{
                position: "absolute",
                height: "100%",
                width: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                justifyContent: "center",
                alignItems: "center"
            }}
            onPress={() => {
                if(fullscreenLoadingModalDismissable){
                    setOpen(false)
                    setFullscreenLoadingModalDismissable(false)
                }
            }}
        >
            <ActivityIndicator
                size={"small"}
                color="white"
            />
        </Pressable>
    )
})

export const showFullScreenLoadingModal = () => {
    DeviceEventEmitter.emit("showFullScreenLoadingModal")
}

export const hideFullScreenLoadingModal = () => {
    DeviceEventEmitter.emit("hideFullScreenLoadingModal")
}

export default FullscreenLoadingModal