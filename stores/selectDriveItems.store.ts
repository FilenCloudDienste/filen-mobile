import { create } from "zustand"

export type SelectDriveItemsStore = {
	selectedItems: DriveCloudItem[]
	setSelectedItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
}

export const useSelectDriveItemsStore = create<SelectDriveItemsStore>(set => ({
	selectedItems: [],
	setSelectedItems(fn) {
		set(state => ({
			selectedItems: typeof fn === "function" ? fn(state.selectedItems) : fn
		}))
	}
}))
