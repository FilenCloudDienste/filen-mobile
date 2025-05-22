import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Fragment } from "react"
import Container from "@/components/Container"
import Toolbar from "@/components/trackPlayer/toolbar"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function TrackPlayer() {
	const [isAuthed] = useIsAuthed()

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Fragment>
			<Container edges={["left", "right"]}>
				<Stack
					screenOptions={{
						headerShown: false,
						headerBlurEffect: "systemChromeMaterial"
					}}
				/>
			</Container>
			<Toolbar />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
