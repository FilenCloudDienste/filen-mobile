import React, { useState, useEffect, useRef, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { fileAndFolderNameValidation } from "../../../lib/helpers"
import { folderExists, fileExists, renameFile, renameFolder } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Keyboard } from "react-native"
import { Item } from "../../../types"

const RenameDialog = memo(() => {
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const lang = useLang()
    const [ext, setExt] = useState<string>("")
    const [open, setOpen] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)

    const rename = useCallback(() => {
        if(typeof currentItem == "undefined" || buttonsDisabled){
            return
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

            showToast({ message: i18n(lang, "invalidFolderName") })

            return
        }

        if(item.type == "file" && ext.length > 0){
            name = name + "." + ext
        }

        if(item.type == "folder"){
            if(!fileAndFolderNameValidation(name)){
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: i18n(lang, "invalidFolderName") })

                return
            }

            if(name.length <= 0 || name.length >= 255){
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: i18n(lang, "invalidFolderName") })

                return
            }

            folderExists({ name, parent: item.parent }).then((res) => {
                if(res.exists){
                    if(item.uuid !== res.existsUUID){
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })

                        return
                    }
                }

                renameFolder({ folder: item, name }).then(() => {
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
                    console.error(err)

                    setButtonsDisabled(false)

                    useStore.setState({ fullscreenLoadingModalVisible: false })

                    showToast({ message: err.toString() })
                })
            }).catch((err) => {
                console.error(err)

                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: err.toString() })
            })
        }
        else{
            if(!fileAndFolderNameValidation(name)){
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: i18n(lang, "invalidFileName") })

                return
            }

            if(name.length <= 0 || name.length >= 255){
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: i18n(lang, "invalidFileName") })

                return
            }

            fileExists({ name, parent: item.parent }).then((res) => {
                if(res.exists){
                    if(item.uuid !== res.existsUUID){
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })

                        return
                    }
                }

                renameFile({ file: item, name }).then(() => {
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
                    console.error(err)

                    setButtonsDisabled(false)

                    useStore.setState({ fullscreenLoadingModalVisible: false })

                    showToast({ message: err.toString() })
                })
            }).catch((err) => {
                console.error(err)
                
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: err.toString() })
            })
        }
    }, [currentItem, lang, buttonsDisabled, value, ext])

    useEffect(() => {
		const openRenameDialogListener = DeviceEventEmitter.addListener("openRenameDialog", (item: Item) => {
            setCurrentItem(item)

			if(item.type == "folder"){
                setValue(item.name.trim())
                setExt("")
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
                    setExt("")
                }
            }

            setOpen(true)

            setTimeout(() => {
                inputRef?.current?.focus()
            }, 500)
		})

		return () => {
			openRenameDialogListener.remove()
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
                onPress={rename}
            />
        </Dialog.Container>
    )
})

export default RenameDialog