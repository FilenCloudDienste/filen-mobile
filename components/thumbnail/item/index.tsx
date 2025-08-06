import { memo, Fragment, useCallback, useMemo, useEffect } from "react"
import TurboImage, { type TurboImageProps } from "react-native-turbo-image"
import { ColoredFolderSVGIcon, FileNameToSVGIcon } from "@/assets/fileIcons"
import { useColorScheme } from "@/lib/useColorScheme"
import { normalizeFilePathForExpo } from "@/lib/utils"
import thumbnails from "@/lib/thumbnails"
import cache from "@/lib/cache"
import { View } from "react-native"
import { useRecyclingState } from "@shopify/flash-list"
import assets from "@/lib/assets"

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
		const { colors } = useColorScheme()
		const [localPath, setLocalPath] = useRecyclingState<string | undefined>(
			item.thumbnail ?? cache.availableThumbnails.get(item.uuid),
			[item.uuid]
		)

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
						className={imageClassName}
						source={source}
						style={style}
						resizeMode={imageResizeMode}
						cachePolicy={imageCachePolicy}
						onFailure={onFailure}
						placeholder={{
							blurhash: assets.blurhash.images.fallback
						}}
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
