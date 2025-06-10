import { create } from "zustand"
import { type Playlist } from "@/queries/usePlaylistsQuery"

export type SelectTrackPlayerPlaylistsStore = {
	selectedPlaylists: Playlist[]
	setSelectedPlaylists: (fn: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void
}

export const useSelectTrackPlayerPlaylistsStore = create<SelectTrackPlayerPlaylistsStore>(set => ({
	selectedPlaylists: [],
	setSelectedPlaylists(fn) {
		set(state => ({
			selectedPlaylists: typeof fn === "function" ? fn(state.selectedPlaylists) : fn
		}))
	}
}))
