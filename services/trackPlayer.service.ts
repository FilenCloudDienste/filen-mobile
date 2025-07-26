import { type Playlist } from "@/queries/usePlaylistsQuery"
import { randomUUID } from "expo-crypto"
import events from "@/lib/events"

export type SelectTrackPlayerPlaylistsResponse =
	| {
			cancelled: false
			playlists: Playlist[]
	  }
	| {
			cancelled: true
	  }

export type SelectTrackPlayerPlaylistsParams = {
	max: number
	dismissHref?: string
}

export type SelectTrackPlayerPlaylistsEvent =
	| {
			type: "request"
			data: {
				id: string
			} & SelectTrackPlayerPlaylistsParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & SelectTrackPlayerPlaylistsResponse
	  }

export class TrackPlayerService {
	public async selectTrackPlayerPlaylists(params: SelectTrackPlayerPlaylistsParams): Promise<SelectTrackPlayerPlaylistsResponse> {
		return new Promise<SelectTrackPlayerPlaylistsResponse>(resolve => {
			const id = randomUUID()

			const sub = events.subscribe("selectTrackPlayerPlaylists", e => {
				if (e.type === "response" && e.data.id === id) {
					sub.remove()

					resolve(e.data)
				}
			})

			events.emit("selectTrackPlayerPlaylists", {
				type: "request",
				data: {
					...params,
					id
				}
			})
		})
	}
}

export const trackPlayerService = new TrackPlayerService()

export default trackPlayerService
