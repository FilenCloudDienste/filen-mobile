import { memo, Fragment, useCallback, useMemo, useState, useEffect, useRef } from "react"
import { Image, type ImageContentFit, type ImageStyle } from "expo-image"
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
		imageCachePolicy = "none",
		imageContentFit = "contain",
		imageStyle,
		type = "drive",
		spacing = 0,
		queryParams
	}: {
		item: DriveCloudItem
		size: number
		imageClassName?: string
		imageCachePolicy?: "none" | "disk" | "memory" | "memory-disk" | null
		imageContentFit?: ImageContentFit
		imageStyle?: ImageStyle
		type?: "drive" | "photos"
		spacing?: number
		queryParams?: FetchCloudItemsParams
	}) => {
		const { colors } = useColorScheme()
		const [localPath, setLocalPath] = useState<string | undefined>(item.thumbnail ?? cache.availableThumbnails.get(item.uuid))
		const lastUUIDRef = useRef<string>(item.uuid)

		if (lastUUIDRef.current !== item.uuid) {
			lastUUIDRef.current = item.uuid

			setLocalPath(item.thumbnail)
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

			thumbnails
				.generate({
					item,
					queryParams
				})
				.then(thumbnailPath => setLocalPath(thumbnailPath))
				.catch(() => {})
		}, [item, localPath, queryParams])

		const onError = useCallback(async () => {
			setLocalPath(undefined)

			try {
				const thumbnailPath = await thumbnails.generate({
					item,
					queryParams
				})

				setLocalPath(thumbnailPath)
			} catch (e) {
				console.error(e)
			}
		}, [item, queryParams])

		useEffect(() => {
			generate()
		}, [generate, item])

		return item.type === "directory" ? (
			<ColoredFolderSVGIcon
				color={item.color}
				width={size}
				height={size}
			/>
		) : (
			<Fragment>
				{source.uri.length > 0 ? (
					<Image
						className={imageClassName}
						source={source}
						style={style}
						contentFit={imageContentFit}
						cachePolicy={imageCachePolicy}
						onError={onError}
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
