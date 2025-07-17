import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { Platform } from "react-native"
import { Fragment } from "react"
import useLockOrientation from "@/hooks/useLockOrientation"
import { SCREEN_OPTIONS } from "@/lib/constants"

const screenOptions = {
	headerShown: Platform.OS === "ios",
	headerBlurEffect: "systemChromeMaterial",
	presentation: "modal",
	animation: "slide_from_bottom"
} satisfies NonNullable<React.ComponentPropsWithoutRef<typeof Stack.Screen>["options"]>

export default function AuthLayout() {
	useLockOrientation()

	const [isAuthed] = useIsAuthed()

	if (isAuthed) {
		return <Redirect href="/(app)/home" />
	}

	return (
		<Fragment>
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
		</Fragment>
	)
}
