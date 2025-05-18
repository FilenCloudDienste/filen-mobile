import { usePathname, useGlobalSearchParams } from "expo-router"
import { useMemo } from "react"
import { validate as validateUUID } from "uuid"

export default function useLocationInfo() {
	const pathname = usePathname()
	const params = useGlobalSearchParams()

	const focusedChatUUID = useMemo(() => {
		return pathname === "/chat" && typeof params.uuid === "string" && validateUUID(params.uuid) ? params.uuid : null
	}, [pathname, params.uuid])

	const insideMainChatsScreen = useMemo(() => {
		return pathname === "/chats"
	}, [pathname])

	return {
		pathname,
		globalSearchParams: params,
		focusedChatUUID,
		insideMainChatsScreen
	}
}
