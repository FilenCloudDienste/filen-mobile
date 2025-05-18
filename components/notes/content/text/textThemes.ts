/* eslint-disable quotes */

import { tags as t } from "@lezer/highlight"
import { createTheme } from "@uiw/codemirror-themes"

export function createTextThemes({ backgroundColor, textForegroundColor }: { backgroundColor: string; textForegroundColor: string }) {
	const iosLightTheme = createTheme({
		theme: "light",
		settings: {
			background: backgroundColor,
			foreground: textForegroundColor,
			caret: "#007AFF", // iOS blue
			selection: "#007AFF40", // iOS blue with alpha
			selectionMatch: "#007AFF40",
			lineHighlight: "#F2F2F7", // iOS system gray 6
			gutterBorder: "1px solid #E5E5EA", // iOS system gray 4
			gutterBackground: "#FFFFFF",
			gutterForeground: "#8E8E93", // iOS system gray
			fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "SF Pro Text", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.variableName,
				color: "#007AFF"
			}, // iOS blue
			{
				tag: [t.string, t.special(t.brace)],
				color: "#34C759"
			}, // iOS green
			{
				tag: t.number,
				color: "#FF9500"
			}, // iOS orange
			{
				tag: t.bool,
				color: "#5856D6"
			}, // iOS purple
			{
				tag: t.null,
				color: "#5856D6"
			}, // iOS purple
			{
				tag: t.keyword,
				color: "#FF2D55"
			}, // iOS pink
			{
				tag: t.operator,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.className,
				color: "#5856D6"
			}, // iOS purple
			{
				tag: t.definition(t.typeName),
				color: "#FF3B30"
			}, // iOS red
			{
				tag: t.typeName,
				color: "#5856D6"
			}, // iOS purple
			{
				tag: t.angleBracket,
				color: "#8E8E93"
			}, // iOS system gray
			{
				tag: t.tagName,
				color: "#FF9500"
			}, // iOS orange
			{
				tag: t.attributeName,
				color: "#007AFF"
			} // iOS blue
		]
	})

	const iosDarkTheme = createTheme({
		theme: "dark",
		settings: {
			background: backgroundColor, // iOS dark mode background
			foreground: textForegroundColor,
			caret: "#0A84FF", // iOS dark mode blue
			selection: "transparent", // iOS dark mode blue with alpha
			selectionMatch: "transparent",
			lineHighlight: "transparent", // iOS dark mode gray 6
			gutterBorder: "transparent", // iOS dark mode gray 5
			gutterBackground: "transparent",
			gutterForeground: "transparent", // iOS system gray
			fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "SF Pro Text", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#98989D"
			}, // iOS dark mode gray
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
				color: "#98989D"
			}, // iOS dark mode gray
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
				color: "#98989D"
			}, // iOS dark mode gray
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
			foreground: textForegroundColor, // Material design primary text
			caret: "#6200EE", // Android primary
			selection: "#6200EE33", // Android primary with alpha
			selectionMatch: "#6200EE33",
			lineHighlight: "#0000001A", // Material design divider
			gutterBorder: "1px solid #0000001F", // Material design divider
			gutterBackground: "#FFFFFF",
			gutterForeground: "#00000099", // Material design secondary text
			fontFamily: 'Roboto, "Roboto Mono", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#00000099"
			}, // Material design secondary text
			{
				tag: t.variableName,
				color: "#6200EE"
			}, // Android primary
			{
				tag: [t.string, t.special(t.brace)],
				color: "#018786"
			}, // Android teal
			{
				tag: t.number,
				color: "#03DAC6"
			}, // Android secondary
			{
				tag: t.bool,
				color: "#3700B3"
			}, // Android primary variant
			{
				tag: t.null,
				color: "#3700B3"
			}, // Android primary variant
			{
				tag: t.keyword,
				color: "#6200EE"
			}, // Android primary
			{
				tag: t.operator,
				color: "#00000099"
			}, // Material design secondary text
			{
				tag: t.className,
				color: "#3700B3"
			}, // Android primary variant
			{
				tag: t.definition(t.typeName),
				color: "#B00020"
			}, // Android error
			{
				tag: t.typeName,
				color: "#3700B3"
			}, // Android primary variant
			{
				tag: t.angleBracket,
				color: "#00000099"
			}, // Material design secondary text
			{
				tag: t.tagName,
				color: "#018786"
			}, // Android teal
			{
				tag: t.attributeName,
				color: "#6200EE"
			} // Android primary
		]
	})

	const androidDarkTheme = createTheme({
		theme: "dark",
		settings: {
			background: backgroundColor, // Material dark background
			foreground: textForegroundColor, // Material design primary text (dark)
			caret: "#BB86FC", // Material dark primary
			selection: "#BB86FC33", // Material dark primary with alpha
			selectionMatch: "#BB86FC33",
			lineHighlight: "#FFFFFF1A", // Material dark divider
			gutterBorder: "1px solid #FFFFFF1F", // Material dark divider
			gutterBackground: "#121212",
			gutterForeground: "#FFFFFF99", // Material design secondary text (dark)
			fontFamily: 'Roboto, "Roboto Mono", sans-serif'
		},
		styles: [
			{
				tag: t.comment,
				color: "#FFFFFF99"
			}, // Material design secondary text (dark)
			{
				tag: t.variableName,
				color: "#BB86FC"
			}, // Material dark primary
			{
				tag: [t.string, t.special(t.brace)],
				color: "#03DAC6"
			}, // Material dark secondary
			{
				tag: t.number,
				color: "#03DAC6"
			}, // Material dark secondary
			{
				tag: t.bool,
				color: "#BB86FC"
			}, // Material dark primary
			{
				tag: t.null,
				color: "#BB86FC"
			}, // Material dark primary
			{
				tag: t.keyword,
				color: "#CF6679"
			}, // Material dark error
			{
				tag: t.operator,
				color: "#FFFFFF99"
			}, // Material design secondary text (dark)
			{
				tag: t.className,
				color: "#BB86FC"
			}, // Material dark primary
			{
				tag: t.definition(t.typeName),
				color: "#CF6679"
			}, // Material dark error
			{
				tag: t.typeName,
				color: "#BB86FC"
			}, // Material dark primary
			{
				tag: t.angleBracket,
				color: "#FFFFFF99"
			}, // Material design secondary text (dark)
			{
				tag: t.tagName,
				color: "#03DAC6"
			}, // Material dark secondary
			{
				tag: t.attributeName,
				color: "#BB86FC"
			} // Material dark primary
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
