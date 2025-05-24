import { create } from "zustand"

export type TrackPlayerStore = {
	playlistsSearchTerm: string
	playlistSearchTerm: string
	loadingTrack: boolean
	setLoadingTrack: (fn: boolean | ((prev: boolean) => boolean)) => void
	setPlaylistsSearchTerm: (fn: string | ((prev: string) => string)) => void
	setPlaylistSearchTerm: (fn: string | ((prev: string) => string)) => void
}

export const useTrackPlayerStore = create<TrackPlayerStore>(set => ({
	playlistsSearchTerm: "",
	playlistSearchTerm: "",
	loadingTrack: false,
	setLoadingTrack(fn) {
		set(state => ({
			loadingTrack: typeof fn === "function" ? fn(state.loadingTrack) : fn
		}))
	},
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
