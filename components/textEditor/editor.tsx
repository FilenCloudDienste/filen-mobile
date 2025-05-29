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

export const Editor = memo(({ item, markdownPreview }: { item: TextEditorItem; markdownPreview: boolean }) => {
	const { isDarkColorScheme, colors } = useColorScheme()
	const [didChange, setDidChange] = useState<boolean>(false)
	const [value, setValue] = useState<string>("")
	const queryDataUpdatedRef = useRef<number>(-1)

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
				throw new Error("Sharing is not available on this device.")
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
	}, [value, itemMime, itemName])

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

			alerts.normal("Saved successfully.")
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
	}, [item, itemName, value, didChange])

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
					style={{
						backgroundColor: bgColors[markdownPreview ? "markdown" : "normal"][isDarkColorScheme ? "dark" : "light"]
					}}
				>
					{!query.isSuccess ? (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator color={colors.foreground} />
						</View>
					) : (
						<KeyboardAvoidingView
							className="flex-1"
							behavior="padding"
							keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 100}
						>
							<TextEditorDOM
								key={`${itemName}:${item.type === "cloud" ? item.driveItem.uuid : item.uri}:${isDarkColorScheme}`}
								initialValue={query.data}
								onValueChange={onValueChange}
								fileName={itemName}
								darkMode={isDarkColorScheme}
								platformOS={Platform.OS}
								previewType={previewType}
								markdownPreview={markdownPreview}
								dom={{
									contentInsetAdjustmentBehavior: "automatic"
								}}
							/>
						</KeyboardAvoidingView>
					)}
				</View>
			</Container>
			<Toolbar
				iosBlurIntensity={100}
				iosHint={item.type !== "cloud" ? undefined : didChange ? "Unsaved changes" : "Saved"}
				leftView={
					<ToolbarIcon
						disabled={query.status !== "success"}
						onPress={exportFile}
						icon={{
							name: "send-circle-outline"
						}}
					/>
				}
				rightView={
					<ToolbarCTA
						disabled={item.type !== "cloud" || !didChange || query.status !== "success"}
						onPress={save}
						icon={{
							name: "check-circle-outline"
						}}
					/>
				}
			/>
		</View>
	)
})

Editor.displayName = "Editor"

export default Editor
