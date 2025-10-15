import type { View } from "react-native"
import { useState, useCallback, useLayoutEffect } from "react"

export default function useViewLayout(ref: React.RefObject<View | null>) {
	const [layout, setLayout] = useState<{
		width: number
		height: number
		x: number
		y: number
	}>({
		width: 0,
		height: 0,
		x: 0,
		y: 0
	})

	const onLayout = useCallback(() => {
		ref?.current?.measureInWindow?.((x, y, width, height) => {
			setLayout({
				width,
				height,
				x,
				y
			})
		})
	}, [ref])

	useLayoutEffect(() => {
		onLayout()
	}, [onLayout])

	return {
		layout,
		onLayout
	}
}
