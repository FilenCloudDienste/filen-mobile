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

export const Advanced = memo(() => {
	const cacheQuery = useQuery({
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
		return (
			(cacheQuery.data?.exportsSize ?? 0) +
			(cacheQuery.data?.temporaryDownloadsSize ?? 0) +
			(cacheQuery.data?.temporaryUploadsSize ?? 0)
		)
	}, [cacheQuery.data])

	const thumbnailsSize = useMemo(() => {
		return cacheQuery.data?.thumbnailsSize ?? 0
	}, [cacheQuery.data])

	const trackPlayerSize = useMemo(() => {
		return (cacheQuery.data?.trackPlayerSize ?? 0) + (cacheQuery.data?.trackPlayerPicturesSize ?? 0)
	}, [cacheQuery.data])

	const offlineFilesSize = useMemo(() => {
		return cacheQuery.data?.offlineFilesSize ?? 0
	}, [cacheQuery.data])

	const clearCache = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Clear cache",
			message:
				"Clearing the cache will remove temporary files. This can interrupt ongoing uploads or downloads. Are you sure you want to continue?"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearTempDirectories()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	const clearThumbnails = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Clear thumbnails",
			message: "Clearing the thumbnails will make the app download every visible thumbnail again. Are you sure you want to continue?"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearThumbnails()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	const clearTrackPlayer = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Clear track player",
			message: "Clearing the track player will remove all cached tracks and pictures. Are you sure you want to continue?"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearThumbnails()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	const clearOfflineFiles = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Clear offline files",
			message: "Clearing offline files will remove all downloaded files. Are you sure you want to continue?"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearOfflineFiles()

			await sqlite.offlineFiles.clear()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	return (
		<SettingsComponent
			title="Advanced"
			showSearchBar={false}
			loading={cacheQuery.status !== "success"}
			items={[
				{
					id: "0",
					title: "Clear cache",
					rightText: formatBytes(cacheSize),
					subTitle: Platform.OS === "android" ? formatBytes(cacheSize) : undefined,
					onPress: clearCache
				},
				{
					id: "1",
					title: "Clear thumbnails",
					rightText: formatBytes(thumbnailsSize),
					subTitle: Platform.OS === "android" ? formatBytes(thumbnailsSize) : undefined,
					onPress: clearThumbnails
				},
				{
					id: "2",
					title: "Clear track player",
					rightText: formatBytes(trackPlayerSize),
					subTitle: Platform.OS === "android" ? formatBytes(trackPlayerSize) : undefined,
					onPress: clearTrackPlayer
				},
				{
					id: "3",
					title: "Clear offline files",
					rightText: formatBytes(offlineFilesSize),
					subTitle: Platform.OS === "android" ? formatBytes(offlineFilesSize) : undefined,
					onPress: clearOfflineFiles
				}
			]}
		/>
	)
})

Advanced.displayName = "Advanced"

export default Advanced
