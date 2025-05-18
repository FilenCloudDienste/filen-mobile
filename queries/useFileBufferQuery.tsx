import { useQuery } from "@tanstack/react-query"
import nodeWorker from "@/lib/nodeWorker"
import useFocusNotifyOnChangeProps from "@/hooks/useFocusNotifyOnChangeProps"
import useQueryFocusAware from "@/hooks/useQueryFocusAware"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"

export type UseFileBufferQuery = {
	item: DriveCloudItem
	buffer: Uint8Array | Buffer
}

export default function useFileBufferQuery({
	item,
	refetchOnMount = false,
	refetchOnReconnect = false,
	refetchOnWindowFocus = false,
	staleTime = Infinity,
	gcTime = Infinity,
	enabled
}: { item: DriveCloudItem } & {
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
		queryKey: ["useFileBufferQuery", item],
		queryFn: () =>
			new Promise<UseFileBufferQuery>((resolve, reject) => {
				if (item.type !== "file") {
					reject(new Error("Item not of type file."))

					return
				}

				const tempLocation = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID()))

				if (tempLocation.exists) {
					tempLocation.delete()
				}

				nodeWorker
					.proxy("downloadFile", {
						id: randomUUID(),
						uuid: item.uuid,
						bucket: item.bucket,
						region: item.region,
						chunks: item.chunks,
						version: item.version,
						key: item.key,
						destination: tempLocation.uri,
						size: item.size,
						name: item.name,
						dontEmitProgress: true
					})
					.then(() => {
						if (!tempLocation.exists) {
							reject(new Error("Failed to download file."))

							return
						}

						const buffer = tempLocation.bytes()

						resolve({
							item,
							buffer
						})
					})
					.catch(reject)
					.finally(() => {
						if (tempLocation.exists) {
							tempLocation.delete()
						}
					})
			}),
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
