import React, { useState, useEffect, memo, useRef } from "react"
import Dialog from "react-native-dialog"
import { useStore } from "../../../lib/state"
import useLang from "../../../lib/hooks/useLang"
import { getParent } from "../../../lib/helpers"
import { i18n } from "../../../i18n"
import { navigationAnimation } from "../../../lib/state"
import { StackActions } from "@react-navigation/native"
import { DeviceEventEmitter } from "react-native"

export interface CreateTextFileDialogProps {
    navigation: any
}

const CreateTextFileDialog = memo(({ navigation }: CreateTextFileDialogProps) => {
    const [value, setValue] = useState<string>(".txt")
    const inputRef = useRef<any>()
    const lang = useLang()
	const setTextEditorState = useStore(state => state.setTextEditorState)
	const setTextEditorText = useStore(state => state.setTextEditorText)
    const setCreateTextFileDialogName = useStore(state => state.setCreateTextFileDialogName)
    const setTextEditorParent = useStore(state => state.setTextEditorParent)
    const [open, setOpen] = useState<boolean>(false)

    useEffect(() => {
        const openCreateTextFileDialogListener = () => {
			setValue(".txt")
            setOpen(true)

            setTimeout(() => {
                inputRef?.current?.focus()
            }, 500)
		}

		DeviceEventEmitter.addListener("openCreateTextFileDialog", openCreateTextFileDialogListener)

		return () => {
			DeviceEventEmitter.removeListener("openCreateTextFileDialog", openCreateTextFileDialogListener)
		}
    }, [])

    return (
        <Dialog.Container
            visible={open}
            useNativeDriver={false}
            onRequestClose={() => setOpen(false)}
            onBackdropPress={() => setOpen(false)}
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
                onPress={() => setOpen(false)}
            />
            <Dialog.Button
                label={i18n(lang, "create")}
                onPress={() => {
                    if(value.length == 0){
                        return false
                    }
                    
                    setCreateTextFileDialogName(value)
                    setTextEditorText("")
                    setTextEditorParent(getParent())
                    setTextEditorState("edit")
                    setValue(".txt")
                                                        
                    navigationAnimation({ enable: true }).then(() => {
                        navigation.dispatch(StackActions.push("TextEditorScreen"))

                        setOpen(false)
                    })
                }}
            />
        </Dialog.Container>
    )
})

export default CreateTextFileDialog