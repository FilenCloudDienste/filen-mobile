"use dom"

import { useEffect, useRef, memo } from "react"
import Quill from "quill"
import { type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { type QuillThemeOptions, QuillThemeCustomizer } from "./quillTheme"
import DOMPurify from "dompurify"
import "quill/dist/quill.snow.css"

export type Colors = {
	text: {
		foreground: string
		muted: string
		primary: string
	}
	background: {
		primary: string
		secondary: string
	}
}

const getThemeOptions = ({
	colors,
	platformOS,
	readOnly
}: {
	darkMode: boolean
	colors: Colors
	platformOS: "ios" | "android" | "macos" | "windows" | "web"
	readOnly: boolean
}): QuillThemeOptions => {
	if (platformOS === "ios") {
		return {
			containerBorder: "none",
			containerBackground: "transparent",
			toolbarBorder: "1px solid #2c2c2e",
			toolbarBackground: colors.background.primary,
			toolbarColor: colors.text.muted,
			toolbarStrokeColor: colors.text.muted,
			toolbarFillColor: colors.text.muted,
			toolbarActiveColor: colors.text.primary,
			toolbarActiveStrokeColor: colors.text.primary,
			toolbarActiveFillColor: colors.text.primary,
			toolbarHoverColor: colors.text.primary,
			toolbarHoverStrokeColor: colors.text.primary,
			toolbarHoverFillColor: colors.text.primary,
			toolbarBorderRadius: "6px",
			editorFontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
			editorFontSize: "17px",
			editorLineHeight: "1.5",
			editorPadding: "16px",
			editorTextColor: colors.text.foreground,
			editorBackground: "transparent",
			placeholderColor: colors.text.muted,
			placeholderStyle: "normal",
			toolbarSticky: true,
			codeBackground: colors.background.secondary,
			codeTextColor: colors.text.foreground,
			readOnly
		}
	} else {
		return {
			containerBorder: "none",
			containerBackground: "transparent",
			toolbarBorder: "1px solid #2c2c2e",
			toolbarBackground: colors.background.primary,
			toolbarColor: colors.text.muted,
			toolbarStrokeColor: colors.text.muted,
			toolbarFillColor: colors.text.muted,
			toolbarActiveColor: colors.text.primary,
			toolbarActiveStrokeColor: colors.text.primary,
			toolbarActiveFillColor: colors.text.primary,
			toolbarHoverColor: colors.text.primary,
			toolbarHoverStrokeColor: colors.text.primary,
			toolbarHoverFillColor: colors.text.primary,
			toolbarBorderRadius: "6px",
			editorFontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
			editorFontSize: "17px",
			editorLineHeight: "1.5",
			editorPadding: "16px",
			editorTextColor: colors.text.foreground,
			editorBackground: "transparent",
			placeholderColor: colors.text.muted,
			placeholderStyle: "normal",
			toolbarSticky: true,
			codeBackground: colors.background.secondary,
			codeTextColor: colors.text.foreground,
			readOnly
		}
	}
}

const RichTextEditor = memo(
	({
		initialValue,
		onValueChange,
		placeholder,
		type,
		readOnly,
		onDidType,
		darkMode,
		colors,
		platformOS,
		isPreview
	}: {
		initialValue: string
		onValueChange: (value: string) => void
		placeholder: string
		dom: import("expo/dom").DOMProps
		type: NoteType
		readOnly: boolean
		onDidType: (value: string) => void
		darkMode: boolean
		colors: Colors
		platformOS: "ios" | "android" | "macos" | "windows" | "web"
		isPreview: boolean
	}) => {
		const editorRef = useRef<HTMLDivElement>(null)
		const quillRef = useRef<Quill | null>(null)
		const customThemeRef = useRef<QuillThemeCustomizer | null>(null)

		useEffect(() => {
			if (editorRef.current && !quillRef.current) {
				const quillOptions = {
					readOnly,
					modules: {
						toolbar:
							type === "checklist"
								? undefined
								: [
										[
											{
												header: [1, 2, 3, 4, 5, 6, false]
											}
										],
										["bold", "italic", "underline"],
										["code-block", "link", "blockquote"],
										[
											{
												list: "ordered"
											},
											{
												list: "bullet"
											},
											{
												list: "check"
											}
										],
										[
											{
												indent: "-1"
											},
											{
												indent: "+1"
											}
										],
										[
											{
												script: "sub"
											},
											{
												script: "super"
											}
										],
										[
											{
												direction: "rtl"
											}
										]
								  ]
					},
					placeholder,
					theme: "snow"
				}

				quillRef.current = new Quill(editorRef.current, quillOptions)

				const sanitized = DOMPurify.sanitize(initialValue, {
					ALLOWED_TAGS: [
						"p",
						"strong",
						"em",
						"u",
						"a",
						"h1",
						"h2",
						"h3",
						"h4",
						"h5",
						"h6",
						"code",
						"ol",
						"ul",
						"li",
						"blockquote",
						"pre",
						"br",
						"span",
						"div"
					],
					ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"]
				})

				DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
					if (node.tagName === "A" && node.getAttribute("href")) {
						node.setAttribute("target", "_blank")
						node.setAttribute("rel", "noopener noreferrer")
					}
				})

				quillRef.current.clipboard.dangerouslyPasteHTML(sanitized)

				quillRef.current.on("text-change", () => {
					if (quillRef.current) {
						const content = quillRef.current.root.innerHTML

						if (!content || content.length === 0) {
							return
						}

						onValueChange(content)
						onDidType(content)
					}
				})
			}
		}, [editorRef, placeholder, initialValue, onValueChange, type, readOnly, onDidType])

		useEffect(() => {
			if (!quillRef.current) {
				return
			}

			if (customThemeRef.current) {
				customThemeRef.current.removeExistingStyles()
			}

			customThemeRef.current = new QuillThemeCustomizer(
				getThemeOptions({
					darkMode,
					colors,
					platformOS,
					readOnly: readOnly || isPreview
				})
			)
			customThemeRef.current.apply(quillRef.current, editorRef.current?.id)
		}, [darkMode, colors, platformOS, readOnly, isPreview])

		return (
			<div className="quill-editor-container">
				<div
					ref={editorRef}
					className="quill-editor"
				/>
			</div>
		)
	}
)

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
