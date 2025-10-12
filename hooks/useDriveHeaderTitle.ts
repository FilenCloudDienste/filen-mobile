import useSDKConfig from "@/hooks/useSDKConfig"
import cache from "@/lib/cache"
import { useDriveStore } from "@/stores/drive.store"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { validate as validateUUID } from "uuid"
import { useShallow } from "zustand/shallow"

type Params = {
	uuid: string | string[] | undefined
	queryParams: { of: string; parent?: string }
}

/**
 * Decide what title to display in the drive screen based on current item's uuid and queryParams
 */
export function useDriveHeaderTitle({ uuid, queryParams }: Params) {
	const [{ baseFolderUUID }] = useSDKConfig()
	const selectedItemsCount = useDriveStore(useShallow(state => state.selectedItems.length))
	const { t } = useTranslation()

	return useMemo(() => {
		if (selectedItemsCount > 0) {
			return t("drive.header.title.selected", {
				count: selectedItemsCount
			})
		}

		if (queryParams.of === "drive" && uuid === baseFolderUUID) {
			return t("drive.header.title.drive")
		}

		if (queryParams.of === "recents" || queryParams.parent === "recents") {
			return t("drive.header.title.recents")
		}

		if (queryParams.of === "trash" || queryParams.parent === "trash") {
			return t("drive.header.title.trash")
		}

		if (queryParams.of === "offline" || queryParams.parent === "offline") {
			return t("drive.header.title.offline")
		}

		if ((queryParams.of === "links" || queryParams.parent === "links") && !validateUUID(uuid)) {
			return t("drive.header.title.links")
		}

		if ((queryParams.of === "favorites" || queryParams.parent === "favorites") && !validateUUID(uuid)) {
			return t("drive.header.title.favorites")
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
	}, [uuid, selectedItemsCount, t, queryParams.of, queryParams.parent, baseFolderUUID])
}
