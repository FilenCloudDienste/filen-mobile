import "@/lib/polyfills/globals"
import "react-native-reanimated"
import "intl-pluralrules"
import { cssInterop } from "nativewind"
import { NativeText, NativeView } from "react-native-boost/runtime"

import "expo-router/entry"

import "@/lib/backgroundTask"
import "@/lib/trackPlayer"

cssInterop(NativeText, {
	className: "style"
})

cssInterop(NativeView, {
	className: "style"
})
