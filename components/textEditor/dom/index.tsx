"use dom"

import CodeMirror, { EditorView } from "@uiw/react-codemirror"
import { useState, useCallback, memo, useMemo } from "react"
import { loadLanguage } from "./langs"
import { xcodeLight, xcodeDark } from "@uiw/codemirror-theme-xcode"
import { materialDark, materialLight } from "@uiw/codemirror-theme-material"
import MDEditor from "@uiw/react-md-editor"
import "@uiw/react-md-editor/dist/mdeditor.min.css"

const TextEditor = memo(
	({
		initialValue,
		onValueChange,
		fileName,
		darkMode,
		platformOS,
		previewType,
		markdownPreview
	}: {
		initialValue: string
		onValueChange: (value: string) => void
		fileName: string
		darkMode: boolean
		platformOS: "ios" | "android" | "macos" | "windows" | "web"
		previewType: "image" | "video" | "unknown" | "pdf" | "text" | "code" | "audio" | "docx"
		dom: import("expo/dom").DOMProps
		markdownPreview: boolean
	}) => {
		const [value, setValue] = useState<string>(initialValue)

		const onChange = useCallback(
			(value: string) => {
				setValue(value)
				onValueChange(value)
			},
			[onValueChange]
		)

		const theme = useMemo(() => {
			return platformOS === "android" ? (darkMode ? materialDark : materialLight) : darkMode ? xcodeDark : xcodeLight
		}, [darkMode, platformOS])

		const extensions = useMemo(() => {
			const lang = loadLanguage(fileName)
			const base = [
				EditorView.lineWrapping,
				EditorView.theme({
					"&": {
						outline: "none !important"
					},
					"&.cm-focused": {
						outline: "none !important",
						border: "none !important",
						boxShadow: "none !important"
					},
					"&:focus-visible": {
						outline: "none !important"
					}
				}),
				...(previewType === "code" ? [] : [])
			]

			if (!lang) {
				return [...base]
			}

			return [...base, lang]
		}, [fileName, previewType])

		if (fileName.toLowerCase().trim().endsWith(".md") && markdownPreview) {
			return (
				<MDEditor.Markdown
					source={value}
					wrapperElement={{
						"data-color-mode": darkMode ? "dark" : "light",
						style: {
							maxWidth: "100vw",
							width: "100vw"
						}
					}}
					style={{
						padding: 16,
						maxWidth: "100vw",
						width: "100vw"
					}}
				/>
			)
		}

		return (
			<CodeMirror
				value={value}
				width="100vw"
				onChange={onChange}
				extensions={extensions}
				theme={theme}
				style={{
					width: "100vw"
				}}
			/>
		)
	}
)

TextEditor.displayName = "TextEditor"

export default TextEditor
