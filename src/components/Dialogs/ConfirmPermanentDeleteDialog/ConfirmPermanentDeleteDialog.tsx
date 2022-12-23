import React, { useState, useEffect, memo } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { deleteItemPermanently } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { DeviceEventEmitter } from "react-native"
import type { Item } from "../../../types"

const ConfirmPermanentDeleteDialog = memo(() => {
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const lang = useLang()
    const [open, setOpen] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)

    useEffect(() => {
        const openConfirmPermanentDeleteDialogListener = (item: Item) => {
			setButtonsDisabled(false)
            setCurrentItem(item)
            setOpen(true)
		}

		DeviceEventEmitter.addListener("openConfirmPermanentDeleteDialog", openConfirmPermanentDeleteDialogListener)

		return () => {
			DeviceEventEmitter.removeListener("openConfirmPermanentDeleteDialog", openConfirmPermanentDeleteDialogListener)
		}
    }, [])

    return (
        <>
            {
                typeof currentItem !== "undefined" && (
                    <Dialog.Container
                        visible={open}
                        useNativeDriver={false}
                        onRequestClose={() => setOpen(false)}
                        onBackdropPress={() => setOpen(false)}
                    >
                        <Dialog.Title>{i18n(lang, "itemDeletedPermanentlyConfirmation", true, ["__NAME__"], [currentItem.name])}</Dialog.Title>
                        <Dialog.Button
                            label={i18n(lang, "cancel")}
                            disabled={buttonsDisabled}
                            onPress={() => setOpen(false)}
                        />
                        <Dialog.Button
                            label={i18n(lang, "deletePermanently")}
                            disabled={buttonsDisabled}
                            onPress={() => {
                                setButtonsDisabled(true)
                                setOpen(false)

                                useStore.setState({ fullscreenLoadingModalVisible: true })

                                deleteItemPermanently({ item: currentItem }).then(async () => {
                                    DeviceEventEmitter.emit("event", {
                                        type: "remove-item",
                                        data: {
                                            uuid: currentItem.uuid
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

export default ConfirmPermanentDeleteDialog