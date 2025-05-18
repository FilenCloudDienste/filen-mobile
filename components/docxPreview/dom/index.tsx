"use dom"

import { memo, useRef, useCallback, useEffect } from "react"
import { renderAsync } from "docx-preview"
import { Buffer } from "buffer"

const DOMComponent = memo(({ base64 }: { dom: import("expo/dom").DOMProps; base64: string }) => {
	const container = useRef<HTMLDivElement>(null)
	const didLoadRef = useRef<boolean>(false)

	const load = useCallback(async () => {
		if (!container.current || didLoadRef.current) {
			return
		}

		didLoadRef.current = true

		try {
			await renderAsync(Buffer.from(base64, "base64"), container.current, container.current, {
				ignoreHeight: false,
				ignoreWidth: false,
				ignoreFonts: false,
				breakPages: true,
				debug: false,
				experimental: true,
				inWrapper: false,
				trimXmlDeclaration: true,
				ignoreLastRenderedPageBreak: true,
				renderHeaders: true,
				renderFooters: true,
				renderFootnotes: true
			})
		} catch (e) {
			console.error(e)

			didLoadRef.current = false
		}
	}, [base64])

	useEffect(() => {
		load()
	}, [load])

	return (
		<div
			ref={container}
			style={{
				width: "auto",
				height: "auto",
				overflow: "auto"
			}}
		/>
	)
})

DOMComponent.displayName = "DOMComponent"

export default DOMComponent
