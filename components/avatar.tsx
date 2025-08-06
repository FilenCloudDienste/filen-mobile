import { memo, useCallback, useState, useMemo } from "react"
import { cn } from "@/lib/cn"
import TurboImage, { type Source, type Failure } from "react-native-turbo-image"
import { type StyleProp, type ImageStyle, type NativeSyntheticEvent } from "react-native"

export const Avatar = memo(({ source, style, className }: { source: Source; style?: StyleProp<ImageStyle>; className?: string }) => {
	const [fallback, setFallback] = useState<boolean>(false)

	const onFailure = useCallback(
		(_: NativeSyntheticEvent<Failure>) => {
			if (fallback) {
				return undefined
			}

			setFallback(true)
		},
		[fallback]
	)

	const classNameMemo = useMemo(() => {
		return cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)
	}, [className])

	const styleMemo = useMemo(() => {
		const styleObj = typeof style === "object" && style !== null ? style : {}

		const flatStyle = styleObj as unknown as {
			width?: number
			height?: number
		}

		const width = typeof flatStyle?.width === "number" ? flatStyle.width : 40
		const height = typeof flatStyle?.height === "number" ? flatStyle.height : 40

		return {
			...styleObj,
			borderRadius: 9999,
			width,
			height,
			aspectRatio: 1,
			display: "flex",
			overflow: "hidden",
			position: "relative",
			flexShrink: 0
		} satisfies StyleProp<ImageStyle>
	}, [style])

	const avatarSource = useMemo(() => {
		return (
			fallback || !source || typeof source.uri !== "string"
				? {
						uri: "avatar_fallback"
				  }
				: source
		) satisfies Source
	}, [fallback, source])

	return (
		<TurboImage
			className={classNameMemo}
			source={avatarSource}
			onFailure={onFailure}
			style={styleMemo}
			cachePolicy="dataCache"
		/>
	)
})

Avatar.displayName = "Avatar"

export default Avatar
