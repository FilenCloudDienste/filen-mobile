import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Fragment } from "react"
import Toolbar from "@/components/trackPlayer/toolbar"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"
import { SCREEN_OPTIONS } from "@/lib/constants"

export default function TrackPlayerLayout() {
	const [isAuthed] = useIsAuthed()

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Fragment>
			<Stack screenOptions={SCREEN_OPTIONS.base} />
			<Toolbar />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
