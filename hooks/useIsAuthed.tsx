import { mmkvInstance } from "@/lib/mmkv"
import { useMMKVBoolean } from "react-native-mmkv"
import { AUTHED_STORAGE_KEY } from "@/lib/constants"

export default function useIsAuthed() {
	const [isAuthed, setIsAuthed] = useMMKVBoolean(AUTHED_STORAGE_KEY, mmkvInstance)

	return [isAuthed ?? false, setIsAuthed]
}
