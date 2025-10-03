import { memo, useMemo } from "react"
import DOMComponent from "./dom"
import useFileBase64Query from "@/queries/useFileBase64.query"
import { View, ActivityIndicator } from "react-native"
import Container from "../Container"
import { type DOCXPreviewItem } from "@/app/docxPreview"
import useHTTPServer from "@/hooks/useHTTPServer"
import { type DOMProps } from "expo/dom"

const dom: DOMProps = {
	contentInsetAdjustmentBehavior: "automatic",
	overScrollMode: "content",
	bounces: false,
	style: {
		width: "100%",
		height: "100%",
		flex: 1
	}
}

export const Preview = memo(({ item }: { item: DOCXPreviewItem }) => {
	const httpServer = useHTTPServer()

	const uri = useMemo(() => {
		if (item.type === "cloud") {
			if (item.driveItem.type === "directory") {
				return ""
			}

			return `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
				btoa(
					JSON.stringify({
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
	}, [item, httpServer.port, httpServer.authToken])

	const query = useFileBase64Query(
		{
			url: uri,
			maxSize: 20 * 1024 * 1024
		},
		{
			enabled: uri.length > 0
		}
	)

	if (query.status !== "success") {
		return null
	}

	return (
		<View className="flex-1 bg-white">
			<Container className="bg-white">
				{query.status === "success" ? (
					<View className="flex-1 bg-white">
						<DOMComponent
							base64={query.data}
							dom={dom}
						/>
					</View>
				) : (
					<View className="flex-1 items-center justify-center bg-white">
						<ActivityIndicator
							color="black"
							size="small"
						/>
					</View>
				)}
			</Container>
		</View>
	)
})

Preview.displayName = "Preview"

export default Preview
