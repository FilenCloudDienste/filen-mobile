import { Image, type ImageSource, type ImageErrorEventData, type ImageStyle } from "expo-image"
import { memo, useCallback, useState, useMemo } from "react"
import { cn } from "@/lib/cn"

export const Avatar = memo(({ source, style, className }: { source: ImageSource; style: ImageStyle; className?: string }) => {
	const [fallback, setFallback] = useState<boolean>(false)

	const onError = useCallback((_: ImageErrorEventData) => {
		setFallback(true)
	}, [])

	const classNameMemo = useMemo(() => {
		return cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)
	}, [className])

	const styleMemo = useMemo(() => {
		return {
			...style,
			borderRadius: style.width ?? 9999,
			width: style.width ?? 40,
			height: style.height ?? 40,
			aspectRatio: 1,
			display: "flex",
			overflow: "hidden",
			position: "relative",
			flexShrink: 0
		} satisfies ImageStyle
	}, [style])

	const avatarSource = useMemo(() => {
		return fallback || !source || typeof source.uri !== "string"
			? {
					uri: "avatar_fallback"
			  }
			: source
	}, [fallback, source])

	const onErrorHandler = useMemo(() => {
		return fallback ? undefined : onError
	}, [fallback, onError])

	return (
		<Image
			className={classNameMemo}
			source={avatarSource}
			onError={onErrorHandler}
			style={styleMemo}
			cachePolicy="disk"
			priority="low"
		/>
	)
})

Avatar.displayName = "Avatar"

export default Avatar
