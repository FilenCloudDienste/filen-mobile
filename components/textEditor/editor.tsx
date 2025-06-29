import { memo, useMemo, useState, useCallback, useEffect, useRef } from "react"
import TextEditorDOM from "./dom"
import useTextEditorItemContentQuery from "@/queries/useTextEditorItemContentQuery"
import { View, Platform, ActivityIndicator } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "../nativewindui/Toolbar"
import { getPreviewType } from "@/lib/utils"
import * as FileSystem from "expo-file-system/next"
import paths from "@/lib/paths"
import { randomUUID } from "expo-crypto"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "../modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { KeyboardAvoidingView } from "react-native-keyboard-controller"
import * as Sharing from "expo-sharing"
import Container from "../Container"
import mimeTypes from "mime-types"
import useHTTPServer from "@/hooks/useHTTPServer"
import { type DOMProps } from "expo/dom"
import { useTranslation } from "react-i18next"

export const bgColors = {
	normal: {
		light: Platform.select({
			ios: "#FFFFFF",
			default: "#FAFAFA"
		}),
		dark: Platform.select({
			ios: "#2A2A30",
			default: "#2E3236"
		})
	},
	markdown: {
		light: Platform.select({
			default: "#ffffff"
		}),
		dark: Platform.select({
			default: "#0d1118"
		})
	}
}

export type TextEditorItem =
	| {
			type: "cloud"
			driveItem: DriveCloudItem
	  }
	| {
			type: "remote"
			uri: string
			name: string
	  }
	| {
			type: "local"
			uri: string
			name: string
	  }

const keyboardVerticalOffset = Platform.OS === "ios" ? 0 : 100

export const Editor = memo(({ item, markdownPreview }: { item: TextEditorItem; markdownPreview: boolean }) => {
	const { isDarkColorScheme, colors } = useColorScheme()
	const [didChange, setDidChange] = useState<boolean>(false)
	const [value, setValue] = useState<string>("")
	const queryDataUpdatedRef = useRef<number>(-1)
	const httpServer = useHTTPServer()
	const { t } = useTranslation()

	const uri = useMemo(() => {
		if (item.type === "cloud") {
			if (item.driveItem.type === "directory") {
				return ""
			}

			return `http://127.0.0.1:${httpServer.port}/stream?auth=${httpServer.authToken}&file=${encodeURIComponent(
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
	}, [item, httpServer.port, httpServer.authToken])

	const query = useTextEditorItemContentQuery({
		uri,
		enabled: uri.length > 0
	})

	const itemName = useMemo(() => {
		if (item.type === "cloud") {
			return item.driveItem.name
		}

		return item.name
	}, [item])

	const itemMime = useMemo(() => {
		if (item.type === "cloud" && item.driveItem.type === "file") {
			return item.driveItem.mime
		}

		return mimeTypes.lookup(itemName) || "text/plain"
	}, [item, itemName])

	const previewType = useMemo(() => {
		return getPreviewType(itemName)
	}, [itemName])

	const onValueChange = useCallback((value: string) => {
		setValue(value)
		setDidChange(true)
	}, [])

	const exportFile = useCallback(async () => {
		const valueCopied = `${value}`

		try {
			if (!(await Sharing.isAvailableAsync())) {
				throw new Error(t("errors.sharingNotAvailable"))
			}

			const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryDownloads(), randomUUID(), itemName))

			try {
				if (!tmpFile.parentDirectory.exists) {
					tmpFile.parentDirectory.create()
				}

				if (tmpFile.exists) {
					tmpFile.delete()
				}

				tmpFile.write(valueCopied)

				await Sharing.shareAsync(tmpFile.uri, {
					mimeType: itemMime,
					dialogTitle: itemName
				})
			} finally {
				if (tmpFile.parentDirectory.exists) {
					tmpFile.parentDirectory.delete()
				}
			}
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [value, itemMime, itemName, t])

	const save = useCallback(async () => {
		if (item.type !== "cloud") {
			return
		}

		const valueCopied = `${value}`

		if (!didChange) {
			return
		}

		let tmpFile: FileSystem.File | null = null

		fullScreenLoadingModal.show()

		try {
			tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

			if (tmpFile.exists) {
				tmpFile.delete()
			}

			tmpFile.create()

			if (valueCopied.length > 0) {
				tmpFile.write(valueCopied)
			}

			await nodeWorker.proxy("uploadFile", {
				parent: item.driveItem.parent,
				localPath: tmpFile.uri,
				name: itemName,
				id: randomUUID(),
				size: tmpFile.size ?? 0,
				isShared: false,
				deleteAfterUpload: true,
				dontEmitProgress: true
			})

			setDidChange(false)
			setValue(valueCopied)

			alerts.normal(t("textEditor.savedSuccess"))
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (tmpFile && tmpFile.exists) {
				tmpFile.delete()
			}

			fullScreenLoadingModal.hide()
		}
	}, [item, itemName, value, didChange, t])

	const viewStyle = useMemo(() => {
		return {
			backgroundColor: bgColors[markdownPreview ? "markdown" : "normal"][isDarkColorScheme ? "dark" : "light"]
		}
	}, [isDarkColorScheme, markdownPreview])

	const dom = useMemo(() => {
		return {
			contentInsetAdjustmentBehavior: "automatic"
		} satisfies DOMProps
	}, [])

	const domKey = useMemo(() => {
		return `${itemName}:${item.type === "cloud" ? item.driveItem.uuid : item.uri}:${isDarkColorScheme}`
	}, [itemName, item, isDarkColorScheme])

	const toolbarLeftView = useMemo(() => {
		return (
			<ToolbarIcon
				disabled={query.status !== "success"}
				onPress={exportFile}
				icon={{
					name: "send-circle-outline"
				}}
			/>
		)
	}, [query.status, exportFile])

	const toolbarRightView = useMemo(() => {
		return (
			<ToolbarCTA
				disabled={item.type !== "cloud" || !didChange || query.status !== "success"}
				onPress={save}
				icon={{
					name: "check"
				}}
			/>
		)
	}, [item.type, didChange, query.status, save])

	const iosHint = useMemo(() => {
		return item.type !== "cloud" ? undefined : didChange ? t("textEditor.unsavedChanges") : t("textEditor.saved")
	}, [item.type, didChange, t])

	useEffect(() => {
		if (query.isSuccess && queryDataUpdatedRef.current !== query.dataUpdatedAt) {
			queryDataUpdatedRef.current = query.dataUpdatedAt

			setValue(query.data)
		}
	}, [query])

	return (
		<View className="flex-1">
			<Container>
				<View
					className="flex-1"
					style={viewStyle}
				>
					{query.status !== "success" ? (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator color={colors.foreground} />
						</View>
					) : (
						<KeyboardAvoidingView
							className="flex-1"
							behavior="padding"
							keyboardVerticalOffset={keyboardVerticalOffset}
						>
							<TextEditorDOM
								key={domKey}
								initialValue={query.data}
								onValueChange={onValueChange}
								fileName={itemName}
								darkMode={isDarkColorScheme}
								platformOS={Platform.OS}
								previewType={previewType}
								markdownPreview={markdownPreview}
								dom={dom}
							/>
						</KeyboardAvoidingView>
					)}
				</View>
			</Container>
			<Toolbar
				iosBlurIntensity={100}
				iosHint={iosHint}
				leftView={toolbarLeftView}
				rightView={toolbarRightView}
			/>
		</View>
	)
})

Editor.displayName = "Editor"

export default Editor
