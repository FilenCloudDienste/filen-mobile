import { memo, useMemo, useCallback } from "react"
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import Container from "../Container"
import PdfRendererView from "react-native-pdf-renderer"
import { type PDFPreviewItem } from "@/app/pdfPreview"
import useHTTPServer from "@/hooks/useHTTPServer"
import alerts from "@/lib/alerts"
import { useQuery } from "@tanstack/react-query"
import * as FileSystemLegacy from "expo-file-system"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { normalizeFilePathForExpo } from "@/lib/utils"
import { xxHash32 } from "js-xxhash"

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

	const pdfFileUriQuery = useQuery({
		queryKey: ["pdfFileUriQuery", source],
		queryFn: async () => {
			if (!source.uri) {
				return null
			}

			if (!(source.uri.startsWith("http://") || source.uri.startsWith("https://"))) {
				return normalizeFilePathForExpo(source.uri)
			}

			const file = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), `${xxHash32(source.uri).toString(16)}.pdf`))

			if (file.exists) {
				return file.uri
			}

			await FileSystemLegacy.downloadAsync(source.uri, file.uri, {
				sessionType: FileSystemLegacy.FileSystemSessionType.BACKGROUND
			})

			return file.uri
		},
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchInterval: false,
		refetchIntervalInBackground: false,
		throwOnError(err) {
			console.error(err)
			alerts.error(err.message)

			return false
		}
	})

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
			{pdfFileUriQuery.status !== "success" || !pdfFileUriQuery.data ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator
						color={colors.foreground}
						size="small"
					/>
				</View>
			) : (
				<PdfRendererView
					source={pdfFileUriQuery.data}
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
