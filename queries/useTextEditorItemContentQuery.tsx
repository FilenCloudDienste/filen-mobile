import { useQuery } from "@tanstack/react-query"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import axios from "axios"
import { Buffer } from "buffer"
import useNetInfo from "@/hooks/useNetInfo"

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
	const { hasInternet } = useNetInfo()
	const isFocused = useQueryFocusAware()
	const notifyOnChangeProps = useFocusNotifyOnChangeProps()
	const query = useQuery({
		queryKey: ["useTextEditorItemContentQuery", uri],
		queryFn: async () => {
			const request = await axios.get(uri, {
				timeout: 60000,
				responseType: "arraybuffer"
			})

			if (request.status !== 200) {
				throw new Error("Failed to fetch YouTube data.")
			}

			return Buffer.from(request.data).toString("utf-8")
		},
		notifyOnChangeProps,
		enabled: !hasInternet ? false : typeof enabled === "boolean" ? enabled : isFocused,
		refetchOnMount,
		refetchOnReconnect,
		refetchOnWindowFocus,
		staleTime,
		gcTime,
		experimental_prefetchInRender: true
	})

	return query
}
