import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { formatBytes } from "@/lib/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { Platform } from "react-native"
import { useQuery } from "@tanstack/react-query"
import paths from "@/lib/paths"
import * as FileSystem from "expo-file-system/next"
import sqlite from "@/lib/sqlite"
import trackPlayerService from "@/lib/trackPlayer"
import { useTranslation } from "react-i18next"

export const Advanced = memo(() => {
	const { t } = useTranslation()

	const { data, refetch, status } = useQuery({
		queryKey: ["settingsAdvancedCacheQuery"],
		queryFn: async () => {
			const thumbnailsSize = new FileSystem.Directory(paths.thumbnails())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const exportsSize = new FileSystem.Directory(paths.exports())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const offlineFilesSize = new FileSystem.Directory(paths.offlineFiles())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const temporaryDownloadsSize = new FileSystem.Directory(paths.temporaryDownloads())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const temporaryUploadsSize = new FileSystem.Directory(paths.temporaryUploads())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const trackPlayerSize = new FileSystem.Directory(paths.trackPlayer())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			const trackPlayerPicturesSize = new FileSystem.Directory(paths.trackPlayerPictures())
				.list()
				.map(entry => (entry instanceof FileSystem.File ? entry.size ?? 0 : 0))
				.reduce((a, b) => a + b, 0)

			return {
				thumbnailsSize,
				exportsSize,
				offlineFilesSize,
				temporaryDownloadsSize,
				temporaryUploadsSize,
				trackPlayerSize,
				trackPlayerPicturesSize
			}
		}
	})

	const cacheSize = useMemo(() => {
		return (data?.exportsSize ?? 0) + (data?.temporaryDownloadsSize ?? 0) + (data?.temporaryUploadsSize ?? 0)
	}, [data])

	const thumbnailsSize = useMemo(() => {
		return data?.thumbnailsSize ?? 0
	}, [data])

	const trackPlayerSize = useMemo(() => {
		return (data?.trackPlayerSize ?? 0) + (data?.trackPlayerPicturesSize ?? 0)
	}, [data])

	const offlineFilesSize = useMemo(() => {
		return data?.offlineFilesSize ?? 0
	}, [data])

	const clearCache = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.advanced.prompts.clearCache.title"),
			message: t("settings.advanced.prompts.clearCache.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearTempDirectories()

			await refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [refetch, t])

	const clearThumbnails = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.advanced.prompts.clearThumbnails.title"),
			message: t("settings.advanced.prompts.clearThumbnails.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearThumbnails()

			await refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [refetch, t])

	const clearTrackPlayer = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.advanced.prompts.clearTrackPlayer.title"),
			message: t("settings.advanced.prompts.clearTrackPlayer.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearTrackPlayer()
			trackPlayerService.clearState()

			await refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [refetch, t])

	const clearOfflineFiles = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.advanced.prompts.clearOfflineFiles.title"),
			message: t("settings.advanced.prompts.clearOfflineFiles.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearOfflineFiles()

			await sqlite.offlineFiles.clear()

			await refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [refetch, t])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: t("settings.advanced.items.clearCache"),
				rightText: formatBytes(cacheSize),
				subTitle: Platform.OS === "android" ? formatBytes(cacheSize) : undefined,
				onPress: clearCache
			},
			{
				id: "1",
				title: t("settings.advanced.items.clearThumbnails"),
				rightText: formatBytes(thumbnailsSize),
				subTitle: Platform.OS === "android" ? formatBytes(thumbnailsSize) : undefined,
				onPress: clearThumbnails
			},
			{
				id: "2",
				title: t("settings.advanced.items.clearTrackPlayer"),
				rightText: formatBytes(trackPlayerSize),
				subTitle: Platform.OS === "android" ? formatBytes(trackPlayerSize) : undefined,
				onPress: clearTrackPlayer
			},
			{
				id: "3",
				title: t("settings.advanced.items.clearOfflineFiles"),
				rightText: formatBytes(offlineFilesSize),
				subTitle: Platform.OS === "android" ? formatBytes(offlineFilesSize) : undefined,
				onPress: clearOfflineFiles
			}
		]
	}, [cacheSize, t, thumbnailsSize, trackPlayerSize, offlineFilesSize, clearCache, clearThumbnails, clearTrackPlayer, clearOfflineFiles])

	return (
		<SettingsComponent
			title={t("settings.advanced.title")}
			showSearchBar={false}
			loading={status !== "success"}
			items={items}
		/>
	)
})

Advanced.displayName = "Advanced"

export default Advanced
