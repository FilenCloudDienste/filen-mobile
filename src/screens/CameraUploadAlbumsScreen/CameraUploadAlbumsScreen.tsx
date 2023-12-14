import React, { useEffect, useState, memo, useCallback } from "react"
import { View, Text, Switch, Platform, ScrollView, ActivityIndicator } from "react-native"
import storage from "../../lib/storage"
import { useMMKVString, useMMKVNumber } from "react-native-mmkv"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButton } from "../SettingsScreen/SettingsScreen"
import { showToast } from "../../components/Toasts"
import { getColor } from "../../style/colors"
import * as MediaLibrary from "expo-media-library"
import { hasStoragePermissions, hasPhotoLibraryPermissions } from "../../lib/permissions"
import { Semaphore, promiseAllSettled } from "../../lib/helpers"
import pathModule from "path"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { getLastImageOfAlbum } from "../SelectMediaScreen/SelectMediaScreen"
import { Image } from "expo-image"

const fetchAssetsSemaphore = new Semaphore(3)

export interface CameraUploadAlbumsScreenProps {
	navigation: any
}

export interface Album {
	album: MediaLibrary.Album
	path: string
}

export interface AlbumItemProps {
	index: number
	darkMode: boolean
	album: Album
	hasPermissions: boolean
	excludedAlbums: Record<string, boolean>
	userId: number
}

export const AlbumItem = memo(({ index, darkMode, album, hasPermissions, excludedAlbums, userId }: AlbumItemProps) => {
	const [image, setImage] = useState<string>("")

	useEffect(() => {
		getLastImageOfAlbum(album.album)
			.then(uri => {
				if (typeof uri === "string" && uri.length > 0) {
					setImage(uri)
				}
			})
			.catch(console.error)
	}, [])

	return (
		<SettingsButton
			key={index.toString()}
			title={
				<View
					style={{
						flexDirection: "column",
						width: "100%"
					}}
				>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center"
						}}
					>
						{image.length > 0 ? (
							<Image
								source={{
									uri: image
								}}
								cachePolicy="memory-disk"
								style={{
									width: 30,
									height: 30,
									borderRadius: 5
								}}
							/>
						) : (
							<View
								style={{
									width: 30,
									height: 30,
									borderRadius: 5,
									backgroundColor: getColor(darkMode, "backgroundTertiary")
								}}
							/>
						)}
						<Text
							style={{
								color: getColor(darkMode, "textPrimary"),
								fontSize: 17,
								marginLeft: 10
							}}
							numberOfLines={1}
						>
							{album.album.title + " (" + album.album.assetCount + ")"}
						</Text>
					</View>
					{Platform.OS == "android" && typeof album.path == "string" && album.path.length > 0 && (
						<Text
							style={{
								color: "gray",
								marginTop: 5,
								fontSize: 14
							}}
						>
							{album.path.split("file://").join("")}
						</Text>
					)}
				</View>
			}
			rightComponent={
				<Switch
					trackColor={getColor(darkMode, "switchTrackColor")}
					thumbColor={
						typeof excludedAlbums[album.album.id] == "undefined"
							? getColor(darkMode, "switchThumbColorEnabled")
							: getColor(darkMode, "switchThumbColorDisabled")
					}
					ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
					disabled={!hasPermissions}
					onValueChange={(value): void => {
						const excluded = excludedAlbums

						if (value) {
							delete excluded[album.album.id]
						} else {
							excluded[album.album.id] = true
						}

						storage.set("cameraUploadExcludedAlbums:" + userId, JSON.stringify(excluded))
					}}
					value={typeof excludedAlbums[album.album.id] == "undefined"}
				/>
			}
		/>
	)
})

export const CameraUploadAlbumsScreen = memo(({ navigation }: CameraUploadAlbumsScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [cameraUploadExcludedAlbumns] = useMMKVString("cameraUploadExcludedAlbums:" + userId, storage)
	const [excludedAlbums, setExcludedAlbums] = useState<Record<string, boolean>>({})
	const [fetchedAlbums, setFetchedAlbums] = useState<Album[]>([])
	const [hasPermissions, setHasPermissions] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(true)

	const fetchAlbums = useCallback(() => {
		return new Promise<Album[]>((resolve, reject) => {
			MediaLibrary.getAlbumsAsync({
				includeSmartAlbums: true
			})
				.then(fetched => {
					const promises: Promise<void>[] = []
					const albums: Album[] = []

					for (let i = 0; i < fetched.length; i++) {
						promises.push(
							new Promise<void>((resolve, reject) => {
								fetchAssetsSemaphore.acquire().then(() => {
									if (fetched[i].assetCount <= 0) {
										fetchAssetsSemaphore.release()

										albums.push({
											album: fetched[i],
											path: ""
										})

										resolve()
									}

									MediaLibrary.getAssetsAsync({
										album: fetched[i],
										mediaType: [
											MediaLibrary.MediaType.video,
											MediaLibrary.MediaType.photo,
											MediaLibrary.MediaType.unknown
										],
										first: 64
									})
										.then(assets => {
											const paths = assets.assets
												.filter(asset => asset && typeof asset.filename === "string" && asset.filename.length > 0)
												.map(asset => asset.uri)

											const sorted =
												Platform.OS == "android"
													? paths.map(path => pathModule.dirname(path)).sort((a, b) => a.length - b.length)
													: paths

											fetchAssetsSemaphore.release()

											albums.push({
												album: fetched[i],
												path: sorted.length == 0 ? "" : sorted[0]
											})

											resolve()
										})
										.catch(err => {
											fetchAssetsSemaphore.release()

											reject(err)
										})
								})
							})
						)
					}

					promiseAllSettled(promises)
						.then(() => resolve(albums.sort((a, b) => b.album.assetCount - a.album.assetCount)))
						.catch(err => {
							showToast({ message: err.toString() })

							setLoading(false)

							console.log(err)
						})
				})
				.catch(reject)
		})
	}, [])

	useEffect(() => {
		try {
			setExcludedAlbums(JSON.parse(cameraUploadExcludedAlbumns || "{}"))
		} catch (e) {
			console.log(e)

			setExcludedAlbums({})
		}
	}, [cameraUploadExcludedAlbumns])

	useEffect(() => {
		Promise.all([hasStoragePermissions(true), hasPhotoLibraryPermissions(true)])
			.then(hasPermissions => {
				if (!hasPermissions[0] || !hasPermissions[1]) {
					setHasPermissions(false)
					setLoading(false)

					showToast({ message: i18n(storage.getString("lang"), "pleaseGrantPermission") })

					return
				}

				setLoading(true)
				setHasPermissions(true)

				fetchAlbums()
					.then(fetched => {
						setFetchedAlbums(fetched)
						setLoading(false)
					})
					.catch(err => {
						showToast({ message: err.toString() })

						setLoading(false)

						console.error(err)
					})
			})
			.catch(err => {
				showToast({ message: err.toString() })

				setLoading(false)
				setHasPermissions(false)

				console.error(err)
			})
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "cameraUpload")}
				middleText={i18n(lang, "albums")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				<SettingsGroup marginTop={5}>
					{loading ? (
						<View
							style={{
								padding: 15
							}}
						>
							<ActivityIndicator
								size="small"
								color={getColor(darkMode, "textPrimary")}
							/>
						</View>
					) : !hasPermissions ? (
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 17,
								fontWeight: "400",
								padding: 15
							}}
						>
							{i18n(lang, "pleaseGrantPermission")}
						</Text>
					) : fetchedAlbums.length > 0 ? (
						<>
							{fetchedAlbums.map((album, index) => {
								if (album.album.assetCount <= 0) {
									return null
								}

								return (
									<AlbumItem
										index={index}
										key={index}
										album={album}
										darkMode={darkMode}
										excludedAlbums={excludedAlbums}
										userId={userId}
										hasPermissions={hasPermissions}
									/>
								)
							})}
						</>
					) : (
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								padding: 10,
								fontSize: 17,
								fontWeight: "400"
							}}
						>
							{i18n(lang, "cameraUploadNoAlbumsFound")}
						</Text>
					)}
				</SettingsGroup>
				<View
					style={{
						height: 25
					}}
				/>
			</ScrollView>
		</>
	)
})
