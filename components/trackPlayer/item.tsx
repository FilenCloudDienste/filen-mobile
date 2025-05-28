import { View, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { type Playlist, fetchPlaylists } from "@/queries/usePlaylistsQuery"
import { useMemo, memo, Fragment, useCallback } from "react"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { formatMessageDate } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Button } from "@/components/nativewindui/Button"
import { type TrackMetadata, trackPlayerService } from "@/lib/trackPlayer"
import mmkvInstance from "@/lib/mmkv"
import { Image } from "expo-image"
import { cn } from "@/lib/cn"
import { useActionSheet } from "@expo/react-native-action-sheet"
import alerts from "@/lib/alerts"
import useDimensions from "@/hooks/useDimensions"
import assets from "@/lib/assets"
import fullScreenLoadingModal from "../modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import { alertPrompt } from "../prompts/alertPrompt"
import { useTrackPlayerState } from "@/hooks/useTrackPlayerState"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"

const IMAGE_SIZE = 42

export const Item = memo(({ playlist }: { playlist: Playlist }) => {
	const { colors } = useColorScheme()
	const router = useRouter()
	const { playingTrack } = useTrackPlayerState()
	const { showActionSheetWithOptions } = useActionSheet()
	const {
		insets: { bottom: bottomInsets }
	} = useDimensions()
	const trackPlayerControls = useTrackPlayerControls()

	const playing = useMemo(() => {
		if (!playingTrack) {
			return false
		}

		return playingTrack.playlist === playlist.uuid
	}, [playingTrack, playlist.uuid])

	const playlistPictures = useMemo(() => {
		const pictures: string[] = []

		for (const file of playlist.files) {
			const metadata = mmkvInstance.getString(`trackPlayerFileMetadata:${file.uuid}`)
			const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

			if (metadataParsed?.picture) {
				pictures.push(metadataParsed.picture)
			}

			if (pictures.length >= 4) {
				break
			}
		}

		return pictures
	}, [playlist.files])

	const actionSheetOptions = useMemo(() => {
		const options = ["Play", "Add to queue", "Delete", "Cancel"]

		return {
			options,
			cancelIndex: options.length - 1,
			desctructiveIndex: [options.length - 2, options.length - 1],
			indexToType: {
				0: "play",
				1: "addToQueue",
				2: "delete"
			} as Record<number, "play" | "addToQueue" | "delete">
		}
	}, [])

	const play = useCallback(async () => {
		if (!playlist) {
			return
		}

		try {
			const silentSoundURI = assets.uri.audio.silent_1h()
			const audioImageFallbackURI = assets.uri.images.audio_fallback()

			if (!silentSoundURI || !audioImageFallbackURI) {
				return
			}

			await trackPlayerControls.setQueue({
				queue: playlist.files.map(file => {
					const metadata = mmkvInstance.getString(trackPlayerService.getTrackMetadataKeyFromUUID(file.uuid))
					const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

					return {
						id: file.uuid,
						url: silentSoundURI,
						title: metadataParsed?.title ?? file.name,
						artist: metadataParsed?.artist,
						album: metadataParsed?.album,
						artwork: metadataParsed?.picture ?? audioImageFallbackURI,
						file,
						playlist: playlist.uuid
					}
				}),
				autoPlay: true,
				startingTrackIndex: 0
			})

			await trackPlayerControls.play()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [trackPlayerControls, playlist])

	const addToQueue = useCallback(async () => {
		if (!playlist) {
			return
		}

		try {
			const silentSoundURI = assets.uri.audio.silent_1h()
			const audioImageFallbackURI = assets.uri.images.audio_fallback()

			if (!silentSoundURI || !audioImageFallbackURI) {
				return
			}

			await trackPlayerControls.setQueue({
				queue: [
					...(await trackPlayerControls.getQueue()),
					...playlist.files.map(file => {
						const metadata = mmkvInstance.getString(trackPlayerService.getTrackMetadataKeyFromUUID(file.uuid))
						const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

						return {
							id: file.uuid,
							url: silentSoundURI,
							title: metadataParsed?.title ?? file.name,
							artist: metadataParsed?.artist,
							album: metadataParsed?.album,
							artwork: metadataParsed?.picture ?? audioImageFallbackURI,
							file,
							playlist: playlist.uuid
						}
					})
				],
				autoPlay: false
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [trackPlayerControls, playlist])

	const deletePlaylist = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "deletePlaylist",
			message: "Are u sure"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			const playlists = await fetchPlaylists()
			const playlistToDelete = playlists.find(p => p.uuid === playlist.uuid)

			if (!playlistToDelete) {
				return
			}

			await nodeWorker.proxy("deleteFile", {
				uuid: playlistToDelete.fileUUID
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [playlist])

	const onDotsPress = useCallback(() => {
		showActionSheetWithOptions(
			{
				options: actionSheetOptions.options,
				cancelButtonIndex: actionSheetOptions.cancelIndex,
				destructiveButtonIndex: actionSheetOptions.desctructiveIndex,
				...(Platform.OS === "android"
					? {
							containerStyle: {
								paddingBottom: bottomInsets,
								backgroundColor: colors.card
							},
							textStyle: {
								color: colors.foreground
							}
					  }
					: {})
			},
			async (selectedIndex?: number) => {
				const type = actionSheetOptions.indexToType[selectedIndex ?? -1]

				try {
					switch (type) {
						case "play": {
							play()

							break
						}

						case "addToQueue": {
							await addToQueue()

							break
						}

						case "delete": {
							await deletePlaylist()

							break
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			}
		)
	}, [actionSheetOptions, colors, showActionSheetWithOptions, bottomInsets, play, deletePlaylist, addToQueue])

	return (
		<Button
			className="flex-row bg-card rounded-md px-3 py-2 gap-4 items-start"
			onPress={() => {
				router.push({
					pathname: "/trackPlayer/[playlist]",
					params: {
						playlist: playlist.uuid
					}
				})
			}}
			variant="plain"
			size="none"
			unstable_pressDelay={100}
		>
			<View className="flex-row items-center gap-3">
				{playlistPictures.length > 0 ? (
					<Fragment>
						{playlistPictures.length === 0 ? (
							<Image
								source={{
									uri: playlistPictures[0]
								}}
								contentFit="cover"
								style={{
									width: IMAGE_SIZE,
									height: IMAGE_SIZE,
									borderRadius: 6,
									backgroundColor: colors.card,
									borderWidth: playing ? 1 : 0,
									borderColor: playing ? colors.primary : "transparent"
								}}
							/>
						) : (
							<View
								className={cn(
									"flex-row flex-wrap bg-card rounded-md overflow-hidden",
									playing && "border-[1px] border-primary"
								)}
								style={{
									width: IMAGE_SIZE,
									height: IMAGE_SIZE
								}}
							>
								{playlistPictures.map((picture, index) => {
									return (
										<Image
											key={index}
											source={{
												uri: picture
											}}
											contentFit="cover"
											style={{
												width: IMAGE_SIZE / 2 - (playing ? 1 : 0),
												height: IMAGE_SIZE / 2 - (playing ? 1 : 0)
											}}
										/>
									)
								})}
								{new Array(4 - playlistPictures.length).fill(0).map((_, index) => {
									return (
										<View
											key={index}
											className="bg-muted flex-row items-center justify-center"
											style={{
												width: IMAGE_SIZE / 2 - (playing ? 1 : 0),
												height: IMAGE_SIZE / 2 - (playing ? 1 : 0)
											}}
										>
											<Icon
												name="music-note"
												size={IMAGE_SIZE / 2 / 1.75}
												color={colors.foreground}
											/>
										</View>
									)
								})}
							</View>
						)}
					</Fragment>
				) : (
					<View
						className={cn("bg-muted rounded-md items-center justify-center", playing && "border-[1px] border-primary")}
						style={{
							width: IMAGE_SIZE,
							height: IMAGE_SIZE
						}}
					>
						<Icon
							name="music-note"
							size={IMAGE_SIZE / 2}
							color={colors.foreground}
						/>
					</View>
				)}
			</View>
			<View className="flex-1 flex-row items-center gap-3">
				<View className="flex-col flex-1">
					<Text
						numberOfLines={2}
						ellipsizeMode="middle"
					>
						{playlist.name}
					</Text>
					<Text
						className="text-xs font-normal text-muted-foreground"
						numberOfLines={2}
						ellipsizeMode="middle"
					>
						{playlist.files.length} files, updated {formatMessageDate(playlist.updated)}
					</Text>
				</View>
				<Button
					className="flex-row items-center shrink-0 justify-center"
					size="icon"
					variant="plain"
					unstable_pressDelay={100}
					onPress={onDotsPress}
				>
					<Icon
						name="dots-horizontal"
						size={24}
						color={colors.foreground}
					/>
				</Button>
			</View>
		</Button>
	)
})

Item.displayName = "Item"

export default Item
