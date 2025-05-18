import { useQuery } from "@tanstack/react-query"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import axios from "axios"

export type UseTextEditorItemContentQuery = {
	item: DriveCloudItem
	content: string
}

export default function useTextEditorItemContentQuery({
	uri,
	refetchOnMount = false,
	refetchOnReconnect = false,
	refetchOnWindowFocus = false,
	staleTime = Infinity,
	gcTime = Infinity,
	enabled
}: { uri: string } & {
	refetchOnMount?: boolean | "always"
	refetchOnReconnect?: boolean | "always"
	refetchOnWindowFocus?: boolean | "always"
	staleTime?: number
	gcTime?: number
	enabled?: boolean
}) {
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useTextEditorItemContentQuery", uri],
		queryFn: async () => {
			const request = await axios.get(uri, {
				timeout: 60000
			})

			if (request.status !== 200) {
				throw new Error("Failed to fetch YouTube data.")
			}

			if (typeof request.data !== "string") {
				throw new Error("Invalid data type.")
			}

			return request.data
		},
		notifyOnChangeProps,
		enabled: typeof enabled === "boolean" ? enabled : isFocused,
		refetchOnMount,
		refetchOnReconnect,
		refetchOnWindowFocus,
		staleTime,
		gcTime,
		experimental_prefetchInRender: true
	})

	return query
}
