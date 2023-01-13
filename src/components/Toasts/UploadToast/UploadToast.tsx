import React, { useState, useEffect, memo, useCallback } from "react"
import { View, Text, Platform, TouchableOpacity } from "react-native"
import useLang from "../../../lib/hooks/useLang"
import { useStore } from "../../../lib/state"
import { getParent, getFilenameFromPath, getRouteURL, promiseAllSettled, randomIdUnsafe } from "../../../lib/helpers"
import { i18n } from "../../../i18n"
import { getDownloadPath } from "../../../lib/services/download/download"
import { queueFileUpload } from "../../../lib/services/upload/upload"
import mime from "mime-types"
import { hasStoragePermissions } from "../../../lib/permissions"
import * as Filesystem from "expo-file-system"
import { getColor } from "../../../style"
import { hideAllToasts, showToast } from "../Toasts"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const UploadToast = memo(() => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const currentShareItems = useStore(state => state.currentShareItems) as any
    const setCurrentShareItems = useStore(state => state.setCurrentShareItems)
    const [items, setItems] = useState([])
    const currentRoutes = useStore(state => state.currentRoutes) as any
    const [currentParent, setCurrentParent] = useState(getParent())
    const [currentRouteURL, setCurrentRouteURL] = useState(getRouteURL())

    const upload = useCallback(async () => {
        if(
            currentRouteURL.indexOf("shared-in") !== -1 ||
            currentRouteURL.indexOf("recents") !== -1 ||
            currentRouteURL.indexOf("trash") !== -1 ||
            currentRouteURL.indexOf("photos") !== -1 ||
            currentRouteURL.indexOf("offline") !== -1
        ){
            return
        }

        if(!Array.isArray(items)){
            return
        }
        
        const parent = getParent()

        if(parent.length < 16){
            return
        }

        try{
            await hasStoragePermissions()
        }
        catch(e: any){
            console.error(e)

            showToast({ message: e.toString() })
            
            return
        }

        const copyFile = (item: string): Promise<{ path: string, ext: string, type: string, size: number, name: string }> => {
            return new Promise((resolve, reject) => {
                getDownloadPath({ type: "temp" }).then((path) => {
                    path = path + randomIdUnsafe()
                    
                    if(Platform.OS == "ios"){
                        item = decodeURIComponent(item)
                        path = decodeURIComponent(path)
                    }

                    Filesystem.getInfoAsync(item).then((stat) => {
                        if(stat.isDirectory){
                            return reject(i18n(lang, "cannotShareDirIntoApp"))
                        }

                        Filesystem.copyAsync({
                            from: item,
                            to: path
                        }).then(() => {
                            const name = getFilenameFromPath(item)
                            const type = mime.lookup(name) || ""
                            const ext = mime.extension(type as string) || ""
                            const size = stat.size as number
                            
                            return resolve({ path, ext, type, size, name })
                        }).catch(reject)
                    })
                }).catch(reject)
            })
        }

        const limit = 100

        if(items.length >= limit){
            showToast({ message: i18n(lang, "shareIntoAppLimit", true, ["__LIMIT__"], [limit]) })

            return
        }

        const uploads = []

        for(let i = 0; i < items.length; i++){
            uploads.push(new Promise((resolve, reject) => {
                copyFile(items[i]).then(({ path, type, size, name }) => {
                    queueFileUpload({
                        file: {
                            path: path.replace("file://", ""),
                            name,
                            size,
                            mime: type,
                            lastModified: new Date().getTime()
                        },
                        parent
                    }).then(resolve).catch(reject)
                }).catch(reject)
            }))
        }

        setCurrentShareItems(undefined)
        hideAllToasts()

        promiseAllSettled(uploads).then((values) => {
            values.forEach((value) => {
                if(value.status == "rejected"){
                    // @ts-ignore
                    console.log(value.reason)

                    // @ts-ignore
                    showToast({ message: value.reason.toString() })
                }
            })
        }).catch(console.error)
    }, [currentRouteURL, items, currentShareItems, lang])

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
        setItems([])

        if(typeof currentShareItems !== "undefined"){
            if(typeof currentShareItems.data !== "undefined"){
                if(currentShareItems !== null){
                    const arr: any = []

                    if(Platform.OS == "android"){
                        if(Array.isArray(currentShareItems.data)){
                            for(let i = 0; i < currentShareItems.data.length; i++){
                                arr.push(currentShareItems.data[i])
                            }
                        }
                        else{
                            arr.push(currentShareItems.data)
                        }
        
                        setItems(arr)
                    }
                    else{
                        for(let i = 0; i < currentShareItems.data.length; i++){
                            arr.push(currentShareItems.data[i].data)
                        }
        
                        setItems(arr)
                    }
                }
            }
        }
    }, [currentShareItems])

    if(items.length == 0){
        return null
    }

    return (
        <>
            {
                items.length > 0 && (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            width: "100%",
                            height: "100%",
                            zIndex: 99999
                        }}
                    >
                        <View>
                            <Text
                                style={{
                                    color: getColor(darkMode, "textPrimary"),
                                    fontSize: 15,
                                    fontWeight: "400"
                                }}
                            >
                                {i18n(lang, "cameraUploadChooseFolder")}
                            </Text>
                        </View>
                        <View
                            style={{
                                flexDirection: "row"
                            }}
                        >
                            <TouchableOpacity
                                hitSlop={{
                                    right: 20,
                                    left: 20,
                                    top: 10,
                                    bottom: 10
                                }}
                                onPress={() => {
                                    hideAllToasts()
                                    setCurrentShareItems(undefined)
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
                                onPress={upload}
                            >
                                <Text
                                    style={{
                                        fontSize: 15,
                                        fontWeight: "400",
                                        color: (currentRouteURL.indexOf("shared-in") == -1 && currentRouteURL.indexOf("recents") == -1 && currentRouteURL.indexOf("trash") == -1 && currentRouteURL.indexOf("photos") == -1 && currentRouteURL.indexOf("offline") == -1 && currentParent.length > 32) ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")
                                    }}
                                >
                                    {i18n(lang, "upload")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }
        </>
    )
})

export default UploadToast