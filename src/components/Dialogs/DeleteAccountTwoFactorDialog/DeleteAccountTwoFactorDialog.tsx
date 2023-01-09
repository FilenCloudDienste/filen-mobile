import React, { useState, useEffect, useRef, memo } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { deleteAccount } from "../../../lib/api"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { Keyboard } from "react-native"
import { logout } from "../../../lib/services/auth/logout"
import { DeviceEventEmitter } from "react-native"
import { NavigationContainerRef } from "@react-navigation/native"

export interface DeleteAccountTwoFactorDialogProps {
    navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

const DeleteAccountTwoFactorDialog = memo(({ navigation }: DeleteAccountTwoFactorDialogProps) => {
    const [value, setValue] = useState<string>("")
    const inputRef = useRef<any>()
    const [buttonsDisabled, setButtonsDisabled] = useState<boolean>(false)
    const lang = useLang()
    const [open, setOpen] = useState<boolean>(false)

    useEffect(() => {
        const openDeleteAccountTwoFactorDialogListener = () => {
			setButtonsDisabled(false)
            setOpen(true)
		}

		DeviceEventEmitter.addListener("openDeleteAccountTwoFactorDialog", openDeleteAccountTwoFactorDialogListener)

		return () => {
			DeviceEventEmitter.removeListener("openDeleteAccountTwoFactorDialog", openDeleteAccountTwoFactorDialogListener)
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
                onPress={() => setOpen(false)}
            />
            <Dialog.Button
                label={i18n(lang, "delete")}
                disabled={buttonsDisabled}
                onPress={() => {
                    setButtonsDisabled(true)
                    setOpen(false)

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

export default DeleteAccountTwoFactorDialog