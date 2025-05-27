import "@/lib/polyfills/globals"
import "react-native-reanimated"
import "intl-pluralrules"

import "expo-router/entry"

import { registerBackgroundTask } from "@/lib/backgroundTask"
import foregroundService from "@/lib/services/foreground"
import { trackPlayerService } from "@/lib/trackPlayer"

registerBackgroundTask()

foregroundService.register()
trackPlayerService.init()
