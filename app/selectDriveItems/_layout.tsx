import { Stack, Redirect } from "expo-router"
import { View } from "react-native"
import useIsAuthed from "@/hooks/useIsAuthed"
import Toolbar from "@/components/selectDriveItems/toolbar"

export default function SelectDriveItemsLayout() {
	const [isAuthed] = useIsAuthed()

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<View className="flex-1">
			<Stack
				screenOptions={{
					headerShown: false,
					headerBlurEffect: "systemChromeMaterial"
				}}
			/>
			<Toolbar />
		</View>
	)
}
