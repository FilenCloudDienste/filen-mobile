import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Platform, View } from "react-native"
import useLockOrientation from "@/hooks/useLockOrientation"
import { SCREEN_OPTIONS } from "@/lib/constants"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"

const screenOptions = {
	headerShown: Platform.OS === "ios",
	headerBlurEffect: "systemChromeMaterial",
	presentation: "modal",
	animation: "slide_from_bottom"
} satisfies NonNullable<React.ComponentPropsWithoutRef<typeof Stack.Screen>["options"]>

export default function AuthLayout() {
	useLockOrientation()

	const [isAuthed] = useIsAuthed()
	const [initialRouteName] = useMMKVString("initialRouteName", mmkvInstance)

	if (isAuthed) {
		return <Redirect href={`/(app)/${initialRouteName ?? "home"}`} />
	}

	return (
		<View
			testID="screen.auth"
			className="flex-1"
		>
			<Stack screenOptions={SCREEN_OPTIONS.base}>
				<Stack.Screen
					name="index"
					options={SCREEN_OPTIONS.base}
				/>
				<Stack.Screen
					name="login"
					options={screenOptions}
				/>
				<Stack.Screen
					name="register"
					options={screenOptions}
				/>
			</Stack>
		</View>
	)
}
