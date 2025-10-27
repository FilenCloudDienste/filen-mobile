import { Redirect } from "expo-router"
import useIsAuthed from "@/hooks/useIsAuthed"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"

export default function Index() {
	const [isAuthed] = useIsAuthed()
	const [initialRouteName] = useMMKVString("initialRouteName", mmkvInstance)

	if (isAuthed) {
		return <Redirect href={`/(app)/${initialRouteName ?? "home"}`} />
	}

	return <Redirect href="/(auth)" />
}
