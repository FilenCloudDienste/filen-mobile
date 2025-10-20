import { memo, useCallback, useMemo } from "react"
import { useSelectTrackPlayerPlaylistsStore } from "@/stores/selectTrackPlayerPlaylists.store"
import { Toolbar as ToolbarComponent, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import events from "@/lib/events"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useShallow } from "zustand/shallow"
import { translateMemoized, t } from "@/lib/i18n"
import usePlaylistsQuery, { type Playlist, updatePlaylist, playlistsQueryUpdate } from "@/queries/usePlaylists.query"
import { randomUUID } from "expo-crypto"

export const Toolbar = memo(() => {
	const { canGoBack, dismissTo, back } = useRouter()
	const selectedPlaylists = useSelectTrackPlayerPlaylistsStore(useShallow(state => state.selectedPlaylists))
	const { id, max, dismissHref } = useLocalSearchParams()

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
				? t("selectTrackPlayerPlaylists.selected", {
						countOrName: selectedPlaylists.at(0)?.name || ""
				  })
				: undefined
			: t("selectTrackPlayerPlaylists.selected", {
					countOrName: selectedPlaylists.length
			  })
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

		if (typeof dismissHref === "string") {
			dismissTo(dismissHref)
		} else {
			back()
		}
	}, [id, canSubmit, dismissTo, selectedPlaylists, dismissHref, back])

	const createPlaylist = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: translateMemoized("selectTrackPlayerPlaylists.prompts.createPlaylist.title"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: translateMemoized("selectTrackPlayerPlaylists.prompts.createPlaylist.placeholder")
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
			const { fileUuid } = await updatePlaylist(newPlaylist)

			playlistsQueryUpdate({
				updater: prev => [
					...prev.filter(p => p.uuid !== uuid),
					{
						...newPlaylist,
						fileUUID: fileUuid
					}
				]
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [playlists])

	const leftView = useMemo(() => {
		return (
			<ToolbarIcon
				icon={{
					name: "plus"
				}}
				onPress={createPlaylist}
			/>
		)
	}, [createPlaylist])

	const rightView = useMemo(() => {
		return (
			<ToolbarCTA
				disabled={!canSubmit}
				icon={{
					name: "check"
				}}
				onPress={submit}
			/>
		)
	}, [canSubmit, submit])

	return (
		<ToolbarComponent
			iosBlurIntensity={100}
			iosHint={iosHint}
			leftView={leftView}
			rightView={rightView}
		/>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
