import { memo, Fragment, useCallback, useMemo, useEffect, useState, useRef } from "react"
import TurboImage, { type TurboImageProps } from "react-native-turbo-image"
import { ColoredFolderSVGIcon, FileNameToSVGIcon } from "@/assets/fileIcons"
import { useColorScheme } from "@/lib/useColorScheme"
import { normalizeFilePathForExpo } from "@/lib/utils"
import thumbnails from "@/lib/thumbnails"
import cache from "@/lib/cache"
import { View } from "react-native"

export const Thumbnail = memo(
	({
		item,
		size,
		imageClassName,
		imageCachePolicy = "dataCache",
		imageResizeMode = "contain",
		imageStyle,
		type = "drive",
		spacing = 0,
		queryParams
	}: {
		item: DriveCloudItem
		size: number
		imageClassName?: string
		imageCachePolicy?: TurboImageProps["cachePolicy"]
		imageResizeMode?: TurboImageProps["resizeMode"]
		imageStyle?: TurboImageProps["style"]
		type?: "drive" | "photos"
		spacing?: number
		queryParams?: FetchCloudItemsParams
	}) => {
		const lastItemUuidRef = useRef<string | null>(null)
		const { colors } = useColorScheme()
		const [localPath, setLocalPath] = useState<string | undefined>(item.thumbnail ?? cache.availableThumbnails.get(item.uuid))
		const abortControllerRef = useRef<AbortController | null>(null)

		// If the item changed, reset the local path (due to FlashList recycling items)
		if (lastItemUuidRef.current !== item.uuid) {
			lastItemUuidRef.current = item.uuid

			abortControllerRef.current?.abort()

			setLocalPath(item.thumbnail ?? cache.availableThumbnails.get(item.uuid))
		}

		const style = useMemo(
			() =>
				imageStyle ?? {
					width: size,
					height: size,
					backgroundColor: colors.background
				},
			[colors.background, size, imageStyle]
		)

		const source = useMemo(
			() => ({
				uri: localPath ? normalizeFilePathForExpo(localPath) : ""
			}),
			[localPath]
		)

		const generate = useCallback(() => {
			if (localPath || item.type !== "file" || !thumbnails.canGenerate(item.name)) {
				return
			}

			abortControllerRef.current?.abort()
			abortControllerRef.current = new AbortController()

			thumbnails
				.generate({
					item,
					queryParams,
					abortSignal: abortControllerRef.current.signal
				})
				.then(thumbnailPath => {
					// Item changed while we were generating the thumbnail
					if (lastItemUuidRef.current !== item.uuid) {
						return
					}

					setLocalPath(thumbnailPath)
				})
				.catch(() => {})
		}, [item, localPath, queryParams, setLocalPath])

		const onFailure = useCallback(async () => {
			setLocalPath(undefined)

			setTimeout(() => {
				generate()
			}, 100)
		}, [generate, setLocalPath])

		useEffect(() => {
			generate()
		}, [generate, item])

		useEffect(() => {
			return () => {
				abortControllerRef.current?.abort()
			}
		}, [])

		return item.type === "directory" ? (
			<ColoredFolderSVGIcon
				color={item.color}
				width={size}
				height={size}
			/>
		) : (
			<Fragment>
				{source.uri.length > 0 ? (
					<TurboImage
						key={`thumbnail-${item.uuid}-${source.uri}-${size}`}
						className={imageClassName}
						source={source}
						style={style}
						resizeMode={imageResizeMode}
						cachePolicy={imageCachePolicy}
						onFailure={onFailure}
					/>
				) : (
					<Fragment>
						{type === "drive" ? (
							<FileNameToSVGIcon
								name={item.name}
								width={size}
								height={size}
							/>
						) : (
							<View
								className="bg-card flex-row items-center justify-center"
								style={{
									width: size,
									height: size,
									marginRight: spacing,
									marginBottom: spacing
								}}
							>
								<FileNameToSVGIcon
									name={item.name}
									width={size / 2}
									height={size / 2}
								/>
							</View>
						)}
					</Fragment>
				)}
			</Fragment>
		)
	}
)

Thumbnail.displayName = "Thumbnail"

export default Thumbnail
