import { useEffect } from "react"
import { setAudioModeAsync } from "expo-audio"

let audioModeSet = false

export default function useSetExpoAudioMode() {
	useEffect(() => {
		if (audioModeSet) {
			return
		}

		audioModeSet = true

		setAudioModeAsync({
			playsInSilentMode: true,
			interruptionMode: "doNotMix",
			interruptionModeAndroid: "doNotMix",
			shouldPlayInBackground: true
		}).catch(err => {
			audioModeSet = false

			console.error(err)
		})
	}, [])
}
