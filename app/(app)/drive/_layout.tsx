import { Stack } from "expo-router"

export default function DriveLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerBlurEffect: "systemChromeMaterial"
			}}
		/>
	)
}
