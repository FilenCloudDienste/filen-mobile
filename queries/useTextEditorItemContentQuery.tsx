import { useQuery } from "@tanstack/react-query"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import axios from "axios"
import { Buffer } from "buffer"
import useNetInfo from "@/hooks/useNetInfo"
import alerts from "@/lib/alerts"

export type UseTextEditorItemContentQuery = {
	item: DriveCloudItem
	content: string
}

export default function useTextEditorItemContentQuery({
	uri,
	maxSize,
	refetchOnMount = false,
	refetchOnReconnect = false,
	refetchOnWindowFocus = false,
	staleTime = Infinity,
	gcTime = Infinity,
	enabled
}: { uri: string; maxSize?: number } & {
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
		queryKey: ["useTextEditorItemContentQuery", uri, maxSize],
		queryFn: async () => {
			const cancelToken = axios.CancelToken.source()
			const request = await axios.get(uri, {
				timeout: 60000,
				responseType: "arraybuffer",
				cancelToken: cancelToken.token,
				maxContentLength: maxSize,
				onDownloadProgress(progressEvent) {
					if (maxSize && (progressEvent.loaded > maxSize || (progressEvent.total && progressEvent.total > maxSize))) {
						cancelToken.cancel("File size exceeds the maximum limit.")
					}
				}
			})

			if (request.status !== 200) {
				throw new Error("Failed to fetch text data.")
			}

			return Buffer.from(request.data).toString("utf-8")
		},
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
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
