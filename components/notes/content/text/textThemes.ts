/* eslint-disable quotes */

import { tags as t } from "@lezer/highlight"
import { createTheme } from "@uiw/codemirror-themes"

export function createTextThemes({ backgroundColor, textForegroundColor }: { backgroundColor: string; textForegroundColor: string }) {
	const iosLightTheme = createTheme({
		theme: "light",
		settings: {
			background: backgroundColor,
			foreground: textForegroundColor,
			caret: "#007AFF", // iOS system blue
			selection: "#007AFF40", // iOS blue with alpha
			selectionMatch: "#007AFF40",
			lineHighlight: "transparent", // iOS system gray 6
			gutterBorder: "1px solid #C7C7CC", // iOS system gray 3
			gutterBackground: "#FFFFFF",
			gutterForeground: "#8E8E93", // iOS system gray
			fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "SF Pro Text", "SF Mono", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.variableName,
				color: "#007AFF"
			}, // iOS system blue
			{
				tag: [t.string, t.special(t.brace)],
				color: "#34C759"
			}, // iOS system green
			{
				tag: t.number,
				color: "#FF9500"
			}, // iOS system orange
			{
				tag: t.bool,
				color: "#5856D6"
			}, // iOS system purple
			{
				tag: t.null,
				color: "#5856D6"
			}, // iOS system purple
			{
				tag: t.keyword,
				color: "#FF2D55"
			}, // iOS system pink
			{
				tag: t.operator,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.className,
				color: "#5856D6"
			}, // iOS system purple
			{
				tag: t.definition(t.typeName),
				color: "#FF3B30"
			}, // iOS system red
			{
				tag: t.typeName,
				color: "#5856D6"
			}, // iOS system purple
			{
				tag: t.angleBracket,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.tagName,
				color: "#FF9500"
			}, // iOS system orange
			{
				tag: t.attributeName,
				color: "#007AFF"
			} // iOS system blue
		]
	})

	const iosDarkTheme = createTheme({
		theme: "dark",
		settings: {
			background: backgroundColor,
			foreground: textForegroundColor,
			caret: "#0A84FF", // iOS dark mode blue
			selection: "#0A84FF40", // iOS dark mode blue with alpha
			selectionMatch: "#0A84FF40",
			lineHighlight: "transparent", // iOS dark mode gray 6
			gutterBorder: "1px solid #3A3A3C", // iOS dark mode gray 5
			gutterBackground: "transparent",
			gutterForeground: "#8E8E93", // iOS system gray (unchanged in dark)
			fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "SF Pro Text", "SF Mono", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.variableName,
				color: "#0A84FF"
			}, // iOS dark mode blue
			{
				tag: [t.string, t.special(t.brace)],
				color: "#30D158"
			}, // iOS dark mode green
			{
				tag: t.number,
				color: "#FF9F0A"
			}, // iOS dark mode orange
			{
				tag: t.bool,
				color: "#BF5AF2"
			}, // iOS dark mode purple
			{
				tag: t.null,
				color: "#BF5AF2"
			}, // iOS dark mode purple
			{
				tag: t.keyword,
				color: "#FF375F"
			}, // iOS dark mode pink
			{
				tag: t.operator,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.className,
				color: "#BF5AF2"
			}, // iOS dark mode purple
			{
				tag: t.definition(t.typeName),
				color: "#FF453A"
			}, // iOS dark mode red
			{
				tag: t.typeName,
				color: "#BF5AF2"
			}, // iOS dark mode purple
			{
				tag: t.angleBracket,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.tagName,
				color: "#FF9F0A"
			}, // iOS dark mode orange
			{
				tag: t.attributeName,
				color: "#0A84FF"
			} // iOS dark mode blue
		]
	})

	const androidLightTheme = createTheme({
		theme: "light",
		settings: {
			background: backgroundColor,
			foreground: textForegroundColor,
			caret: "#6750A4", // Material Design 3 primary
			selection: "#6750A433", // MD3 primary with alpha
			selectionMatch: "#6750A433",
			lineHighlight: "transparent", // MD3 surface variant
			gutterBorder: "1px solid #CAC4D0", // MD3 outline
			gutterBackground: "#FFFBFE", // MD3 surface
			gutterForeground: "#49454F", // MD3 on surface variant
			fontFamily: '"Roboto Flex", Roboto, "Roboto Mono", system-ui, sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#79747E"
			}, // MD3 on surface variant
			{
				tag: t.variableName,
				color: "#6750A4"
			}, // MD3 primary
			{
				tag: [t.string, t.special(t.brace)],
				color: "#006A6B"
			}, // MD3 tertiary
			{
				tag: t.number,
				color: "#7D5260"
			}, // MD3 secondary
			{
				tag: t.bool,
				color: "#6750A4"
			}, // MD3 primary
			{
				tag: t.null,
				color: "#6750A4"
			}, // MD3 primary
			{
				tag: t.keyword,
				color: "#B3261E"
			}, // MD3 error
			{
				tag: t.operator,
				color: "#79747E"
			}, // MD3 on surface variant
			{
				tag: t.className,
				color: "#7D5260"
			}, // MD3 secondary
			{
				tag: t.definition(t.typeName),
				color: "#B3261E"
			}, // MD3 error
			{
				tag: t.typeName,
				color: "#7D5260"
			}, // MD3 secondary
			{
				tag: t.angleBracket,
				color: "#79747E"
			}, // MD3 on surface variant
			{
				tag: t.tagName,
				color: "#006A6B"
			}, // MD3 tertiary
			{
				tag: t.attributeName,
				color: "#6750A4"
			} // MD3 primary
		]
	})

	const androidDarkTheme = createTheme({
		theme: "dark",
		settings: {
			background: backgroundColor,
			foreground: textForegroundColor,
			caret: "#D0BCFF", // Material Design 3 primary (dark)
			selection: "#D0BCFF33", // MD3 primary (dark) with alpha
			selectionMatch: "#D0BCFF33",
			lineHighlight: "transparent", // MD3 surface variant (dark)
			gutterBorder: "1px solid #49454F", // MD3 outline (dark)
			gutterBackground: "#1C1B1F", // MD3 surface (dark)
			gutterForeground: "#CAC4D0", // MD3 on surface variant (dark)
			fontFamily: '"Roboto Flex", Roboto, "Roboto Mono", system-ui, sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#938F99"
			}, // MD3 on surface variant (dark)
			{
				tag: t.variableName,
				color: "#D0BCFF"
			}, // MD3 primary (dark)
			{
				tag: [t.string, t.special(t.brace)],
				color: "#4FD8DA"
			}, // MD3 tertiary (dark)
			{
				tag: t.number,
				color: "#CCC2DC"
			}, // MD3 secondary (dark)
			{
				tag: t.bool,
				color: "#D0BCFF"
			}, // MD3 primary (dark)
			{
				tag: t.null,
				color: "#D0BCFF"
			}, // MD3 primary (dark)
			{
				tag: t.keyword,
				color: "#F2B8B5"
			}, // MD3 error (dark)
			{
				tag: t.operator,
				color: "#938F99"
			}, // MD3 on surface variant (dark)
			{
				tag: t.className,
				color: "#CCC2DC"
			}, // MD3 secondary (dark)
			{
				tag: t.definition(t.typeName),
				color: "#F2B8B5"
			}, // MD3 error (dark)
			{
				tag: t.typeName,
				color: "#CCC2DC"
			}, // MD3 secondary (dark)
			{
				tag: t.angleBracket,
				color: "#938F99"
			}, // MD3 on surface variant (dark)
			{
				tag: t.tagName,
				color: "#4FD8DA"
			}, // MD3 tertiary (dark)
			{
				tag: t.attributeName,
				color: "#D0BCFF"
			} // MD3 primary (dark)
		]
	})

	return {
		ios: {
			light: iosLightTheme,
			dark: iosDarkTheme
		},
		android: {
			light: androidLightTheme,
			dark: androidDarkTheme
		}
	}
}
