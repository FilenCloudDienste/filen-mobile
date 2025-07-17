import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import Toolbar from "@/components/selectTrackPlayerPlaylists/toolbar"
import { Fragment } from "react"
import { SCREEN_OPTIONS } from "@/lib/constants"

export default function SelectTrackPlayerPlaylistsLayout() {
	const [isAuthed] = useIsAuthed()

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Fragment>
			<Stack screenOptions={SCREEN_OPTIONS.base} />
			<Toolbar />
		</Fragment>
	)
}
