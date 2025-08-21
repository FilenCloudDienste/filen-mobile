import TurboImage, { type Failure } from "react-native-turbo-image"
import { memo, useMemo, useState, useCallback, Fragment } from "react"
import { type GalleryItem } from "@/stores/gallery.store"
import { View, ActivityIndicator, type NativeSyntheticEvent } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import Animated, { FadeOut } from "react-native-reanimated"
import useHTTPServer from "@/hooks/useHTTPServer"
import { Icon } from "@roninoss/icons"
import { Text } from "@/components/nativewindui/Text"
import { cn } from "@/lib/cn"

export const Image = memo(
	({
		item,
		layout
	}: {
		item: GalleryItem
		layout: {
			width: number
			height: number
		}
	}) => {
		const [loading, setLoading] = useState<boolean>(true)
		const [error, setError] = useState<string | null>(null)
		const { colors, isDarkColorScheme } = useColorScheme()
		const httpServer = useHTTPServer()

		const style = useMemo(() => {
			return {
				width: layout.width,
				height: layout.height,
				flex: 1
			}
		}, [layout.width, layout.height])

		const source = useMemo(() => {
			if (item.itemType === "remoteItem") {
				return {
					uri: item.data.uri
				}
			}

			if (item.itemType === "cloudItem" && item.data.item.type === "file") {
				return {
					uri: `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
						btoa(
							JSON.stringify({
								mime: item.data.item.mime,
								size: item.data.item.size,
								uuid: item.data.item.uuid,
								bucket: item.data.item.bucket,
								key: item.data.item.key,
								version: item.data.item.version,
								chunks: item.data.item.chunks,
								region: item.data.item.region
							})
						)
					)}`
				}
			}

			return null
		}, [item, httpServer.port, httpServer.authToken])

		const onStart = useCallback(() => {
			setLoading(true)
		}, [])

		const onCompletion = useCallback(() => {
			setLoading(false)
		}, [])

		const onFailure = useCallback((e: NativeSyntheticEvent<Failure>) => {
			setLoading(false)
			setError(e.nativeEvent.error)
		}, [])

		return (
			<View
				className="flex-1"
				style={style}
			>
				{!source ? (
					<Animated.View
						exiting={FadeOut}
						className={cn(
							"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
							isDarkColorScheme ? "bg-black" : "bg-white"
						)}
						style={style}
					>
						<ActivityIndicator
							color={colors.foreground}
							size="small"
						/>
					</Animated.View>
				) : (
					<Fragment>
						{loading && !error && (
							<Animated.View
								exiting={FadeOut}
								className={cn(
									"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
									isDarkColorScheme ? "bg-black" : "bg-white"
								)}
								style={style}
							>
								<ActivityIndicator
									color={colors.foreground}
									size="small"
								/>
							</Animated.View>
						)}
						{error && (
							<Animated.View
								exiting={FadeOut}
								className={cn(
									"flex-1 absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center",
									isDarkColorScheme ? "bg-black" : "bg-white"
								)}
								style={style}
							>
								<Icon
									name="image-outline"
									size={64}
									color={colors.destructive}
								/>
								<Text className="text-muted-foreground text-sm text-center px-8 pt-2">{error}</Text>
							</Animated.View>
						)}
						{!error && (
							<TurboImage
								source={source}
								resizeMode="contain"
								cachePolicy="dataCache"
								style={style}
								onStart={onStart}
								onCompletion={onCompletion}
								onFailure={onFailure}
							/>
						)}
					</Fragment>
				)}
			</View>
		)
	}
)

Image.displayName = "Image"

export default Image
