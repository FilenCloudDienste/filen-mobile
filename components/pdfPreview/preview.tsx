import { memo, useMemo, useCallback } from "react"
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import Container from "../Container"
import PdfRendererView from "react-native-pdf-renderer"
import { type PDFPreviewItem } from "@/app/pdfPreview"
import useHTTPServer from "@/hooks/useHTTPServer"
import alerts from "@/lib/alerts"
import useDownloadFileTemporaryLocalQuery from "@/queries/useDownloadFileTemporaryLocal.query"

export const Preview = memo(({ item }: { item: PDFPreviewItem }) => {
	const { colors } = useColorScheme()
	const httpServer = useHTTPServer()

	const source = useMemo(() => {
		if (item.type === "cloud") {
			if (item.driveItem.type !== "file") {
				return {
					uri: undefined
				}
			}

			return {
				uri: `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
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
		}

		return {
			uri: item.uri
		}
	}, [item, httpServer.port, httpServer.authToken])

	const query = useDownloadFileTemporaryLocalQuery(
		{
			url: source.uri ?? ""
		},
		{
			enabled: (source.uri ?? "").length > 0
		}
	)

	const onError = useCallback(() => {
		alerts.error("Failed to load PDF file.")
	}, [])

	const style = useMemo(() => {
		return {
			flex: 1,
			width: "100%",
			height: "100%",
			backgroundColor: colors.background
		} satisfies StyleProp<ViewStyle>
	}, [colors.background])

	return (
		<Container>
			{query.status !== "success" || !query.data ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator
						color={colors.foreground}
						size="small"
					/>
				</View>
			) : (
				<PdfRendererView
					source={query.data}
					distanceBetweenPages={16}
					maxZoom={2}
					onError={onError}
					style={style}
				/>
			)}
		</Container>
	)
})

Preview.displayName = "Preview"

export default Preview
