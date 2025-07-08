import { memo, useState, useMemo, useCallback } from "react"
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import Container from "../Container"
import PDF from "react-native-pdf"
import { type PDFPreviewItem } from "@/app/pdfPreview"
import useHTTPServer from "@/hooks/useHTTPServer"
import * as Linking from "expo-linking"
import alerts from "@/lib/alerts"
import { useTranslation } from "react-i18next"

export const Preview = memo(({ item }: { item: PDFPreviewItem }) => {
	const { colors } = useColorScheme()
	const [page, setPage] = useState<number | undefined>(undefined)
	const [, setNumPages] = useState<number | null>(null)
	const httpServer = useHTTPServer()
	const { t } = useTranslation()

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
	}, [item, httpServer.port, httpServer.authToken])

	const renderActivityIndicator = useCallback(() => {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator
					color={colors.foreground}
					size="small"
				/>
			</View>
		)
	}, [colors.foreground])

	const onLoadComplete = useCallback((numberOfPages: number) => {
		setNumPages(numberOfPages)
	}, [])

	const onPageChanged = useCallback((page: number, numberOfPages: number) => {
		setPage(page)
		setNumPages(numberOfPages)
	}, [])

	const onError = useCallback((error: object) => {
		console.error("PDF error:", error)
	}, [])

	const onPressLink = useCallback(
		async (uri: string) => {
			try {
				if (!(await Linking.canOpenURL(uri))) {
					alerts.error(t("errors.cannotOpenURL"))

					return
				}

				await Linking.openURL(uri)
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[t]
	)

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
			<PDF
				page={page}
				source={source}
				trustAllCerts={false}
				renderActivityIndicator={renderActivityIndicator}
				onLoadComplete={onLoadComplete}
				onPageChanged={onPageChanged}
				onError={onError}
				onPressLink={onPressLink}
				style={style}
			/>
		</Container>
	)
})

Preview.displayName = "Preview"

export default Preview
