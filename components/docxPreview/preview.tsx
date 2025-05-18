import { memo, useMemo } from "react"
import DOMComponent from "./dom"
import useFileBase64Query from "@/queries/useFileBase64Query"
import { View, ActivityIndicator } from "react-native"
import Container from "../Container"
import { type DOCXPreviewItem } from "."
import nodeWorker from "@/lib/nodeWorker"

export const Preview = memo(({ item }: { item: DOCXPreviewItem }) => {
	const uri = useMemo(() => {
		if (item.type === "cloud") {
			if (item.driveItem.type === "directory") {
				return ""
			}

			return `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
				btoa(
					JSON.stringify({
						name: item.driveItem.name,
						mime: item.driveItem.mime,
						size: item.driveItem.size,
						uuid: item.driveItem.uuid,
						bucket: item.driveItem.bucket,
						key: item.driveItem.key,
						version: item.driveItem.version,
						chunks: item.driveItem.chunks,
						region: item.driveItem.region
					})
				)
			)}`
		}

		return item.uri
	}, [item])

	const query = useFileBase64Query({
		uri,
		enabled: uri.length > 0
	})

	if (!query.isSuccess) {
		return null
	}

	return (
		<View className="flex-1 bg-white">
			<Container className="bg-white">
				{query.isSuccess ? (
					<View className="flex-1 bg-white">
						<DOMComponent
							base64={query.data}
							dom={{
								contentInsetAdjustmentBehavior: "automatic",
								overScrollMode: "content",
								bounces: false,
								style: {
									width: "100%",
									height: "100%",
									flex: 1
								}
							}}
						/>
					</View>
				) : (
					<View className="flex-1 items-center justify-center bg-white">
						<ActivityIndicator color="black" />
					</View>
				)}
			</Container>
		</View>
	)
})

Preview.displayName = "Preview"

export default Preview
