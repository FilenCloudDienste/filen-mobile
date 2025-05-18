import { Stack, Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"

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
		/>
	)
}
