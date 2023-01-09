import React, { useState, useEffect, memo, useRef, useCallback } from "react"
import { View, Text, TouchableOpacity, DeviceEventEmitter } from "react-native"
import useLang from "../../../lib/hooks/useLang"
import { useStore } from "../../../lib/state"
import { getParent, getRouteURL } from "../../../lib/helpers"
import { bulkMove } from "../../../lib/api"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style"
import { hideAllToasts, showToast } from "../Toasts"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const MoveBulkToast = memo(({ message }: { message?: string | undefined }) => {
    const darkMode = useDarkMode()
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem) as any
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const lang = useLang()
    const currentBulkItems = useStore(state => state.currentBulkItems) as any
    const initParent = useRef<any>()
    const currentRoutes = useStore(state => state.currentRoutes) as any
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    const move = useCallback(() => {
        if(buttonsDisabled){
            return false
        }

        if(
            currentRouteURL.indexOf("shared-in") !== -1 ||
            currentRouteURL.indexOf("recents") !== -1 ||
            currentRouteURL.indexOf("trash") !== -1 ||
            currentRouteURL.indexOf("photos") !== -1 ||
            currentRouteURL.indexOf("offline") !== -1
        ){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return false
        }

        if(currentBulkItems.length == 0){
            hideAllToasts()

            return false
        }

        const parent = getParent()

        if([
            "recents",
            "shared-in",
            "shared-out",
            "links",
            "favorites",
            "offline",
            "cloud",
            "photos",
            "settings"
        ].includes(parent)){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return false
        }

        if(parent.length <= 32 && currentBulkItems.filter((item: any) => item.type == "file").length >= 1){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return false
        }

        if(typeof currentActionSheetItem !== "object"){
            return false
        }

        if(currentActionSheetItem.parent == parent){
            showToast({ message: i18n(lang, "moveSameParentFolder") })

            return false
        }

        if(getRouteURL().indexOf("shared-in") !== -1){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return false
        }

        setButtonsDisabled(true)

        useStore.setState({ fullscreenLoadingModalVisible: true })

        bulkMove({ items: currentBulkItems, parent }).then(() => {
            DeviceEventEmitter.emit("event", {
                type: "reload-list",
                data: {
                    parent: initParent.current
                }
            })

            DeviceEventEmitter.emit("event", {
                type: "reload-list",
                data: {
                    parent
                }
            })

            setTimeout(() => {
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                hideAllToasts()

                //showToast({ message: i18n(lang, "itemsMoved", true, ["__COUNT__"], [currentBulkItems.length]) })
            }, 500)
        }).catch((err) => {
            console.log(err)

            showToast({ message: err.toString() })
        })
    }, [currentActionSheetItem, currentRouteURL, currentBulkItems, buttonsDisabled])

    useEffect(() => {
        if(Array.isArray(currentRoutes)){
            const parent = getParent(currentRoutes[currentRoutes.length - 1])

            if(typeof parent == "string" && parent.length > 0){
                setCurrentParent(parent)
                setCurrentRouteURL(getRouteURL(currentRoutes[currentRoutes.length - 1]))
            }
        }
    }, [currentRoutes])

    useEffect(() => {
        DeviceEventEmitter.emit("event", {
            type: "unselect-all-items"
        })

        initParent.current = getParent()
    }, [])

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                height: "100%",
                zIndex: 99999
            }}
        >
            <View
                style={{
                    width: "50%"
                }}
            >
                <Text
                    style={{
                        color: getColor(darkMode, "textPrimary"),
                        fontSize: 15,
                        fontWeight: "400"
                    }}
                    numberOfLines={1}
                >
                    {message}
                </Text>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    height: "100%"
                }}
            >
                <TouchableOpacity
                    hitSlop={{
                        right: 20,
                        left: 20,
                        top: 10,
                        bottom: 10
                    }}
                    style={{
                        borderStartColor: "red",
                        height: "100%"
                    }}
                    onPress={() => {
                        if(buttonsDisabled){
                            return false
                        }

                        hideAllToasts()
                    }}
                >
                    <Text
                        style={{
                            color: getColor(darkMode, "textPrimary"),
                            fontSize: 15,
                            fontWeight: "400"
                        }}
                    >
                        {i18n(lang, "cancel")}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    hitSlop={{
                        right: 20,
                        left: 20,
                        top: 10,
                        bottom: 10
                    }}
                    style={{
                        marginLeft: 20
                    }}
                    onPress={move}
                >
                    <Text
                        style={{
                            fontSize: 15,
                            fontWeight: "400",
                            color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
                        }}
                    >
                        {i18n(lang, "move")}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})

export default MoveBulkToast