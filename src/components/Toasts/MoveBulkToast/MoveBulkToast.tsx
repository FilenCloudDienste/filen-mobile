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
import { Item } from "src/types"

const MoveBulkToast = memo(({ message, items }: { message?: string | undefined, items: Item[] }) => {
    const darkMode = useDarkMode()
    const [buttonsDisabled, setButtonsDisabled] = useState(false)
    const lang = useLang()
    const initParent = useRef<any>()
    const currentRoutes = useStore(state => state.currentRoutes) as any
    const [currentParent, setCurrentParent] = useState("")
    const [currentRouteURL, setCurrentRouteURL] = useState("")

    const move = useCallback(() => {
        if(buttonsDisabled){
            return
        }

        if(
            currentRouteURL.indexOf("shared-in") !== -1 ||
            currentRouteURL.indexOf("recents") !== -1 ||
            currentRouteURL.indexOf("trash") !== -1 ||
            currentRouteURL.indexOf("photos") !== -1 ||
            currentRouteURL.indexOf("offline") !== -1
        ){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return
        }

        if(items.length == 0){
            hideAllToasts()

            return
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

            return
        }

        if(parent.length <= 32 && items.filter(item => item.type == "file").length >= 1){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return
        }

        if(items.filter(item => item.parent == parent).length > 0){
            showToast({ message: i18n(lang, "moveSameParentFolder") })

            return
        }

        if(items.filter(item => item.uuid == parent).length > 0){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return
        }

        if(getRouteURL().indexOf("shared-in") !== -1){
            showToast({ message: i18n(lang, "cannotMoveItemsHere") })

            return
        }

        setButtonsDisabled(true)

        useStore.setState({ fullscreenLoadingModalVisible: true })

        bulkMove({ items, parent }).then(() => {
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

                //showToast({ message: i18n(lang, "itemsMoved", true, ["__COUNT__"], [items.length]) })
            }, 500)
        }).catch((err) => {
            console.error(err)

            showToast({ message: err.toString() })
        })
    }, [currentRouteURL, buttonsDisabled, lang])

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
                            color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? getColor(darkMode, "linkPrimary") : getColor(darkMode, "textSecondary")
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