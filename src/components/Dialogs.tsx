import React, { useState, useEffect, useRef, memo } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../lib/state"
import storage from "../lib/storage"
import { useMMKVBoolean, useMMKVString } from "react-native-mmkv"
import { getParent, fileAndFolderNameValidation } from "../lib/helpers"
import { createFolder, folderExists, fileExists, renameFile, renameFolder, deleteItemPermanently, removeSharedInItem, stopSharingItem, redeemCode, deleteAccount, disable2FA, bulkShare } from "../lib/api"
import { showToast } from "./Toasts"
import { i18n } from "../i18n/i18n"
import { DeviceEventEmitter, Keyboard } from "react-native"
import { logout } from "../lib/auth/logout"
import { navigationAnimation } from "../lib/state"
import { StackActions, CommonActions } from "@react-navigation/native"

export const RenameDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const renameDialogVisible = useStore(state => state.renameDialogVisible)
    const setRenameDialogVisible = useStore(state => state.setRenameDialogVisible)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
    const [lang, setLang] = useMMKVString("lang", storage)
    const [ext, setExt] = useState<string>("")

    useEffect(() => {
        setButtonsDisabled(false)

        if(typeof currentActionSheetItem !== "undefined"){
            if(currentActionSheetItem.type == "folder"){
                setValue(currentActionSheetItem.name.trim())
            }
            else{
                if(currentActionSheetItem.name.indexOf(".") !== -1){
                    const nameEx = currentActionSheetItem.name.split(".")
			        const fileExt = nameEx[nameEx.length - 1]

                    nameEx.pop()

                    setValue(nameEx.join(".").trim())
                    setExt(fileExt.trim())
                }
                else{
                    setValue(currentActionSheetItem.name.trim())
                }
            }
        }

        if(renameDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [renameDialogVisible])

    return (
        <Dialog.Container
            visible={renameDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setRenameDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setRenameDialogVisible(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "rename")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "newName")}
                value={value}
                selection={undefined}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setRenameDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "rename")}
                disabled={buttonsDisabled}
                onPress={() => {
                    if(typeof currentActionSheetItem !== "object"){
                        return false
                    }
                    
                    setButtonsDisabled(true)
                    setRenameDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    let name = value.trim()
                    const item = currentActionSheetItem

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

export const CreateFolderDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const createFolderDialogVisible = useStore(state => state.createFolderDialogVisible)
    const setCreateFolderDialogVisible = useStore(state => state.setCreateFolderDialogVisible)
    const [value, setValue] = useState<string>("Untitled folder")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)

    useEffect(() => {
        setButtonsDisabled(false)

        if(!createFolderDialogVisible){
            setTimeout(() => {
                setValue("Untitled folder")
            }, 250)
        }

        if(createFolderDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [createFolderDialogVisible])

    return (
        <Dialog.Container
            visible={createFolderDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setCreateFolderDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setCreateFolderDialogVisible(false)
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
                onPress={() => setCreateFolderDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "create")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setCreateFolderDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    const parent = getParent()
                    const name = value.trim()

                    if(!fileAndFolderNameValidation(name)){
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        return showToast({ message: i18n(lang, "invalidFolderName") })
                    }

                    folderExists({
                        name,
                        parent
                    }).then((res) => {
                        if(res.exists){
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            return showToast({ message: i18n(lang, "alreadyExistsInThisFolder", true, ["__NAME__"], [name]) })
                        }

                        createFolder({
                            name,
                            parent
                        }).then(async () => {
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
                            setButtonsDisabled(false)

                            useStore.setState({ fullscreenLoadingModalVisible: false })

                            showToast({ message: err.toString() })
                        })
                    }).catch((err) => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: err.toString() })
                    })
                }}
            />
        </Dialog.Container>
    )
})

export const ConfirmPermanentDeleteDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const confirmPermanentDeleteDialogVisible = useStore(state => state.confirmPermanentDeleteDialogVisible)
    const setConfirmPermanentDeleteDialogVisible = useStore(state => state.setConfirmPermanentDeleteDialogVisible)
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)

    useEffect(() => {
        setButtonsDisabled(false)
    }, [confirmPermanentDeleteDialogVisible])

    return (
        <>
            {
                typeof currentActionSheetItem !== "undefined" && (
                    <Dialog.Container
                        visible={confirmPermanentDeleteDialogVisible}
                        useNativeDriver={false}
                        onRequestClose={() => setConfirmPermanentDeleteDialogVisible(false)}
                        onBackdropPress={() => setConfirmPermanentDeleteDialogVisible(false)}
                    >
                        <Dialog.Title>{i18n(lang, "itemDeletedPermanentlyConfirmation", true, ["__NAME__"], [currentActionSheetItem.name])}</Dialog.Title>
                        <Dialog.Button
                            label={i18n(lang, "cancel")}
                            disabled={buttonsDisabled}
                            onPress={() => setConfirmPermanentDeleteDialogVisible(false)}
                        />
                        <Dialog.Button
                            label={i18n(lang, "deletePermanently")}
                            disabled={buttonsDisabled}
                            onPress={() => {
                                setButtonsDisabled(true)
                                setConfirmPermanentDeleteDialogVisible(false)

                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                deleteItemPermanently({ item: currentActionSheetItem }).then(async () => {
                                    DeviceEventEmitter.emit("event", {
                                        type: "remove-item",
                                        data: {
                                            uuid: currentActionSheetItem.uuid
                                        }
                                    })

                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    //showToast({ message: i18n(lang, "itemDeletedPermanently", true, ["__NAME__"], [currentActionSheetItem.name]) })
                                }).catch((err) => {
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    showToast({ message: err.toString() })
                                })
                            }}
                        />
                    </Dialog.Container>
                )
            }
        </>
    )
})

export const ConfirmRemoveFromSharedInDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const removeFromSharedInDialogVisible = useStore(state => state.removeFromSharedInDialogVisible)
    const setRemoveFromSharedInDialogVisible = useStore(state => state.setRemoveFromSharedInDialogVisible)
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)

    useEffect(() => {
        setButtonsDisabled(false)
    }, [removeFromSharedInDialogVisible])

    return (
        <>
            {
                typeof currentActionSheetItem !== "undefined" && (
                    <Dialog.Container
                        visible={removeFromSharedInDialogVisible}
                        useNativeDriver={false}
                        onRequestClose={() => setRemoveFromSharedInDialogVisible(false)}
                        onBackdropPress={() => setRemoveFromSharedInDialogVisible(false)}
                    >
                        <Dialog.Title>{i18n(lang, "removeFromSharedInConfirmation", true, ["__NAME__"], [currentActionSheetItem.name])}</Dialog.Title>
                        <Dialog.Button
                            label={i18n(lang, "cancel")}
                            disabled={buttonsDisabled}
                            onPress={() => setRemoveFromSharedInDialogVisible(false)}
                        />
                        <Dialog.Button
                            label={i18n(lang, "removeFromSharedIn")}
                            disabled={buttonsDisabled}
                            onPress={() => {
                                setButtonsDisabled(true)
                                setRemoveFromSharedInDialogVisible(false)

                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                removeSharedInItem({ item: currentActionSheetItem }).then(async () => {
                                    DeviceEventEmitter.emit("event", {
                                        type: "remove-item",
                                        data: {
                                            uuid: currentActionSheetItem.uuid
                                        }
                                    })

                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    //showToast({ message: i18n(lang, "removedFromSharedIn", true, ["__NAME__"], [currentActionSheetItem.name]) })
                                }).catch((err) => {
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    showToast({ message: err.toString() })
                                })
                            }}
                        />
                    </Dialog.Container>
                )
            }
        </>
    )
})

export const ConfirmStopSharingDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const stopSharingDialogVisible = useStore(state => state.stopSharingDialogVisible)
    const setStopSharingDialogVisible = useStore(state => state.setStopSharingDialogVisible)
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentActionSheetItem = useStore(state => state.currentActionSheetItem)

    useEffect(() => {
        setButtonsDisabled(false)
    }, [stopSharingDialogVisible])

    return (
        <>
            {
                typeof currentActionSheetItem !== "undefined" && (
                    <Dialog.Container
                        visible={stopSharingDialogVisible}
                        useNativeDriver={false}
                        onRequestClose={() => setStopSharingDialogVisible(false)}
                        onBackdropPress={() => setStopSharingDialogVisible(false)}
                    >
                        <Dialog.Title>{i18n(lang, "stopSharingConfirmation", true, ["__NAME__"], [currentActionSheetItem.name])}</Dialog.Title>
                        <Dialog.Button
                            label={i18n(lang, "cancel")}
                            disabled={buttonsDisabled}
                            onPress={() => setStopSharingDialogVisible(false)}
                        />
                        <Dialog.Button
                            label={i18n(lang, "stopSharing")}
                            disabled={buttonsDisabled}
                            onPress={() => {
                                setButtonsDisabled(true)
                                setStopSharingDialogVisible(false)

                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                stopSharingItem({ item: currentActionSheetItem }).then(async () => {
                                    DeviceEventEmitter.emit("event", {
                                        type: "remove-item",
                                        data: {
                                            uuid: currentActionSheetItem.uuid
                                        }
                                    })

                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    //showToast({ message: i18n(lang, "stoppedSharingItem", true, ["__NAME__"], [currentActionSheetItem.name]) })
                                }).catch((err) => {
                                    setButtonsDisabled(false)

                                    useStore.setState({ fullscreenLoadingModalVisible: false })

                                    showToast({ message: err.toString() })
                                })
                            }}
                        />
                    </Dialog.Container>
                )
            }
        </>
    )
})

export interface CreateTextFileDialogProps {
    navigation: any
}

export const CreateTextFileDialog = memo(({ navigation }: CreateTextFileDialogProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const createTextFileDialogVisible = useStore(state => state.createTextFileDialogVisible)
    const setCreateTextFileDialogVisible = useStore(state => state.setCreateTextFileDialogVisible)
    const [value, setValue] = useState<string>(".txt")
    const inputRef = useRef<any>()
    const [lang, setLang] = useMMKVString("lang", storage)
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
    const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
    const setTextEditorParent = useStore(state => state.setTextEditorParent)

    useEffect(() => {
        if(!createTextFileDialogVisible){
            setTimeout(() => {
                setValue(".txt")
            }, 250)
        }

        if(createTextFileDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [createTextFileDialogVisible])

    return (
        <Dialog.Container
            visible={createTextFileDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setCreateTextFileDialogVisible(false)}
            onBackdropPress={() => {
                setCreateTextFileDialogVisible(false)
            }}
        >
            <Dialog.Title>{i18n(lang, "createTextFile")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "fileName")}
                value={value}
                autoFocus={true}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                onPress={() => setCreateTextFileDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "create")}
                onPress={() => {
                    if(value.length == 0){
                        return false
                    }

                    setCreateTextFileDialogVisible(false)
                    setCreateTextFileDialogName(value)
                    setTextEditorText("")
                    setTextEditorParent(getParent())
                    setTextEditorState("edit")
                                                        
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("TextEditorScreen"))
                    })
                }}
            />
        </Dialog.Container>
    )
})

export const RedeemCodeDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const redeemCodeDialogVisible = useStore(state => state.redeemCodeDialogVisible)
    const setRedeemCodeDialogVisible = useStore(state => state.setRedeemCodeDialogVisible)
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)

    useEffect(() => {
        setButtonsDisabled(false)

        if(!redeemCodeDialogVisible){
            setTimeout(() => {
                setValue("")
            }, 250)
        }

        if(redeemCodeDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [redeemCodeDialogVisible])

    return (
        <Dialog.Container
            visible={redeemCodeDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setRedeemCodeDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setRedeemCodeDialogVisible(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "redeemACode")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "code")}
                value={value}
                autoFocus={true}
                onChangeText={(val) => setValue(val)} textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setRedeemCodeDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "redeem")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setRedeemCodeDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    const code = value.trim()

                    if(code.length == 0){
                        return false
                    }

                    redeemCode({ code }).then(() => {
                        setButtonsDisabled(false)

                        DeviceEventEmitter.emit("event", {
                            type: "reload-account-info"
                        })

                        DeviceEventEmitter.emit("event", {
                            type: "reload-account-usage"
                        })

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: i18n(lang, "codeRedeemSuccess", true, ["__CODE__"], [code]) })
                    }).catch((err) => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: err.toString() })
                    })
                }}
            />
        </Dialog.Container>
    )
})

export interface DeleteAccountTwoFactorDialogProps {
    navigation: any
}

export const DeleteAccountTwoFactorDialog = memo(({ navigation }: DeleteAccountTwoFactorDialogProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const deleteAccountTwoFactorDialogVisible = useStore(state => state.deleteAccountTwoFactorDialogVisible)
    const setDeleteAccountTwoFactorDialogVisible = useStore(state => state.setDeleteAccountTwoFactorDialogVisible)
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)

    useEffect(() => {
        setButtonsDisabled(false)

        if(!deleteAccountTwoFactorDialogVisible){
            setTimeout(() => {
                setValue("")
            }, 250)
        }

        if(deleteAccountTwoFactorDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [deleteAccountTwoFactorDialogVisible])

    return (
        <Dialog.Container
            visible={deleteAccountTwoFactorDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setDeleteAccountTwoFactorDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setDeleteAccountTwoFactorDialogVisible(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "deleteAccount")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "code")}
                value={value}
                autoFocus={true}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setDeleteAccountTwoFactorDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "delete")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setDeleteAccountTwoFactorDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    const twoFactorKey = value.trim()

                    if(twoFactorKey.length == 0){
                        return false
                    }

                    deleteAccount({ twoFactorKey }).then(() => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        logout({ navigation })
                    }).catch((err) => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: err.toString() })
                    })
                }}
            />
        </Dialog.Container>
    )
})

export interface Disable2FATwoFactorDialogProps {
    navigation: any
}

export const Disable2FATwoFactorDialog = memo(({ navigation }: Disable2FATwoFactorDialogProps) => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const disable2FATwoFactorDialogVisible = useStore(state => state.disable2FATwoFactorDialogVisible)
    const setDisable2FATwoFactorDialogVisible = useStore(state => state.setDisable2FATwoFactorDialogVisible)
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)

    useEffect(() => {
        setButtonsDisabled(false)

        if(!disable2FATwoFactorDialogVisible){
            setTimeout(() => {
                setValue("")
            }, 250)
        }

        if(disable2FATwoFactorDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [disable2FATwoFactorDialogVisible])

    return (
        <Dialog.Container
            visible={disable2FATwoFactorDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setDisable2FATwoFactorDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setDisable2FATwoFactorDialogVisible(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "disable2FA")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "code")}
                value={value}
                autoFocus={true}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef} 
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setDisable2FATwoFactorDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "disable")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setDisable2FATwoFactorDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    const code = value.trim()

                    if(code.length == 0){
                        return false
                    }

                    disable2FA({ code }).then(() => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: i18n(lang, "twoFactorDisabledSuccess") })

                        navigationAnimation({ enable: false }).then(() => {
                            navigation.dispatch(CommonActions.reset({
                                index: 1,
                                routes: [
                                    {
                                        name: "SettingsScreen"
                                    },
                                    {
                                        name: "SettingsAccountScreen"
                                    }
                                ]
                            }))
                        })
                    }).catch((err) => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: err.toString() })
                    })
                }}
            />
        </Dialog.Container>
    )
})

export const BulkShareDialog = memo(() => {
    const [darkMode, setDarkMode] = useMMKVBoolean("darkMode", storage)
    const bulkShareDialogVisible = useStore(state => state.bulkShareDialogVisible)
    const setBulkShareDialogVisible = useStore(state => state.setBulkShareDialogVisible)
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const [lang, setLang] = useMMKVString("lang", storage)
    const currentBulkItems = useStore(state => state.currentBulkItems)

    useEffect(() => {
        setButtonsDisabled(false)

        if(!bulkShareDialogVisible){
            setTimeout(() => {
                setValue("")
            }, 250)
        }

        if(bulkShareDialogVisible){
            setTimeout(() => {
                inputRef.current.focus()
            }, 250)
        }
    }, [bulkShareDialogVisible])

    return (
        <Dialog.Container
            visible={bulkShareDialogVisible}
            useNativeDriver={false}
            onRequestClose={() => setBulkShareDialogVisible(false)}
            onBackdropPress={() => {
                if(!buttonsDisabled){
                    setBulkShareDialogVisible(false)
                }
            }}
        >
            <Dialog.Title>{i18n(lang, "shareSelectedItems")}</Dialog.Title>
            <Dialog.Input
                placeholder={i18n(lang, "sharePlaceholder")}
                value={value}
                autoFocus={true}
                onChangeText={(val) => setValue(val)}
                textInputRef={inputRef}
            />
            <Dialog.Button
                label={i18n(lang, "cancel")}
                disabled={buttonsDisabled}
                onPress={() => setBulkShareDialogVisible(false)}
            />
            <Dialog.Button
                label={i18n(lang, "share")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setBulkShareDialogVisible(false)

                    Keyboard.dismiss()

                    useStore.setState({ fullscreenLoadingModalVisible: true })

                    const email = value.trim()

                    if(email.length == 0){
                        return false
                    }

                    if(email == storage.getString("email")){
                        return false
                    }

                    bulkShare({ email, items: currentBulkItems }).then(() => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: i18n(lang, "sharedWithSuccessBulk", true, ["__EMAIL__", "__COUNT__"], [email, (currentBulkItems as any).length]) })
                    }).catch((err) => {
                        setButtonsDisabled(false)

                        useStore.setState({ fullscreenLoadingModalVisible: false })

                        showToast({ message: err.toString() })
                    })
                }}
            />
        </Dialog.Container>
    )
})