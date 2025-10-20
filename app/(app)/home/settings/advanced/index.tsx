import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { formatBytes } from "@/lib/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { Platform } from "react-native"
import paths from "@/lib/paths"
import sqlite from "@/lib/sqlite"
import trackPlayer from "@/lib/trackPlayer"
import { translateMemoized } from "@/lib/i18n"
import TurboImage from "react-native-turbo-image"
import useSettingsAdvancedCacheQuery, { settingsAdvancedCacheQueryRefetch } from "@/queries/useSettingsAdvancedCache.query"

export const Advanced = memo(() => {
	const settingsAdvancedCacheQuery = useSettingsAdvancedCacheQuery()

	const cacheSize = useMemo(() => {
		return (
			(settingsAdvancedCacheQuery.data?.exportsSize ?? 0) +
			(settingsAdvancedCacheQuery.data?.temporaryDownloadsSize ?? 0) +
			(settingsAdvancedCacheQuery.data?.temporaryUploadsSize ?? 0)
		)
	}, [settingsAdvancedCacheQuery.data])

	const thumbnailsSize = useMemo(() => {
		return settingsAdvancedCacheQuery.data?.thumbnailsSize ?? 0
	}, [settingsAdvancedCacheQuery.data])

	const trackPlayerSize = useMemo(() => {
		return (settingsAdvancedCacheQuery.data?.trackPlayerSize ?? 0) + (settingsAdvancedCacheQuery.data?.trackPlayerPicturesSize ?? 0)
	}, [settingsAdvancedCacheQuery.data])

	const offlineFilesSize = useMemo(() => {
		return settingsAdvancedCacheQuery.data?.offlineFilesSize ?? 0
	}, [settingsAdvancedCacheQuery.data])

	const clearCache = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: translateMemoized("settings.advanced.prompts.clearCache.title"),
			message: translateMemoized("settings.advanced.prompts.clearCache.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearTempDirectories()

			await Promise.all([TurboImage.clearDiskCache(), TurboImage.clearMemoryCache()])

			await settingsAdvancedCacheQueryRefetch()
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
			title: translateMemoized("settings.advanced.prompts.clearThumbnails.title"),
			message: translateMemoized("settings.advanced.prompts.clearThumbnails.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearThumbnails()

			await settingsAdvancedCacheQueryRefetch()
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
			title: translateMemoized("settings.advanced.prompts.clearTrackPlayer.title"),
			message: translateMemoized("settings.advanced.prompts.clearTrackPlayer.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearTrackPlayer()
			trackPlayer.clearState()

			await settingsAdvancedCacheQueryRefetch()
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
			title: translateMemoized("settings.advanced.prompts.clearOfflineFiles.title"),
			message: translateMemoized("settings.advanced.prompts.clearOfflineFiles.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			paths.clearOfflineFiles()

			await sqlite.offlineFiles.clear()

			await settingsAdvancedCacheQueryRefetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: translateMemoized("settings.advanced.items.clearCache"),
				rightText: formatBytes(cacheSize),
				subTitle: Platform.OS === "android" ? formatBytes(cacheSize) : undefined,
				onPress: clearCache,
				leftView: (
					<IconView
						name="cog-outline"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "1",
				title: translateMemoized("settings.advanced.items.clearThumbnails"),
				rightText: formatBytes(thumbnailsSize),
				subTitle: Platform.OS === "android" ? formatBytes(thumbnailsSize) : undefined,
				onPress: clearThumbnails,
				leftView: (
					<IconView
						name="image-outline"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "2",
				title: translateMemoized("settings.advanced.items.clearTrackPlayer"),
				rightText: formatBytes(trackPlayerSize),
				subTitle: Platform.OS === "android" ? formatBytes(trackPlayerSize) : undefined,
				onPress: clearTrackPlayer,
				leftView: (
					<IconView
						name="music-note"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "3",
				title: translateMemoized("settings.advanced.items.clearOfflineFiles"),
				rightText: formatBytes(offlineFilesSize),
				subTitle: Platform.OS === "android" ? formatBytes(offlineFilesSize) : undefined,
				onPress: clearOfflineFiles,
				leftView: (
					<IconView
						name="folder-open"
						className="bg-gray-500"
					/>
				)
			}
		]
	}, [cacheSize, thumbnailsSize, trackPlayerSize, offlineFilesSize, clearCache, clearThumbnails, clearTrackPlayer, clearOfflineFiles])

	return (
		<SettingsComponent
			title={translateMemoized("settings.advanced.title")}
			showSearchBar={false}
			loading={settingsAdvancedCacheQuery.status !== "success"}
			items={items}
		/>
	)
})

Advanced.displayName = "Advanced"

export default Advanced
