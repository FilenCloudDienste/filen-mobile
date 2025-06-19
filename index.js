import "@/lib/polyfills/globals"
import "react-native-reanimated"
import "intl-pluralrules"
import { cssInterop } from "nativewind"
import { NativeText, NativeView } from "react-native-boost/runtime"

import "expo-router/entry"

import "@/lib/backgroundTask"

import trackPlayerService from "@/lib/trackPlayer"

trackPlayerService.init()

cssInterop(NativeText, {
	className: "style"
})
cssInterop(NativeView, {
	className: "style"
})
