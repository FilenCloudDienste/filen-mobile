import { View, Platform } from "react-native"
import { type Playlist, fetchPlaylists } from "@/queries/usePlaylistsQuery"
import { useMemo, memo, useCallback } from "react"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { useRouter } from "expo-router"
import { Button } from "@/components/nativewindui/Button"
import { type TrackMetadata, trackPlayer, TRACK_PLAYER_MMKV_PREFIX } from "@/lib/trackPlayer"
import mmkvInstance from "@/lib/mmkv"
import TurboImage from "react-native-turbo-image"
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
import events from "@/lib/events"
import { useSelectTrackPlayerPlaylistsStore } from "@/stores/selectTrackPlayerPlaylists.store"
import { useShallow } from "zustand/shallow"
import { Checkbox } from "../nativewindui/Checkbox"
import { type SelectTrackPlayerPlaylistsParams } from "@/services/trackPlayer.service"
import { ListItem, type ListRenderItemInfo } from "../nativewindui/List"
import { Paths } from "expo-file-system/next"
import { normalizeFilePathForExpo } from "@/lib/utils"
import paths from "@/lib/paths"
import { useTranslation } from "react-i18next"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	playlist: Playlist
}

export const IMAGE_SIZE = 42

export const LIST_ITEM_HEIGHT = Platform.select({
	ios: 61,
	default: 60
})

export const Item = memo(
	({
		info,
		fromSelect
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		fromSelect?: Omit<SelectTrackPlayerPlaylistsParams, "dismissHref">
	}) => {
		const { colors } = useColorScheme()
		const router = useRouter()
		const { playingTrack } = useTrackPlayerState()
		const { showActionSheetWithOptions } = useActionSheet()
		const {
			insets: { bottom: bottomInsets }
		} = useDimensions()
		const trackPlayerControls = useTrackPlayerControls()
		const isSelected = useSelectTrackPlayerPlaylistsStore(
			useShallow(state => state.selectedPlaylists.some(p => p.uuid === info.item.playlist.uuid))
		)
		const setSelectedPlaylists = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.setSelectedPlaylists))
		const selectedPlaylistsCount = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.selectedPlaylists.length))
		const { t } = useTranslation()

		const playing = useMemo(() => {
			if (!playingTrack || fromSelect) {
				return false
			}

			return playingTrack.playlist === info.item.playlist.uuid
		}, [playingTrack, info.item.playlist.uuid, fromSelect])

		const playlistPictures = useMemo(() => {
			const pictures: string[] = []

			for (const file of info.item.playlist.files) {
				try {
					const metadata = mmkvInstance.getString(`${TRACK_PLAYER_MMKV_PREFIX}trackPlayerFileMetadata:${file.uuid}`)
					const metadataParsed = metadata ? (JSON.parse(metadata) as TrackMetadata) : null

					if (metadataParsed?.picture) {
						pictures.push(
							normalizeFilePathForExpo(Paths.join(paths.trackPlayerPictures(), Paths.basename(metadataParsed.picture)))
						)
					}

					if (pictures.length >= 4) {
						break
					}
				} catch {
					continue
				}
			}

			return pictures
		}, [info.item.playlist.files])

		const actionSheetOptions = useMemo(() => {
			const options = [
				t("trackPlayer.item.menu.play"),
				t("trackPlayer.item.menu.addToQueue"),
				t("trackPlayer.item.menu.delete"),
				t("trackPlayer.item.menu.cancel")
			]

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
		}, [t])

		const play = useCallback(async () => {
			if (fromSelect) {
				return
			}

			try {
				const silentSoundURI = assets.uri.audio.silent()
				const audioImageFallbackURI = assets.uri.images.audio_fallback()

				if (!silentSoundURI || !audioImageFallbackURI) {
					return
				}

				await trackPlayerControls.clear()
				await trackPlayerControls.setQueue({
					queue: info.item.playlist.files.map(file => {
						const metadata = mmkvInstance.getString(trackPlayer.getTrackMetadataKeyFromUUID(file.uuid))
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
					startingTrackIndex: 0
				})

				await trackPlayerControls.play()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		}, [trackPlayerControls, info.item.playlist, fromSelect])

		const addToQueue = useCallback(async () => {
			if (fromSelect) {
				return
			}

			try {
				const silentSoundURI = assets.uri.audio.silent()
				const audioImageFallbackURI = assets.uri.images.audio_fallback()

				if (!silentSoundURI || !audioImageFallbackURI) {
					return
				}

				await trackPlayerControls.setQueue({
					queue: [
						...(await trackPlayerControls.getQueue()),
						...info.item.playlist.files.map(file => {
							const metadata = mmkvInstance.getString(trackPlayer.getTrackMetadataKeyFromUUID(file.uuid))
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
		}, [trackPlayerControls, info.item.playlist, fromSelect])

		const deletePlaylist = useCallback(async () => {
			if (fromSelect) {
				return
			}

			const alertPromptResponse = await alertPrompt({
				title: t("trackPlayer.prompts.deletePlaylist.title"),
				message: t("trackPlayer.prompts.deletePlaylist.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				const playlists = await fetchPlaylists()
				const playlistToDelete = playlists.find(p => p.uuid === info.item.playlist.uuid)

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
		}, [info.item.playlist, fromSelect, t])

		const onDotsPress = useCallback(() => {
			if (fromSelect) {
				return
			}

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
		}, [actionSheetOptions, colors, showActionSheetWithOptions, bottomInsets, play, deletePlaylist, addToQueue, fromSelect])

		const canSelect = useMemo(() => {
			if (isSelected) {
				return true
			}

			if (!fromSelect || selectedPlaylistsCount >= fromSelect.max) {
				return false
			}

			return true
		}, [fromSelect, selectedPlaylistsCount, isSelected])

		const select = useCallback(() => {
			if (!canSelect) {
				return
			}

			setSelectedPlaylists(prev =>
				isSelected
					? prev.filter(i => i.uuid !== info.item.playlist.uuid)
					: [...prev.filter(i => i.uuid !== info.item.playlist.uuid), info.item.playlist]
			)
		}, [setSelectedPlaylists, info.item.playlist, isSelected, canSelect])

		const onPress = useCallback(() => {
			if (fromSelect) {
				select()

				return
			}

			events.emit("hideSearchBar", {
				clearText: true
			})

			router.push({
				pathname: "/trackPlayer/[playlist]",
				params: {
					playlist: info.item.playlist.uuid
				}
			})
		}, [router, fromSelect, info.item.playlist, select])

		const leftView = useMemo(() => {
			return (
				<View className="flex-row items-center px-4 gap-4">
					{fromSelect && (
						<Checkbox
							checked={isSelected}
							hitSlop={15}
							onCheckedChange={select}
							disabled={!canSelect}
							className="shrink-0"
						/>
					)}
					{playlistPictures.length > 0 ? (
						<View
							className={cn("flex-row flex-wrap rounded-md overflow-hidden", playing && "border-[1px] border-primary")}
							style={{
								width: IMAGE_SIZE,
								height: IMAGE_SIZE
							}}
						>
							{playlistPictures.map((picture, index) => {
								return (
									<TurboImage
										key={index}
										source={{
											uri: picture
										}}
										resizeMode="cover"
										cachePolicy="dataCache"
										style={{
											width: IMAGE_SIZE / 2 - (playing ? 1 : 0),
											height: IMAGE_SIZE / 2 - (playing ? 1 : 0)
										}}
									/>
								)
							})}
							{4 - playlistPictures.length > 0 &&
								new Array(4 - playlistPictures.length).fill(0).map((_, index) => {
									return (
										<View
											key={index}
											className="bg-muted/30 flex-row items-center justify-center"
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
					) : (
						<View
							className={cn("bg-muted/30 rounded-md items-center justify-center", playing && "border-[1px] border-primary")}
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
			)
		}, [fromSelect, isSelected, select, canSelect, playlistPictures, playing, colors.foreground])

		const rightView = useMemo(() => {
			return (
				<View className="flex-row items-center px-4">
					{!fromSelect && (
						<Button
							className="flex-row items-center shrink-0 justify-center"
							size="icon"
							variant="plain"
							unstable_pressDelay={100}
							onPress={onDotsPress}
						>
							<Icon
								namingScheme="sfSymbol"
								name="ellipsis"
								size={24}
								color={colors.foreground}
							/>
						</Button>
					)}
				</View>
			)
		}, [fromSelect, onDotsPress, colors.foreground])

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
				innerClassName="ios:py-3 py-3 android:py-3"
				disabled={fromSelect && !canSelect}
				onLongPress={fromSelect ? onPress : onDotsPress}
			/>
		)
	}
)

Item.displayName = "Item"

export default Item
