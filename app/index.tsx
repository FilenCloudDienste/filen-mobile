import { Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"

export default function Index() {
	const [isAuthed] = useIsAuthed()

	if (isAuthed) {
		return <Redirect href="/(app)/home" />
	}

	return <Redirect href="/(auth)" />
}
