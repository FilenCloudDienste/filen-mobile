import { View, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { type PlaylistFile, updatePlaylist, type Playlist } from "@/queries/usePlaylistsQuery"
import { memo, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/nativewindui/Button"
import { formatBytes } from "@/lib/utils"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { type TrackMetadata, trackPlayerService } from "@/lib/trackPlayer"
import alerts from "@/lib/alerts"
import assets from "@/lib/assets"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { Image } from "expo-image"
import { useReorderableDrag } from "react-native-reorderable-list"
import { useActionSheet } from "@expo/react-native-action-sheet"
import useDimensions from "@/hooks/useDimensions"
import Semaphore from "@/lib/semaphore"
import queryUtils from "@/queries/utils"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { cn } from "@/lib/cn"
import { useTrackPlayerState } from "@/hooks/useTrackPlayerState"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"

export const Item = memo(({ file, index, playlist }: { file: PlaylistFile; index: number; playlist: Playlist }) => {
	const { colors } = useColorScheme()
	const [trackPlayerFileMetadata] = useMMKVObject<TrackMetadata>(`trackPlayerFileMetadata:${file.uuid}`, mmkvInstance)
	const drag = useReorderableDrag()
	const { showActionSheetWithOptions } = useActionSheet()
	const {
		insets: { bottom: bottomInsets }
	} = useDimensions()
	const updatePlaylistRemoteMutex = useRef<Semaphore>(new Semaphore(1))
	const { playingTrack } = useTrackPlayerState()
	const trackPlayerControls = useTrackPlayerControls()

	const onPress = useCallback(async () => {
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
				autoPlay: true,
				startingTrackIndex: index
			})

			await trackPlayerControls.play()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [trackPlayerControls, playlist, index])

	const actionSheetOptions = useMemo(() => {
		const options = ["Play", "Add to playlist", "Add to queue", "Remove from playlist", "Cancel"]

		return {
			options,
			cancelIndex: options.length - 1,
			desctructiveIndex: [options.length - 2, options.length - 1],
			indexToType: {
				0: "play",
				1: "addToPlaylist",
				2: "addToQueue",
				3: "remove"
			} as Record<number, "play" | "addToPlaylist" | "addToQueue" | "remove">
		}
	}, [])

	const play = useCallback(() => {
		onPress()
	}, [onPress])

	const remove = useCallback(async () => {
		const newPlaylist = {
			...playlist,
			files: playlist.files.filter(f => f.uuid !== file.uuid)
		} satisfies Playlist

		fullScreenLoadingModal.show()

		await updatePlaylistRemoteMutex.current.acquire()

		try {
			await updatePlaylist({
				...newPlaylist,
				updated: Date.now()
			})

			queryUtils.usePlaylistsQuerySet({
				updater: prev => prev.map(p => (p.uuid === playlist.uuid ? newPlaylist : p))
			})
		} finally {
			updatePlaylistRemoteMutex.current.release()

			fullScreenLoadingModal.hide()
		}
	}, [playlist, file.uuid])

	const addToQueue = useCallback(async () => {
		const silentSoundURI = assets.uri.audio.silent_1h()
		const audioImageFallbackURI = assets.uri.images.audio_fallback()

		if (!silentSoundURI || !audioImageFallbackURI) {
			return
		}

		const metadata = mmkvInstance.getString(trackPlayerService.getTrackMetadataKeyFromUUID(file.uuid))
		const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

		await trackPlayerControls.setQueue({
			queue: [
				...(await trackPlayerControls.getQueue()),
				...[
					{
						id: file.uuid,
						url: silentSoundURI,
						title: metadataParsed?.title ?? file.name,
						artist: metadataParsed?.artist,
						album: metadataParsed?.album,
						artwork: metadataParsed?.picture ?? audioImageFallbackURI,
						file,
						playlist: file.playlist
					}
				]
			],
			autoPlay: false
		})
	}, [file, trackPlayerControls])

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

						case "addToPlaylist": {
							// TODO

							break
						}

						case "addToQueue": {
							await addToQueue()

							break
						}

						case "remove": {
							await remove()

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
	}, [actionSheetOptions, colors, showActionSheetWithOptions, bottomInsets, play, remove, addToQueue])

	const playing = useMemo(() => {
		if (!playingTrack) {
			return false
		}

		return playingTrack.file.uuid === file.uuid
	}, [playingTrack, file.uuid])

	return (
		<Button
			className="flex-row bg-card rounded-md px-3 py-2 gap-4 justify-between items-start mb-2"
			onPress={onPress}
			variant="plain"
			size="none"
			unstable_pressDelay={100}
			onLongPress={drag}
		>
			{trackPlayerFileMetadata?.picture ? (
				<Image
					source={{
						uri: trackPlayerFileMetadata.picture
					}}
					contentFit="cover"
					style={{
						width: 36,
						height: 36,
						borderRadius: 6,
						backgroundColor: colors.card,
						borderWidth: playing ? 1 : 0,
						borderColor: playing ? colors.primary : "transparent"
					}}
				/>
			) : (
				<View
					className={cn("bg-muted rounded-md items-center justify-center", playing && "border-[1px] border-primary")}
					style={{
						width: 36,
						height: 36
					}}
				>
					<Icon
						name="music-note"
						size={16}
						color={colors.foreground}
					/>
				</View>
			)}
			<View className="flex-col flex-1">
				<Text
					numberOfLines={2}
					ellipsizeMode="middle"
				>
					{trackPlayerFileMetadata?.title
						? `${trackPlayerFileMetadata.title}${trackPlayerFileMetadata.album ? ` - ${trackPlayerFileMetadata.album}` : ""}`
						: file.name}
				</Text>
				{trackPlayerFileMetadata?.title && (
					<Text
						className="text-sm font-normal text-muted-foreground"
						numberOfLines={2}
						ellipsizeMode="middle"
					>
						{file.name}
					</Text>
				)}
				<Text
					className="text-xs font-normal text-muted-foreground"
					numberOfLines={1}
					ellipsizeMode="middle"
				>
					{formatBytes(file.size)}
				</Text>
			</View>
			<Button
				className="flex-row items-center shrink-0 justify-center h-full"
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
		</Button>
	)
})

Item.displayName = "Item"

export default Item
