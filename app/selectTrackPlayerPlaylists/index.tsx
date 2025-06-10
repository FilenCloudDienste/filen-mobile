import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { type Playlist } from "@/queries/usePlaylistsQuery"
import SelectTrackPlayerPlaylistsComponent from "@/components/selectTrackPlayerPlaylists"

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
	dismissHref: string
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

export function selectTrackPlayerPlaylists(params: SelectTrackPlayerPlaylistsParams): Promise<SelectTrackPlayerPlaylistsResponse> {
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

export default function SelectTrackPlayerPlaylists() {
	return <SelectTrackPlayerPlaylistsComponent />
}
