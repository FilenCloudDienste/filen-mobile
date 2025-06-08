import { Platform } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { memo, useMemo } from "react"
import cache from "@/lib/cache"
import { useDriveStore } from "@/stores/drive.store"
import { useTranslation } from "react-i18next"
import Android from "./android"
import IOS from "./ios"
import { validate as validateUUID } from "uuid"
import { useShallow } from "zustand/shallow"

export const Header = memo(({ queryParams }: { queryParams: FetchCloudItemsParams }) => {
	const { uuid } = useLocalSearchParams()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const { t } = useTranslation()

	const headerTitle = useMemo(() => {
		if (selectedItemsCount > 0) {
			return t("drive.header.title.selected", {
				count: selectedItemsCount
			})
		}

		if (queryParams.of === "recents" || queryParams.parent === "recents") {
			return t("drive.header.title.recents")
		}

		if (queryParams.of === "favorites" || queryParams.parent === "favorites") {
			return t("drive.header.title.favorites")
		}

		if (queryParams.of === "trash" || queryParams.parent === "trash") {
			return t("drive.header.title.trash")
		}

		if ((queryParams.of === "links" || queryParams.parent === "links") && !validateUUID(uuid)) {
			return t("drive.header.title.links")
		}

		if ((queryParams.of === "sharedIn" || queryParams.parent === "shared-in") && !validateUUID(uuid)) {
			return t("drive.header.title.sharedIn")
		}

		if ((queryParams.of === "sharedOut" || queryParams.parent === "shared-out") && !validateUUID(uuid)) {
			return t("drive.header.title.sharedOut")
		}

		return typeof uuid !== "string" || !cache.directoryUUIDToName.has(uuid)
			? t("drive.header.title.drive")
			: cache.directoryUUIDToName.get(uuid) ?? t("drive.header.title.drive")
	}, [uuid, selectedItemsCount, t, queryParams.of, queryParams.parent])

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
