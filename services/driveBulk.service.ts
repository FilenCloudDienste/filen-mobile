import driveService from "./drive.service"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { colorPicker } from "@/components/sheets/colorPickerSheet"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import contactsService from "./contacts.service"
import { promiseAllChunked } from "@/lib/utils"
import type { Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"

export class DriveBulkService {
	public async shareItems({
		items,
		disableLoader,
		contacts
	}: {
		items: DriveCloudItem[]
		disableLoader?: boolean
		contacts?: Contact[]
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!contacts) {
			const selectContactsResponse = await contactsService.selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (contacts.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.shareItem({
						item,
						disableAlert: true,
						contacts,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleItemsFavorite({
		items,
		favorite,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		favorite: boolean
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.toggleItemFavorite({
						item,
						favorite,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async changeDirectoryColors({
		items,
		queryParams,
		disableLoader,
		color
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		color?: string
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!color) {
			const colorPickerResponse = await colorPicker({
				currentColor: DEFAULT_DIRECTORY_COLOR
			})

			if (colorPickerResponse.cancelled) {
				return
			}

			const pickedColor = colorPickerResponse.color.trim().toLowerCase()

			if (!pickedColor || pickedColor.length === 0) {
				return
			}

			color = pickedColor
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.changeDirectoryColor({
						item,
						color,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async moveItems({
		items,
		queryParams,
		dismissHref,
		disableLoader,
		parent
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		dismissHref?: string
		disableLoader?: boolean
		parent?: string
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!parent) {
			const selectDriveItemsResponse = await driveService.selectDriveItems({
				type: "directory",
				max: 1,
				dismissHref: dismissHref ?? "/drive",
				toMove: items.map(item => item.uuid)
			})

			if (selectDriveItemsResponse.cancelled || selectDriveItemsResponse.items.length !== 1) {
				return
			}

			const selectedParent = selectDriveItemsResponse.items.at(0)?.uuid

			if (!selectedParent) {
				return
			}

			parent = selectedParent
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.moveItem({
						item,
						parent,
						dismissHref,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeSharedOutItems({
		items,
		queryParams,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.removeSharedOutItems.title"),
				message: t("drive.prompts.removeSharedOutItems.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.removeItemSharedOut({
						item,
						queryParams,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async removeSharedInItems({
		items,
		queryParams,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.removeSharedInItems.title"),
				message: t("drive.prompts.removeSharedInItems.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.removeItemSharedIn({
						item,
						queryParams,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async disablePublicLinks({
		items,
		queryParams,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.disablePublicLinks.title"),
				message: t("drive.prompts.disablePublicLinks.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.disableItemPublicLink({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async trashItems({
		items,
		queryParams,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.trashItems.title"),
				message: t("drive.prompts.trashItems.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.trashItem({
						item,
						queryParams,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async restoreItems({
		items,
		queryParams,
		disableLoader
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.restoreItem({
						item,
						queryParams,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteItemsPermanently({
		items,
		queryParams,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		queryParams?: FetchCloudItemsParams
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.deleteItemsPermanently.title"),
				message: t("drive.prompts.deleteItemsPermanently.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items.map(item =>
					driveService.deleteItemPermanently({
						item,
						queryParams,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleItemsOffline({
		items,
		offline,
		disableLoader,
		disableAlertPrompt
	}: {
		items: DriveCloudItem[]
		offline?: boolean
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!offline && !disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("drive.prompts.removeOfflineFiles.title"),
				message: t("drive.prompts.removeOfflineFiles.message", {
					count: items.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.toggleItemOffline({
							item,
							offline,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async saveItemsToGallery({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.saveItemToGallery({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async downloadItems({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.downloadItem({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async exportItems({ items, disableLoader }: { items: DriveCloudItem[]; disableLoader?: boolean }): Promise<void> {
		if (items.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				items
					.filter(item => item.size > 0)
					.map(item =>
						driveService.exportItem({
							item,
							disableLoader: true
						})
					)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const driveBulkService = new DriveBulkService()

export default driveBulkService
