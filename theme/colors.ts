import { Platform } from "react-native"

const IOS_SYSTEM_COLORS = {
	white: "rgb(255, 255, 255)",
	black: "rgb(0, 0, 0)",
	light: {
		grey6: "rgb(242, 242, 247)",
		grey5: "rgb(229, 229, 234)",
		grey4: "rgb(209, 209, 214)",
		grey3: "rgb(199, 199, 204)",
		grey2: "rgb(174, 174, 178)",
		grey: "rgb(142, 142, 147)",
		background: "rgb(255, 255, 255)",
		foreground: "rgb(0, 0, 0)",
		root: "rgb(255, 255, 255)",
		card: "rgb(255, 255, 255)",
		destructive: "rgb(255, 59, 48)",
		primary: "rgb(0, 122, 255)",
		secondary: "rgb(142, 142, 147)",
		accent: "rgb(255, 45, 85)",
		border: "rgb(199, 199, 204)",
		input: "rgb(242, 242, 247)"
	},
	dark: {
		grey6: "rgb(28, 28, 30)",
		grey5: "rgb(44, 44, 46)",
		grey4: "rgb(58, 58, 60)",
		grey3: "rgb(72, 72, 74)",
		grey2: "rgb(99, 99, 102)",
		grey: "rgb(142, 142, 147)",
		background: "rgb(0, 0, 0)",
		foreground: "rgb(255, 255, 255)",
		root: "rgb(0, 0, 0)",
		card: "rgb(28, 28, 30)",
		destructive: "rgb(255, 69, 58)",
		primary: "rgb(10, 132, 255)",
		secondary: "rgb(99, 99, 102)",
		accent: "rgb(255, 55, 95)",
		border: "rgb(58, 58, 60)",
		input: "rgb(44, 44, 46)"
	}
} as const

const ANDROID_COLORS = {
	white: "rgb(255, 255, 255)",
	black: "rgb(0, 0, 0)",
	light: {
		grey6: "rgb(244, 239, 244)",
		grey5: "rgb(231, 224, 236)",
		grey4: "rgb(202, 196, 208)",
		grey3: "rgb(121, 116, 126)",
		grey2: "rgb(73, 69, 79)",
		grey: "rgb(49, 48, 51)",
		background: "rgb(255, 251, 254)",
		foreground: "rgb(16, 20, 24)",
		root: "rgb(255, 255, 255)",
		card: "rgb(255, 255, 255)",
		destructive: "rgb(186, 26, 26)",
		primary: "rgb(103, 80, 164)",
		secondary: "rgb(98, 91, 113)",
		accent: "rgb(125, 82, 96)",
		border: "rgb(202, 196, 208)",
		input: "rgb(231, 224, 236)"
	},
	dark: {
		grey6: "rgb(39, 37, 43)",
		grey5: "rgb(73, 69, 79)",
		grey4: "rgb(121, 116, 126)",
		grey3: "rgb(147, 143, 153)",
		grey2: "rgb(202, 196, 208)",
		grey: "rgb(230, 225, 229)",
		background: "rgb(16, 14, 19)",
		foreground: "rgb(230, 225, 229)",
		root: "rgb(28, 27, 31)",
		card: "rgb(28, 27, 31)",
		destructive: "rgb(242, 184, 181)",
		primary: "rgb(208, 188, 255)",
		secondary: "rgb(196, 190, 210)",
		accent: "rgb(219, 187, 200)",
		border: "rgb(73, 69, 79)",
		input: "rgb(39, 37, 43)"
	}
} as const

const COLORS = Platform.OS === "ios" ? IOS_SYSTEM_COLORS : ANDROID_COLORS

export { COLORS }
