import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import Toolbar from "@/components/selectDriveItems/toolbar"
import { Fragment } from "react"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export default function SelectDriveItemsLayout() {
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
			<Toolbar />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
