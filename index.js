import "@/lib/polyfills/globals"
import "react-native-reanimated"
import "intl-pluralrules"

import "expo-router/entry"

import "@/lib/backgroundTask"

import TrackPlayer from "react-native-track-player"
import { trackPlayerService } from "@/lib/trackPlayer"

trackPlayerService
	.init()
	.then(() => {
		TrackPlayer.registerPlaybackService(() => async () => {
			trackPlayerService.handle()

			console.log("TrackPlayer playbackService started")
		})

		console.log("TrackPlayer ready")
	})
	.catch(console.error)
