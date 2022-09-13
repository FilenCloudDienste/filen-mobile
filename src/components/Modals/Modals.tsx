import React, { memo } from "react"
import { Pressable, ActivityIndicator } from "react-native"
import { useStore } from "../../lib/state"

export const FullscreenLoadingModal = memo(() => {
    const fullscreenLoadingModalVisible = useStore(state => state.fullscreenLoadingModalVisible)
    const setFullscreenLoadingModalVisible = useStore(state => state.setFullscreenLoadingModalVisible)
    const setFullscreenLoadingModalDismissable = useStore(state => state.setFullscreenLoadingModalDismissable)
    const fullscreenLoadingModalDismissable = useStore(state => state.fullscreenLoadingModalDismissable)

    if(!fullscreenLoadingModalVisible){
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
                    setFullscreenLoadingModalVisible(false)
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