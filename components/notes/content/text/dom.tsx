"use dom"

import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react"
import { loadLanguage } from "@/components/textEditor/dom/langs"
import { xcodeLight, xcodeDark } from "@uiw/codemirror-theme-xcode"
import { materialDark, materialLight } from "@uiw/codemirror-theme-material"
import MDEditor from "@uiw/react-md-editor"
import type { NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { createTextThemes } from "./textThemes"

const TextEditor = memo(
	({
		initialValue,
		onValueChange,
		type,
		darkMode,
		platformOS,
		markdownPreview,
		title,
		backgroundColor,
		textForegroundColor,
		readOnly,
		placeholder,
		onDidType
	}: {
		initialValue: string
		onValueChange: (value: string) => void
		type: NoteType
		darkMode: boolean
		platformOS: "ios" | "android" | "macos" | "windows" | "web"
		dom: import("expo/dom").DOMProps
		markdownPreview: boolean
		title: string
		backgroundColor: string
		textForegroundColor: string
		readOnly: boolean
		placeholder: string
		onDidType: (value: string) => void
	}) => {
		const [value, setValue] = useState<string>(initialValue)
		const didTypeRef = useRef<boolean>(false)

		const onChange = useCallback(
			(value: string) => {
				if (!didTypeRef.current) {
					return
				}

				setValue(value)
				onValueChange(value)
				onDidType(value)
			},
			[onValueChange, onDidType]
		)

		const textThemes = useMemo(() => {
			return createTextThemes({
				backgroundColor,
				textForegroundColor
			})
		}, [backgroundColor, textForegroundColor])

		const theme = useMemo(() => {
			if (type === "text") {
				return platformOS === "android"
					? darkMode
						? textThemes.android.dark
						: textThemes.android.light
					: darkMode
					? textThemes.ios.dark
					: textThemes.ios.light
			}

			return platformOS === "android" ? (darkMode ? materialDark : materialLight) : darkMode ? xcodeDark : xcodeLight
		}, [darkMode, platformOS, type, textThemes])

		const extensions = useMemo(() => {
			const base = [
				EditorView.lineWrapping,
				EditorView.theme({
					"&": {
						outline: "none !important",
						...(type === "text"
							? {
									fontSize: "17px"
							  }
							: {})
					},
					"&.cm-focused": {
						outline: "none !important",
						border: "none !important",
						boxShadow: "none !important"
					},
					"&:focus-visible": {
						outline: "none !important"
					},
					".cm-line": {
						...(type === "text"
							? {
									lineHeight: "1.5"
							  }
							: {})
					}
				})
			]

			if (type === "text") {
				return [
					...base,
					EditorView.theme({
						".cm-gutters": {
							display: "none"
						}
					})
				]
			}

			const lang = loadLanguage(
				type === "md" ? `${title}.md` : type === "code" ? `${title}${title.includes(".") ? "" : ".tsx"}` : title
			)

			if (!lang) {
				return [...base]
			}

			return [...base, lang]
		}, [title, type])

		useEffect(() => {
			const listener = () => {
				didTypeRef.current = true
			}

			window.addEventListener("keydown", listener)

			return () => {
				window.removeEventListener("keydown", listener)
			}
		}, [])

		if (type === "md" && markdownPreview) {
			return (
				<MDEditor.Markdown
					source={value}
					wrapperElement={{
						"data-color-mode": darkMode ? "dark" : "light",
						style: {
							width: "calc(100% - 32px)",
							padding: "16px"
						}
					}}
					style={{
						width: "calc(100% - 32px)",
						padding: "16px"
					}}
				/>
			)
		}

		return (
			<CodeMirror
				value={value}
				onChange={onChange}
				extensions={extensions}
				theme={theme}
				editable={!readOnly}
				placeholder={placeholder}
				style={{
					width: "100%",
					padding: type === "text" ? "16px" : "0px",
					paddingBottom: "500px"
				}}
			/>
		)
	}
)

TextEditor.displayName = "TextEditor"

export default TextEditor
