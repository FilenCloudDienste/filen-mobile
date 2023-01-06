import React, { useState, useEffect, memo } from "react"
import { Text, ScrollView, ActivityIndicator } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import { fetchGDPRInfo } from "../../lib/api"
import { useMountedState } from "react-use"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"

const ImagePickerScreen = memo(({ navigation }: { navigation: any }) => {
    const darkMode = useDarkMode()
    const lang = useLang()
    const isMounted: () => boolean = useMountedState()
    
    useEffect(() => {
        
    }, [])

    return (
        <>
            <DefaultTopBar
                onPressBack={() => navigation.goBack()}
                leftText={i18n(lang, "accountSettings")}
                middleText={i18n(lang, "showGDPR")}
            />
        </>
    )
})

export default ImagePickerScreen