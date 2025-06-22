import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Platform } from "react-native"

export default function AuthLayout() {
	const [isAuthed] = useIsAuthed()

	if (isAuthed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				headerBlurEffect: "systemChromeMaterial"
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: false,
					headerBlurEffect: "systemChromeMaterial"
				}}
			/>
			<Stack.Screen
				name="login"
				options={{
					headerShown: Platform.OS === "ios",
					headerBlurEffect: "systemChromeMaterial",
					presentation: "modal",
					animation: "slide_from_bottom"
				}}
			/>
			<Stack.Screen
				name="register"
				options={{
					headerShown: Platform.OS === "ios",
					headerBlurEffect: "systemChromeMaterial",
					presentation: "modal",
					animation: "slide_from_bottom"
				}}
			/>
		</Stack>
	)
}
