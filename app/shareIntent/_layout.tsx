import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Fragment } from "react"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function ShareIntentLayout() {
	const [isAuthed] = useIsAuthed()

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Fragment>
			<Stack
				screenOptions={{
					headerShown: false,
					headerBlurEffect: "systemChromeMaterial"
				}}
			/>
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
