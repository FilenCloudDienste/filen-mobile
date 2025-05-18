import { Stack } from "expo-router"

export default function ChatsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerBlurEffect: "systemChromeMaterial"
			}}
		/>
	)
}
