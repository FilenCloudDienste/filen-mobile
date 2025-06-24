import PlaylistComponent from "@/components/trackPlayer/playlist"
import RequireInternet from "@/components/requireInternet"

export default function Playlist() {
	return (
		<RequireInternet>
			<PlaylistComponent />
		</RequireInternet>
	)
}
