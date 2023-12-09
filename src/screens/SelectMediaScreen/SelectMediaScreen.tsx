import React, { useEffect, useState, useRef, memo, useCallback, useMemo } from "react"
import { NavigationContainerRef, NavigationState } from "@react-navigation/native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import {
	useWindowDimensions,
	View,
	Text,
	TouchableHighlight,
	TouchableOpacity,
	Pressable,
	Image,
	DeviceEventEmitter,
	ScrollView
} from "react-native"
import { getColor } from "../../style"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { i18n } from "../../i18n"
import * as MediaLibrary from "expo-media-library"
import { CommonActions } from "@react-navigation/native"
import { navigationAnimation } from "../../lib/state"
import { getFileExt, getFilePreviewType, Semaphore, msToMinutesAndSeconds, getParent, toExpoFsPath } from "../../lib/helpers"
import Ionicon from "@expo/vector-icons/Ionicons"
import * as VideoThumbnails from "expo-video-thumbnails"
import { StackActions } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIsFocused } from "@react-navigation/native"
import { showToast } from "../../components/Toasts"
import { getAssetURI } from "../../lib/services/cameraUpload"
import * as fs from "../../lib/fs"
import { FlashList } from "@shopify/flash-list"
import storage from "../../lib/storage"

const videoThumbnailSemaphore = new Semaphore(8)
const ALBUM_ROW_HEIGHT = 70
const FETCH_ASSETS_LIMIT = 256

const createdVideoThumbnails: Record<string, string> = {}

export const fetchAssets = async (
	album: MediaLibrary.Album | "allAssetsCombined",
	count: number,
	after: MediaLibrary.AssetRef | undefined
): Promise<{ hasNextPage: boolean; assets: Asset[] }> => {
	const fetched = await MediaLibrary.getAssetsAsync({
		...(typeof after !== "undefined" ? { after } : {}),
		first: count,
		mediaType: [MediaLibrary.MediaType.video, MediaLibrary.MediaType.photo, MediaLibrary.MediaType.unknown],
		sortBy: [[MediaLibrary.SortBy.creationTime, false]],
		...(album !== "allAssetsCombined" ? { album } : {})
	})

	const sorted: Asset[] = fetched.assets
		.filter(asset => asset && typeof asset.filename === "string" && asset.filename.length > 0)
		.map(asset => ({
			selected: false,
			asset,
			type: getFilePreviewType(getFileExt(asset.filename))
		}))

	return {
		assets: sorted,
		hasNextPage: sorted.length > 0 ? fetched.hasNextPage : false
	}
}

export const getVideoThumbnail = async (asset: MediaLibrary.Asset): Promise<string> => {
	await videoThumbnailSemaphore.acquire()

	try {
		const assetURI = await getAssetURI(asset)
		const { uri } = await VideoThumbnails.getThumbnailAsync(toExpoFsPath(assetURI), {
			quality: 0.1
		})

		createdVideoThumbnails[uri] = uri

		videoThumbnailSemaphore.release()

		return uri
	} catch (e) {
		console.error(e)

		videoThumbnailSemaphore.release()

		throw e
	}
}

export const getLastImageOfAlbum = async (album: MediaLibrary.Album): Promise<string> => {
	const result = await MediaLibrary.getAssetsAsync({
		first: 64,
		mediaType: ["photo", "video", "unknown"],
		sortBy: [[MediaLibrary.SortBy.creationTime, false]],
		album
	})

	if (!result) {
		throw new Error("Could not fetch assets")
	}

	if (result.assets.length === 0) {
		return ""
	}

	const filtered = result.assets
		.filter(asset => asset && typeof asset.filename === "string" && asset.filename.length > 0)
		.sort((a, b) => b.creationTime - a.creationTime)

	if (filtered.length === 0) {
		return ""
	}

	const asset = filtered[0]

	if (getFilePreviewType(getFileExt(asset.filename)) === "video") {
		try {
			const uri = await getVideoThumbnail(asset)

			return uri
		} catch (e) {
			console.error(e)

			return ""
		}
	}

	return asset.uri
}

export const fetchAlbums = async (): Promise<Album[]> => {
	const result: Album[] = []

	const albums = await MediaLibrary.getAlbumsAsync({
		includeSmartAlbums: true
	})

	if (!albums) {
		throw new Error("Could not fetch albums")
	}

	for (let i = 0; i < albums.length; i++) {
		if (albums[i].assetCount > 0) {
			result.push({
				title: albums[i].title,
				assetCount: albums[i].assetCount,
				lastImage: undefined,
				album: albums[i]
			})
		}
	}

	return result.sort((a, b) => b.assetCount - a.assetCount)
}

export const AssetItem = memo(
	({
		item,
		setAssets,
		containerWidth
	}: {
		item: Asset
		setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
		containerWidth: number
	}) => {
		const darkMode = useDarkMode()
		const [image, setImage] = useState<string | undefined>(item.type == "image" ? item.asset.uri : undefined)
		const insets = useSafeAreaInsets()
		const init = useRef<boolean>(false)

		const size = useMemo(() => {
			return Math.floor((containerWidth - insets.left - insets.right) / 4) - 2
		}, [containerWidth, insets])

		useEffect(() => {
			if (item.type === "video" && !init.current) {
				init.current = true

				getVideoThumbnail(item.asset)
					.then(uri => {
						videoThumbnailSemaphore.release()

						setImage(uri)
					})
					.catch(err => {
						videoThumbnailSemaphore.release()

						console.error(err)
					})
			}
		}, [])

		return (
			<Pressable
				style={{
					width: size,
					height: size,
					margin: 1
				}}
				key={item.asset.id}
				onPress={() => {
					if (typeof image == "undefined") {
						return
					}

					setAssets(prev =>
						prev.map(asset => {
							if (asset.asset.id == item.asset.id) {
								return {
									...asset,
									selected: !asset.selected
								}
							}

							return asset
						})
					)
				}}
			>
				{typeof image == "undefined" ? (
					<View
						style={{
							width: size,
							height: size,
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
					/>
				) : (
					<Image
						source={{
							uri: encodeURI(item.asset.uri)
						}}
						style={{
							width: size,
							height: size
						}}
					/>
				)}
				{typeof item.selected == "boolean" && item.selected && (
					<>
						<Ionicon
							name="checkmark-circle"
							size={18}
							color="#0A84FF"
							style={{
								position: "absolute",
								bottom: 2.5,
								right: 2.8,
								zIndex: 100
							}}
						/>
						<View
							style={{
								position: "absolute",
								bottom: 3,
								right: 3,
								width: 19,
								height: 19,
								borderRadius: 19,
								zIndex: 10,
								backgroundColor: "white"
							}}
						/>
					</>
				)}
				{item.type == "video" && (
					<>
						<View
							style={{
								position: "absolute",
								left: 3,
								top: 3,
								width: "auto",
								height: "auto",
								borderRadius: 19,
								padding: 3,
								zIndex: 10
							}}
						>
							<Text
								style={{
									color: "white",
									fontSize: 12,
									fontWeight: "700"
								}}
							>
								{msToMinutesAndSeconds(item.asset.duration * 1000)}
							</Text>
						</View>
					</>
				)}
			</Pressable>
		)
	}
)

export interface AlbumItemProps {
	darkMode: boolean
	item: Album
	params: SelectMediaScreenParams
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const AlbumItem = memo(({ darkMode, item, params, navigation }: AlbumItemProps) => {
	const [image, setImage] = useState<string>("")
	const init = useRef<boolean>(false)

	useEffect(() => {
		if (!init.current) {
			init.current = true

			getLastImageOfAlbum(item.album)
				.then(uri => {
					if (uri.length > 0) {
						setImage(uri)
					}
				})
				.catch(err => {
					console.error(err)

					showToast({ message: err.toString() })
				})
		}
	}, [])

	return (
		<TouchableHighlight
			style={{
				width: "100%",
				height: ALBUM_ROW_HEIGHT,
				flexDirection: "row",
				justifyContent: "space-between",
				paddingLeft: 15,
				paddingRight: 15,
				borderBottomWidth: 0.5,
				borderBottomColor: getColor(darkMode, "primaryBorder")
			}}
			underlayColor={getColor(darkMode, "backgroundTertiary")}
			onPress={() => {
				if (typeof params.prevNavigationState !== "undefined" && item.assetCount > 0) {
					navigationAnimation({ enable: true }).then(() => {
						navigation.dispatch(
							StackActions.push("SelectMediaScreen", {
								prevNavigationState: params.prevNavigationState,
								album: item.album
							})
						)
					})
				}
			}}
		>
			<>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center"
					}}
				>
					{image.length > 0 ? (
						<Image
							source={{
								uri: encodeURI(image)
							}}
							style={{
								width: 50,
								height: 50,
								borderRadius: 5
							}}
						/>
					) : (
						<View
							style={{
								width: 50,
								height: 50,
								borderRadius: 5,
								backgroundColor: getColor(darkMode, "backgroundSecondary")
							}}
						/>
					)}
					<View
						style={{
							flexDirection: "column",
							marginLeft: 10
						}}
					>
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 16,
								fontWeight: "400"
							}}
						>
							{item.title}
						</Text>
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 14,
								fontWeight: "400",
								marginTop: 2
							}}
						>
							{item.assetCount}
						</Text>
					</View>
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<Ionicon
						name="chevron-forward-outline"
						size={18}
						color={getColor(darkMode, "textSecondary")}
					/>
				</View>
			</>
		</TouchableHighlight>
	)
})

export interface SelectMediaScreenParams {
	prevNavigationState: NavigationState
	album: MediaLibrary.Album | "allAssetsCombined" | undefined
}

export interface SelectMediaScreenProps {
	route: any
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export interface Album {
	title: string
	assetCount: number
	lastImage: string | undefined
	album: MediaLibrary.Album
}

export interface Asset {
	selected: boolean
	type: ReturnType<typeof getFilePreviewType>
	asset: MediaLibrary.Asset
}

const SelectMediaScreen = memo(({ route, navigation }: SelectMediaScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const dimensions = useWindowDimensions()
	const params = useRef<SelectMediaScreenParams>(route?.params || undefined).current
	const [assets, setAssets] = useState<Asset[]>([])
	const [albums, setAlbums] = useState<Album[]>([])
	const insets = useSafeAreaInsets()
	const isFocused = useIsFocused()
	const currentAssetsAfter = useRef<MediaLibrary.AssetRef | undefined>(undefined)
	const assetsHasNextPage = useRef<boolean>(true)
	const onEndReachedCalledDuringMomentum = useRef<boolean>(false)
	const canPaginate = useRef<boolean>(true)
	const [containerWidth, setContainerWidth] = useState<number>(dimensions.width)

	const [selectedAssets, photoCount, videoCount] = useMemo(() => {
		const selectedAssets = assets.filter(asset => asset.selected)
		const photoCount = assets.filter(asset => getFilePreviewType(getFileExt(asset.asset.filename)) == "image").length
		const videoCount = assets.filter(asset => getFilePreviewType(getFileExt(asset.asset.filename)) == "video").length

		return [selectedAssets, photoCount, videoCount]
	}, [assets])

	const estimatedItemSize = useMemo(() => {
		return Math.floor((containerWidth - insets.left - insets.right) / 4) - 2
	}, [insets, containerWidth])

	const renderAsset = useCallback(
		({ item }: { item: Asset }) => {
			return (
				<AssetItem
					item={item}
					setAssets={setAssets}
					containerWidth={containerWidth}
				/>
			)
		},
		[containerWidth]
	)

	useEffect(() => {
		if (typeof params !== "undefined" && isFocused) {
			if (typeof params.album == "undefined") {
				fetchAlbums()
					.then(fetched => {
						setAlbums(fetched)
					})
					.catch(err => {
						console.error(err)

						showToast({ message: err.toString() })
					})
			} else {
				fetchAssets(params.album, FETCH_ASSETS_LIMIT, currentAssetsAfter.current)
					.then(fetched => {
						if (fetched.assets.length > 0) {
							currentAssetsAfter.current = fetched.assets[fetched.assets.length - 1].asset

							setAssets(
								fetched.assets.filter(asset => typeof asset.asset.filename === "string" && asset.asset.filename.length > 0)
							)
						}

						assetsHasNextPage.current = fetched.hasNextPage
					})
					.catch(err => {
						console.error(err)

						showToast({ message: err.toString() })
					})
			}
		}

		return () => {
			if (typeof params.album == "undefined") {
				for (const uri in createdVideoThumbnails) {
					fs.stat(uri)
						.then(stat => {
							if (stat.exists) {
								fs.unlink(uri)
									.then(() => {
										delete createdVideoThumbnails[uri]
									})
									.catch(err => {
										console.error(err)

										delete createdVideoThumbnails[uri]
									})
							}
						})
						.catch(console.error)
				}
			}
		}
	}, [params])

	if (typeof params == "undefined") {
		return (
			<>
				<DefaultTopBar
					onPressBack={() => {
						storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)
						navigation.goBack()
					}}
					leftText={i18n(lang, "back")}
					middleText={"Error"}
				/>
			</>
		)
	}

	return (
		<View
			style={{
				paddingTop: 15,
				paddingBottom: insets.bottom,
				paddingLeft: insets.left,
				paddingRight: insets.right,
				height: "100%",
				width: "100%"
			}}
			onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
		>
			{typeof route.params.album == "undefined" ? (
				<>
					<DefaultTopBar
						onPressBack={() => {
							if (typeof params.prevNavigationState !== "undefined") {
								storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)

								navigationAnimation({ enable: true }).then(() => {
									const newRoutes = [
										...params.prevNavigationState.routes.map(route => ({
											name: route.name,
											params: route.params
										})),
										...[
											{
												name: "SelectMediaScreen",
												params: {
													prevNavigationState: params.prevNavigationState,
													album: undefined
												}
											}
										]
									]

									navigation.dispatch(
										CommonActions.reset({
											index: newRoutes.length - 1,
											routes: newRoutes
										})
									)
								})
							}
						}}
						leftText={i18n(lang, "back")}
						middleText={i18n(lang, "albums")}
						hideLeftComponent={true}
						rightComponent={
							<TouchableOpacity
								style={{
									width: "33%",
									justifyContent: "center",
									alignItems: "flex-end",
									paddingRight: 15
								}}
								hitSlop={{
									top: 15,
									bottom: 15,
									right: 15,
									left: 15
								}}
								onPress={() => {
									storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)
									navigation.goBack()
								}}
							>
								<Text
									style={{
										color: getColor(darkMode, "linkPrimary"),
										fontSize: 17,
										fontWeight: "400"
									}}
								>
									{i18n(lang, "cancel")}
								</Text>
							</TouchableOpacity>
						}
					/>
					<ScrollView
						style={{
							height: "100%",
							width: "100%",
							marginTop: 10
						}}
					>
						{albums.map((album, index) => {
							return (
								<AlbumItem
									key={album.album.id}
									item={album}
									darkMode={darkMode}
									navigation={navigation}
									params={params}
								/>
							)
						})}
					</ScrollView>
				</>
			) : (
				<>
					<DefaultTopBar
						onPressBack={() => {
							storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)
							navigation.goBack()
						}}
						leftText={i18n(lang, "albums")}
						middleText={i18n(lang, "select")}
						rightComponent={
							selectedAssets.length > 0 ? (
								<TouchableOpacity
									style={{
										width: "33%",
										justifyContent: "center",
										alignItems: "flex-end",
										paddingRight: 15
									}}
									hitSlop={{
										top: 15,
										bottom: 15,
										right: 15,
										left: 15
									}}
									onPress={() => {
										if (typeof params.prevNavigationState !== "undefined") {
											storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)

											DeviceEventEmitter.emit("selectMediaScreenUpload", {
												assets: selectedAssets,
												parent: getParent(
													params.prevNavigationState.routes[params.prevNavigationState.routes.length - 1]
												)
											})

											navigation.dispatch(StackActions.pop(2))
										}
									}}
								>
									<Text
										style={{
											color: getColor(darkMode, "linkPrimary"),
											fontSize: 17,
											fontWeight: "400"
										}}
									>
										{i18n(lang, "upload")} ({selectedAssets.length})
									</Text>
								</TouchableOpacity>
							) : (
								<TouchableOpacity
									style={{
										width: "33%",
										justifyContent: "center",
										alignItems: "flex-end",
										paddingRight: 15
									}}
									onPress={() => {
										storage.set("lastBiometricScreen:" + storage.getNumber("userId"), Date.now() - 5000)

										navigation.dispatch(StackActions.pop(2))
									}}
								>
									<Text
										style={{
											color: getColor(darkMode, "linkPrimary"),
											fontSize: 17,
											fontWeight: "400"
										}}
									>
										{i18n(lang, "cancel")}
									</Text>
								</TouchableOpacity>
							)
						}
					/>
					<View
						style={{
							marginTop: 10,
							width: "100%",
							height: "100%",
							paddingBottom: insets.bottom + 5
						}}
					>
						<FlashList
							data={assets}
							renderItem={renderAsset}
							keyExtractor={item => item.asset.id}
							onMomentumScrollBegin={() => (onEndReachedCalledDuringMomentum.current = false)}
							onEndReachedThreshold={0.1}
							estimatedItemSize={estimatedItemSize}
							onEndReached={() => {
								if (
									assets.length > 0 &&
									!onEndReachedCalledDuringMomentum.current &&
									typeof params !== "undefined" &&
									typeof params.album !== "undefined" &&
									assetsHasNextPage.current &&
									canPaginate.current
								) {
									onEndReachedCalledDuringMomentum.current = true
									canPaginate.current = false

									fetchAssets(params.album, FETCH_ASSETS_LIMIT, currentAssetsAfter.current)
										.then(fetched => {
											if (fetched.assets.length > 0) {
												currentAssetsAfter.current = fetched.assets[fetched.assets.length - 1].asset

												setAssets(prev => {
													const existingIds: Record<string, boolean> = {}

													for (let i = 0; i < prev.length; i++) {
														existingIds[prev[i].asset.id] = true
													}

													return [
														...prev,
														...fetched.assets.filter(
															asset =>
																!existingIds[asset.asset.id] &&
																typeof asset.asset.filename === "string" &&
																asset.asset.filename.length > 0
														)
													]
												})
											}

											assetsHasNextPage.current = fetched.hasNextPage
											canPaginate.current = true
										})
										.catch(err => {
											console.error(err)

											showToast({ message: err.toString() })

											canPaginate.current = true
										})
								}
							}}
							numColumns={4}
							ListFooterComponent={
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "center",
										width: "100%",
										height: "auto",
										marginTop: 10
									}}
								>
									<Text
										style={{
											color: getColor(darkMode, "textSecondary"),
											fontSize: 15,
											fontWeight: "400"
										}}
									>
										{photoCount} {i18n(lang, "photos")}, {videoCount} {i18n(lang, "videos")}
									</Text>
								</View>
							}
						/>
					</View>
				</>
			)}
		</View>
	)
})

export default SelectMediaScreen
