import React, { useState, useEffect, useRef, memo } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { fileAndFolderNameValidation } from "../../../lib/helpers"
import { folderExists, fileExists, renameFile, renameFolder } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Keyboard } from "react-native"
import type { Item } from "../../../types"

const RenameDialog = memo(() => {
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const lang = useLang()
    const [ext, setExt] = useState<string>("")
    const [open, setOpen] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)

    useEffect(() => {
        const openRenameDialogListener = (item: Item) => {
            setCurrentItem(item)

			if(item.type == "folder"){
                setValue(item.name.trim())
            }
            else{
                if(item.name.indexOf(".") !== -1){
                    const nameEx = item.name.split(".")
			        const fileExt = nameEx[nameEx.length - 1]

                    nameEx.pop()

                    setValue(nameEx.join(".").trim())
                    setExt(fileExt.trim())
                }
                else{
                    setValue(item.name.trim())
                }
            }

            setOpen(true)

            setTimeout(() => {
                inputRef?.current?.focus()
            }, 500)
		}

		DeviceEventEmitter.addListener("openRenameDialog", openRenameDialogListener)

		return () => {
			DeviceEventEmitter.removeListener("openRenameDialog", openRenameDialogListener)
		}
    }, [])

    return (
        <Dialog.Container
            visible={open}
            useNativeDriver={false}
            onRequestClose={() => setOpen(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setOpen(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "rename")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "newName")}
                value={value}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setOpen(false)}
            />
            <Dialog.Button
                label={i18n(lang, "rename")}
                disabled={buttonsDisabled}
                onPress={() => {
                    if(typeof currentItem == "undefined"){
                        return false
                    }
                    
                    setButtonsDisabled(true)
                    setOpen(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    let name = value.trim()
                    const item = currentItem

                    if(item.name == name){
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        return showToast({ message: i18n(lang, "invalidFolderName") })
                    }

                    if(item.type == "file"){
                        name = name + "." + ext
                    }

                    if(item.type == "folder"){
                        if(!fileAndFolderNameValidation(name)){
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })
        
                            return showToast({ message: i18n(lang, "invalidFolderName") })
                        }

                        folderExists({ name, parent: item.parent }).then((res) => {
                            if(res.exists){
                                if(item.uuid !== res.existsUUID){
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })
        
                                    return showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })
                                }
                            }

                            renameFolder({ folder: item, name }).then(async () => {
                                DeviceEventEmitter.emit("event", {
                                    type: "change-item-name",
                                    data: {
                                        uuid: item.uuid,
                                        name
                                    }
                                })

                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                //showToast({ message: i18n(lang, "folderRenamed") })
                            }).catch((err) => {
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                showToast({ message: err.toString() })
                            })
                        }).catch((err) => {
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            showToast({ message: err.toString() })
                        })
                    }
                    else{
                        if(!fileAndFolderNameValidation(name)){
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })
        
                            return showToast({ message: i18n(lang, "invalidFileName") })
                        }

                        fileExists({ name, parent: item.parent }).then((res) => {
                            if(res.exists){
                                if(item.uuid !== res.existsUUID){
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })
        
                                    return showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })
                                }
                            }

                            renameFile({ file: item, name }).then(async () => {
                                DeviceEventEmitter.emit("event", {
                                    type: "change-item-name",
                                    data: {
                                        uuid: item.uuid,
                                        name
                                    }
                                })

                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                //showToast({ message: i18n(lang, "fileRenamed") })
                            }).catch((err) => {
                                setButtonsDisabled(false)

                                useStore.setState({ fullscreenLoadingModalVisible: false })

                                showToast({ message: err.toString() })
                            })
                        }).catch((err) => {
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            showToast({ message: err.toString() })
                        })
                    }
                }}
            />
        </Dialog.Container>
    )
})

export default RenameDialog