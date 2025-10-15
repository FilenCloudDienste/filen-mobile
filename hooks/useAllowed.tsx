import { useRoute } from "@react-navigation/native"
import { useMemo } from "react"
import { validate as validateUUID } from "uuid"

export default function useAllowed(): {
	upload: boolean
} {
	const route = useRoute()

	const state = useMemo((): {
		upload: boolean
	} => {
		const routeParams = (route.params as Record<string, string>) ?? {}

		const upload =
			route.name === "[uuid]" ||
			(route.name === "links/[uuid]" && typeof routeParams.uuid === "string" && validateUUID(routeParams.uuid)) ||
			(route.name === "favorites/[uuid]" && typeof routeParams.uuid === "string" && validateUUID(routeParams.uuid)) ||
			(route.name === "sharedOut/[uuid]" && typeof routeParams.uuid === "string" && validateUUID(routeParams.uuid))

		return {
			upload
		}
	}, [route])

	return state
}
