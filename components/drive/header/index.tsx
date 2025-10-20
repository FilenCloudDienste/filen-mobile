import { Platform } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { memo, useMemo } from "react"
import cache from "@/lib/cache"
import { useDriveStore } from "@/stores/drive.store"
import { translateMemoized } from "@/lib/i18n"
import Android from "./android"
import IOS from "./ios"
import { validate as validateUUID } from "uuid"
import { useShallow } from "zustand/shallow"
import useSDKConfig from "@/hooks/useSDKConfig"

export const Header = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { uuid } = useLocalSearchParams()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const [{ baseFolderUUID }] = useSDKConfig()

	const headerTitle = useMemo(() => {
		if (selectedItemsCount > 0) {
			return translateMemoized("drive.header.title.selected", {
				count: selectedItemsCount
			})
		}

		if (queryParams.of === "drive" && uuid === baseFolderUUID) {
			return translateMemoized("drive.header.title.drive")
		}

		if (queryParams.of === "recents" || queryParams.parent === "recents") {
			return translateMemoized("drive.header.title.recents")
		}

		if (queryParams.of === "trash" || queryParams.parent === "trash") {
			return translateMemoized("drive.header.title.trash")
		}

		if (queryParams.of === "offline" || queryParams.parent === "offline") {
			return translateMemoized("drive.header.title.offline")
		}

		if ((queryParams.of === "links" || queryParams.parent === "links") && !validateUUID(uuid)) {
			return translateMemoized("drive.header.title.links")
		}

		if ((queryParams.of === "favorites" || queryParams.parent === "favorites") && !validateUUID(uuid)) {
			return translateMemoized("drive.header.title.favorites")
		}

		if ((queryParams.of === "sharedIn" || queryParams.parent === "shared-in") && !validateUUID(uuid)) {
			return translateMemoized("drive.header.title.sharedIn")
		}

		if ((queryParams.of === "sharedOut" || queryParams.parent === "shared-out") && !validateUUID(uuid)) {
			return translateMemoized("drive.header.title.sharedOut")
		}

		return typeof uuid !== "string" || !cache.directoryUUIDToName.has(uuid)
			? translateMemoized("drive.header.title.drive")
			: cache.directoryUUIDToName.get(uuid) ?? translateMemoized("drive.header.title.drive")
	}, [uuid, selectedItemsCount, queryParams.of, queryParams.parent, baseFolderUUID])

	if (Platform.OS === "android") {
		return (
			<Android
				headerTitle={headerTitle}
				queryParams={queryParams}
			/>
		)
	}

	return (
		<IOS
			headerTitle={headerTitle}
			queryParams={queryParams}
		/>
	)
})

Header.displayName = "Header"

export default Header
