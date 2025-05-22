import { create } from "zustand"

export type TrackPlayerStore = {
	playlistsSearchTerm: string
	playlistSearchTerm: string
	setPlaylistsSearchTerm: (fn: string | ((prev: string) => string)) => void
	setPlaylistSearchTerm: (fn: string | ((prev: string) => string)) => void
}

export const useTrackPlayerStore = create<TrackPlayerStore>(set => ({
	playlistsSearchTerm: "",
	playlistSearchTerm: "",
	setPlaylistsSearchTerm(fn) {
		set(state => ({
			playlistsSearchTerm: typeof fn === "function" ? fn(state.playlistsSearchTerm) : fn
		}))
	},
	setPlaylistSearchTerm(fn) {
		set(state => ({
			playlistSearchTerm: typeof fn === "function" ? fn(state.playlistSearchTerm) : fn
		}))
	}
}))
