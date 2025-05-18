import { memo, useState, useMemo } from "react"
import nodeWorker from "@/lib/nodeWorker"
import { ActivityIndicator, View } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import Container from "../Container"
import PDF from "react-native-pdf"
import { type PDFPreviewItem } from "."

export const Preview = memo(({ item }: { item: PDFPreviewItem }) => {
	const { colors } = useColorScheme()
	const [page, setPage] = useState<number | undefined>(undefined)
	const [numPages, setNumPages] = useState<number | null>(null)

	const source = useMemo(() => {
		if (item.type === "cloud") {
			if (item.driveItem.type !== "file") {
				return {
					uri: undefined
				}
			}

			return {
				uri: `http://localhost:${nodeWorker.httpServerPort}/stream?auth=${nodeWorker.httpAuthToken}&file=${encodeURIComponent(
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
		}

		return {
			uri: item.uri
		}
	}, [item])

	return (
		<View className="flex-1">
			<Container>
				<PDF
					page={page}
					source={source}
					trustAllCerts={false}
					renderActivityIndicator={() => {
						return (
							<View className="flex-1 items-center justify-center">
								<ActivityIndicator color={colors.foreground} />
							</View>
						)
					}}
					onLoadComplete={(numberOfPages, filePath) => {
						setNumPages(numberOfPages)
					}}
					onPageChanged={(page, numberOfPages) => {
						setPage(page)
						setNumPages(numberOfPages)
					}}
					onError={error => {
						console.log(error)
					}}
					onPressLink={uri => {
						console.log(`Link pressed: ${uri}`)
					}}
					style={{
						flex: 1,
						width: "100%",
						height: "100%",
						backgroundColor: colors.background
					}}
				/>
			</Container>
		</View>
	)
})

Preview.displayName = "Preview"

export default Preview
