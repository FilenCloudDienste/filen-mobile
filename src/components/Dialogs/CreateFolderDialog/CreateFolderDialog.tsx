import React, { useState, useEffect, useRef, memo, useCallback } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { fileAndFolderNameValidation, getParent } from "../../../lib/helpers"
import { folderExists, createFolder } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter, Keyboard } from "react-native"

const CreateFolderDialog = memo(() => {
    const [value, setValue] = useState<string>("Untitled folder")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const lang = useLang()
    const [open, setOpen] = useState<boolean>(false)

    const create = useCallback(() => {
        if(buttonsDisabled){
            return
        }

        setButtonsDisabled(true)
        setOpen(false)

        Keyboard.dismiss()

        useStore.setState({ fullscreenLoadingModalVisible: true })

        const parent = getParent()
        const name = value.trim()

        if(!fileAndFolderNameValidation(name)){
            setButtonsDisabled(false)

            useStore.setState({ fullscreenLoadingModalVisible: false })

            showToast({ message: i18n(lang, "invalidFolderName") })

            return
        }

        folderExists({
            name,
            parent
        }).then((res) => {
            if(res.exists){
                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })

                return
            }

            createFolder({
                name,
                parent
            }).then(() => {
                DeviceEventEmitter.emit("event", {
                    type: "reload-list",
                    data: {
                        parent
                    }
                })

                setButtonsDisabled(false)

                useStore.setState({ fullscreenLoadingModalVisible: false })

                //showToast({ message: i18n(lang, "folderCreated", true, ["__NAME__"], [name]) })
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
    }, [lang, buttonsDisabled, value])

    useEffect(() => {
        const openCreateFolderDialogListener = () => {
			setButtonsDisabled(false)
            setValue("Untitled folder")
            setOpen(true)

            setTimeout(() => {
                inputRef?.current?.focus()
            }, 500)
		}

		DeviceEventEmitter.addListener("openCreateFolderDialog", openCreateFolderDialogListener)

		return () => {
			DeviceEventEmitter.removeListener("openCreateFolderDialog", openCreateFolderDialogListener)
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
            <Dialog.Title>{i18n(lang, "newFolder")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "folderName")}
                value={value}
                selection={undefined}
                autoFocus={true}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setOpen(false)}
            />
            <Dialog.Button
                label={i18n(lang, "create")}
                disabled={buttonsDisabled}
                onPress={create}
            />
        </Dialog.Container>
    )
})

export default CreateFolderDialog