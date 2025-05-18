import { Stack } from "expo-router"

export default function NotesLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerBlurEffect: "systemChromeMaterial"
			}}
		/>
	)
}
