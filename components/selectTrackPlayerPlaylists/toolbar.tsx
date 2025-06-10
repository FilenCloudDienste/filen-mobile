import { memo, useCallback, useMemo } from "react"
import { useSelectTrackPlayerPlaylistsStore } from "@/stores/selectTrackPlayerPlaylists.store"
import { Toolbar as ToolbarComponent, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import events from "@/lib/events"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "react-i18next"
import usePlaylistsQuery, { type Playlist, updatePlaylist } from "@/queries/usePlaylistsQuery"
import { randomUUID } from "expo-crypto"
import queryUtils from "@/queries/utils"

export const Toolbar = memo(() => {
	const { canGoBack, dismissTo } = useRouter()
	const selectedPlaylists = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.selectedPlaylists))
	const { id, max, dismissHref } = useLocalSearchParams()
	const { t } = useTranslation()

	const playlistsQuery = usePlaylistsQuery({
		enabled: false
	})

	const playlists = useMemo(() => {
		if (playlistsQuery.status !== "success") {
			return []
		}

		return playlistsQuery.data
	}, [playlistsQuery.data, playlistsQuery.status])

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const canSubmit = useMemo(() => {
		return canGoBack() && selectedPlaylists.length > 0 && typeof id === "string" && maxParsed >= selectedPlaylists.length
	}, [canGoBack, selectedPlaylists, id, maxParsed])

	const iosHint = useMemo(() => {
		if (selectedPlaylists.length === 0) {
			return undefined
		}

		return selectedPlaylists.length === 1
			? selectedPlaylists.at(0)
				? `${selectedPlaylists.at(0)?.name} selected`
				: undefined
			: `${selectedPlaylists.length} selected`
	}, [selectedPlaylists])

	const submit = useCallback(() => {
		if (!canSubmit) {
			return
		}

		events.emit("selectTrackPlayerPlaylists", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: false,
				playlists: selectedPlaylists
			}
		})

		dismissTo(typeof dismissHref === "string" ? dismissHref : "/drive")
	}, [id, canSubmit, dismissTo, selectedPlaylists, dismissHref])

	const createPlaylist = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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

	return (
		<ToolbarComponent
			iosBlurIntensity={100}
			iosHint={iosHint}
			leftView={
				<ToolbarIcon
					icon={{
						name: "plus"
					}}
					onPress={createPlaylist}
				/>
			}
			rightView={
				<ToolbarCTA
					disabled={!canSubmit}
					icon={{
						name: "check-circle-outline"
					}}
					onPress={submit}
				/>
			}
		/>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
