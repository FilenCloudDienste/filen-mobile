import { View, Platform } from "react-native"
import { type PlaylistFile, updatePlaylist, type Playlist } from "@/queries/usePlaylistsQuery"
import { memo, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/nativewindui/Button"
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
import { selectTrackPlayerPlaylists } from "@/app/selectTrackPlayerPlaylists"
import { ListItem, type ListRenderItemInfo } from "../../nativewindui/List"
import { Paths } from "expo-file-system/next"
import { normalizeFilePathForExpo } from "@/lib/utils"
import paths from "@/lib/paths"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	playlist: Playlist
	file: PlaylistFile
}

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export const Item = memo(({ info }: { info: ListRenderItemInfo<ListItemInfo> }) => {
	const { colors } = useColorScheme()
	const [trackPlayerFileMetadata] = useMMKVObject<TrackMetadata>(`trackPlayerFileMetadata:${info.item.file.uuid}`, mmkvInstance)
	const drag = useReorderableDrag()
	const { showActionSheetWithOptions } = useActionSheet()
	const {
		insets: { bottom: bottomInsets }
	} = useDimensions()
	const updatePlaylistRemoteMutex = useRef<Semaphore>(new Semaphore(1))
	const { playingTrack } = useTrackPlayerState()
	const trackPlayerControls = useTrackPlayerControls()

	const onPress = useCallback(async () => {
		try {
			const silentSoundURI = assets.uri.audio.silent_1h()
			const audioImageFallbackURI = assets.uri.images.audio_fallback()

			if (!silentSoundURI || !audioImageFallbackURI) {
				return
			}

			await trackPlayerControls.clear()
			await trackPlayerControls.setQueue({
				queue: info.item.playlist.files.map(file => {
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
						playlist: info.item.playlist.uuid
					}
				}),
				autoPlay: true,
				startingTrackIndex: info.index
			})

			await trackPlayerControls.play()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [trackPlayerControls, info.item.playlist, info.index])

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
			...info.item.playlist,
			files: info.item.playlist.files.filter(f => f.uuid !== info.item.file.uuid)
		} satisfies Playlist

		fullScreenLoadingModal.show()

		await updatePlaylistRemoteMutex.current.acquire()

		try {
			await updatePlaylist({
				...newPlaylist,
				updated: Date.now()
			})

			queryUtils.usePlaylistsQuerySet({
				updater: prev => prev.map(p => (p.uuid === info.item.playlist.uuid ? newPlaylist : p))
			})
		} finally {
			updatePlaylistRemoteMutex.current.release()

			fullScreenLoadingModal.hide()
		}
	}, [info.item.playlist, info.item.file.uuid])

	const addToQueue = useCallback(async () => {
		const silentSoundURI = assets.uri.audio.silent_1h()
		const audioImageFallbackURI = assets.uri.images.audio_fallback()

		if (!silentSoundURI || !audioImageFallbackURI) {
			return
		}

		const metadata = mmkvInstance.getString(trackPlayerService.getTrackMetadataKeyFromUUID(info.item.file.uuid))
		const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

		await trackPlayerControls.setQueue({
			queue: [
				...(await trackPlayerControls.getQueue()),
				...[
					{
						id: info.item.file.uuid,
						url: silentSoundURI,
						title: metadataParsed?.title ?? info.item.file.name,
						artist: metadataParsed?.artist,
						album: metadataParsed?.album,
						artwork: metadataParsed?.picture ?? audioImageFallbackURI,
						file: info.item.file,
						playlist: info.item.file.playlist
					}
				]
			],
			autoPlay: false
		})
	}, [info.item.file, trackPlayerControls])

	const addToPlaylist = useCallback(async () => {
		const selectTrackPlayerPlaylistsResponse = await selectTrackPlayerPlaylists({
			max: 9999,
			dismissHref: `/trackPlayer/${info.item.playlist.uuid}`
		})

		if (selectTrackPlayerPlaylistsResponse.cancelled || selectTrackPlayerPlaylistsResponse.playlists.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await Promise.all(
				selectTrackPlayerPlaylistsResponse.playlists.map(async selectedPlaylist => {
					if (selectedPlaylist.files.some(f => f.uuid === info.item.file.uuid)) {
						return
					}

					const newPlaylist = {
						...selectedPlaylist,
						updated: Date.now(),
						files: [...selectedPlaylist.files.filter(f => f.uuid !== info.item.file.uuid), info.item.file]
					} satisfies Playlist

					await updatePlaylist(newPlaylist)

					queryUtils.usePlaylistsQuerySet({
						updater: prev => [...prev.filter(p => p.uuid !== selectedPlaylist.uuid), newPlaylist]
					})
				})
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [info.item.file, info.item.playlist])

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
							await addToPlaylist()

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
	}, [actionSheetOptions, colors, showActionSheetWithOptions, bottomInsets, play, remove, addToQueue, addToPlaylist])

	const playing = useMemo(() => {
		if (!playingTrack) {
			return false
		}

		return playingTrack.file.uuid === info.item.file.uuid
	}, [playingTrack, info.item.file.uuid])

	const leftView = useMemo(() => {
		return (
			<View className="flex-row items-center px-4 gap-4">
				{trackPlayerFileMetadata?.picture ? (
					<Image
						source={{
							uri: normalizeFilePathForExpo(
								Paths.join(paths.trackPlayerPictures(), Paths.basename(trackPlayerFileMetadata.picture))
							)
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
			</View>
		)
	}, [trackPlayerFileMetadata?.picture, colors.card, colors.foreground, playing, colors.primary])

	const rightView = useMemo(() => {
		return (
			<View className="flex-row items-center px-4">
				<Button
					className="flex-row items-center  justify-center"
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
		)
	}, [colors.foreground, onDotsPress])

	return (
		<ListItem
			{...info}
			leftView={leftView}
			rightView={rightView}
			subTitleClassName="text-xs pt-1 font-normal"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			onPress={onPress}
			removeSeparator={Platform.OS === "android"}
			innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
			onLongPress={drag}
		/>
	)
})

Item.displayName = "Item"

export default Item
