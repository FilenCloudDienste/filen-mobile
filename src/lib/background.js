import "./globals"
import BackgroundTimer from "react-native-background-timer"
import { Platform } from "react-native"

export const startBackgroundTimer = () => {
    if(!global.backgroundTimerStarted){
        global.backgroundTimerStarted = true

        BackgroundTimer.start()
    }

    return true
}

export const stopBackgroundTimer = () => {
    if(global.backgroundTimerStarted){
        global.backgroundTimerStarted = false

        BackgroundTimer.stop()
    }

    return true
}