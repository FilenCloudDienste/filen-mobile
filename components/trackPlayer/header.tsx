import { Platform, View } from "react-native"
import { type Playlist, usePlaylistsQuery, updatePlaylist } from "@/queries/usePlaylistsQuery"
import { useCallback, memo, useMemo } from "react"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { randomUUID } from "expo-crypto"
import queryUtils from "@/queries/utils"
import { useLocalSearchParams } from "expo-router"
import { selectDriveItems } from "@/app/selectDriveItems/[parent]"
import { type TrackMetadata, trackPlayerService } from "@/lib/trackPlayer"
import assets from "@/lib/assets"
import mmkvInstance from "@/lib/mmkv"
import { useShallow } from "zustand/shallow"
import { useTrackPlayerStore } from "@/stores/trackPlayer.store"
import { useTrackPlayerControls } from "@/hooks/useTrackPlayerControls"
import { REACT_NATIVE_AUDIO_PRO_SUPPORTED_EXTENSIONS } from "@/lib/constants"

export const Header = memo(() => {
	const { t } = useTranslation()
	const { colors } = useColorScheme()
	const { playlist: passedPlaylist } = useLocalSearchParams()
	const setPlaylistsSearchTerm = useTrackPlayerStore(useShallow(state => state.setPlaylistsSearchTerm))
	const setPlaylistSearchTerm = useTrackPlayerStore(useShallow(state => state.setPlaylistSearchTerm))
	const trackPlayerControls = useTrackPlayerControls()

	const playlistsQuery = usePlaylistsQuery({
		enabled: false
	})

	const playlists = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return []
		}

		return playlistsQuery.data
	}, [playlistsQuery.data, playlistsQuery.status])

	const playlist = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return null
		}

		return playlistsQuery.data.find(p => p.uuid === passedPlaylist) ?? null
	}, [playlistsQuery.data, playlistsQuery.status, passedPlaylist])

	const createPlaylist = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("trackPlayer.prompts.createPlaylist.title"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("trackPlayer.prompts.createPlaylist.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const title = inputPromptResponse.text.trim()

		if (
			title.length === 0 ||
			title.length > 255 ||
			playlists.some(playlist => playlist.name.toLowerCase().trim() === title.trim().toLowerCase())
		) {
			return
		}

		const uuid = randomUUID()
		const date = Date.now()
		const newPlaylist = {
			name: title,
			uuid,
			created: date,
			updated: date,
			files: []
		} satisfies Playlist

		fullScreenLoadingModal.show()

		try {
			await updatePlaylist(newPlaylist)

			queryUtils.usePlaylistsQuerySet({
				updater: prev => [...prev.filter(p => p.uuid !== uuid), newPlaylist]
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [t, playlists])

	const addTrackToPlaylist = useCallback(async () => {
		const playlist = playlists.find(playlist => playlist.uuid === passedPlaylist)

		if (!playlist) {
			return
		}

		const selectDriveItemsResponse = await selectDriveItems({
			type: "file",
			max: 9999,
			dismissHref: `/trackPlayer/${playlist.uuid}`,
			extensions: REACT_NATIVE_AUDIO_PRO_SUPPORTED_EXTENSIONS,
			toMove: playlist.files.map(file => file.uuid)
		})

		if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length === 0) {
			return
		}

		const newPlaylist = {
			...playlist,
			updated: Date.now(),
			files: [
				...playlist.files.filter(file => !selectDriveItemsResponse.items.some(item => item.uuid === file.uuid)),
				...selectDriveItemsResponse.items.map(item => ({
					uuid: item.uuid,
					name: item.name,
					mime: item.type === "file" ? item.mime : "",
					size: item.size,
					bucket: item.type === "file" ? item.bucket : "",
					key: item.type === "file" ? item.key : "",
					version: item.type === "file" ? item.version : 0,
					chunks: item.type === "file" ? item.chunks : 0,
					region: item.type === "file" ? item.region : "",
					playlist: playlist.uuid
				}))
			]
		} satisfies Playlist

		fullScreenLoadingModal.show()

		try {
			await updatePlaylist(newPlaylist)

			queryUtils.usePlaylistsQuerySet({
				updater: prev => [...prev.filter(p => p.uuid !== playlist.uuid), newPlaylist]
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [passedPlaylist, playlists])

	const playPlaylist = useCallback(async () => {
		if (!playlist || playlist.files.length === 0) {
			return
		}

		try {
			const silentSoundURI = assets.uri.audio.silent_1h()
			const audioImageFallbackURI = assets.uri.images.audio_fallback()

			if (!silentSoundURI || !audioImageFallbackURI) {
				return
			}

			await trackPlayerControls.clear()
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
	}, [playlist, trackPlayerControls])

	const rightView = useCallback(() => {
		if (playlist) {
			return (
				<View className="flex-row items-center">
					<Button
						variant="plain"
						size="icon"
						onPress={playPlaylist}
					>
						<Icon
							name="play-circle-outline"
							size={24}
							color={colors.primary}
						/>
					</Button>
					<Button
						variant="plain"
						size="icon"
						onPress={addTrackToPlaylist}
					>
						<Icon
							name="plus"
							size={24}
							color={colors.primary}
						/>
					</Button>
				</View>
			)
		}

		return (
			<Button
				variant="plain"
				size="icon"
				onPress={createPlaylist}
			>
				<Icon
					name="plus"
					size={24}
					color={colors.primary}
				/>
			</Button>
		)
	}, [playlist, playPlaylist, addTrackToPlaylist, createPlaylist, colors.primary])

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={playlist ? playlist.name : t("trackPlayer.header.title")}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={false}
				backVisible={playlist !== null}
				iosBackVisible={playlist !== null}
				iosBackButtonTitleVisible={false}
				backgroundColor={colors.card}
				rightView={rightView}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: text => {
						if (playlist) {
							setPlaylistSearchTerm(text)
						} else {
							setPlaylistsSearchTerm(text)
						}
					},
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		) : (
			<LargeTitleHeader
				title={playlist ? playlist.name : t("trackPlayer.header.title")}
				materialPreset="inline"
				backVisible={true}
				backgroundColor={colors.card}
				rightView={rightView}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: text => {
						if (playlist) {
							setPlaylistSearchTerm(text)
						} else {
							setPlaylistsSearchTerm(text)
						}
					},
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		)
	}, [playlist, colors.card, rightView, setPlaylistSearchTerm, setPlaylistsSearchTerm, t])

	return header
})

Header.displayName = "Header"

export default Header
