import type { Theme } from "@react-navigation/native"
import { COLORS } from "./colors"
import { Platform } from "react-native"

export const WEB_FONT_STACK =
	// eslint-disable-next-line quotes
	'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'

export const NAV_THEME: { light: Theme; dark: Theme } = {
	light: {
		dark: false,
		colors: {
			background: COLORS.light.background,
			border: COLORS.light.grey5,
			card: COLORS.light.card,
			notification: COLORS.light.destructive,
			primary: COLORS.light.primary,
			text: COLORS.black
		},
		fonts: Platform.select({
			web: {
				regular: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "400"
				},
				medium: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "500"
				},
				bold: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "600"
				},
				heavy: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "700"
				}
			},
			ios: {
				regular: {
					fontFamily: "System",
					fontWeight: "400"
				},
				medium: {
					fontFamily: "System",
					fontWeight: "500"
				},
				bold: {
					fontFamily: "System",
					fontWeight: "600"
				},
				heavy: {
					fontFamily: "System",
					fontWeight: "700"
				}
			},
			default: {
				regular: {
					fontFamily: "sans-serif",
					fontWeight: "normal"
				},
				medium: {
					fontFamily: "sans-serif-medium",
					fontWeight: "normal"
				},
				bold: {
					fontFamily: "sans-serif",
					fontWeight: "600"
				},
				heavy: {
					fontFamily: "sans-serif",
					fontWeight: "700"
				}
			}
		})
	},
	dark: {
		dark: true,
		colors: {
			background: COLORS.dark.background,
			border: COLORS.dark.grey5,
			card: COLORS.dark.grey6,
			notification: COLORS.dark.destructive,
			primary: COLORS.dark.primary,
			text: COLORS.white
		},
		fonts: Platform.select({
			web: {
				regular: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "400"
				},
				medium: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "500"
				},
				bold: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "600"
				},
				heavy: {
					fontFamily: WEB_FONT_STACK,
					fontWeight: "700"
				}
			},
			ios: {
				regular: {
					fontFamily: "System",
					fontWeight: "400"
				},
				medium: {
					fontFamily: "System",
					fontWeight: "500"
				},
				bold: {
					fontFamily: "System",
					fontWeight: "600"
				},
				heavy: {
					fontFamily: "System",
					fontWeight: "700"
				}
			},
			default: {
				regular: {
					fontFamily: "sans-serif",
					fontWeight: "normal"
				},
				medium: {
					fontFamily: "sans-serif-medium",
					fontWeight: "normal"
				},
				bold: {
					fontFamily: "sans-serif",
					fontWeight: "600"
				},
				heavy: {
					fontFamily: "sans-serif",
					fontWeight: "700"
				}
			}
		})
	}
}
