import "@/lib/polyfills/globals"
import "react-native-reanimated"
import "intl-pluralrules"

import "expo-router/entry"

import "@/lib/backgroundTask"

import { trackPlayerService } from "@/lib/trackPlayer"

trackPlayerService.init()
