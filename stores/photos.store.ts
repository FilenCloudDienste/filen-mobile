import { create } from "zustand"

export type PhotosStore = {
	selectedItems: DriveCloudItem[]
	setSelectedItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
}

export const usePhotosStore = create<PhotosStore>(set => ({
	selectedItems: [],
	setSelectedItems(fn) {
		set(state => ({
			selectedItems: typeof fn === "function" ? fn(state.selectedItems) : fn
		}))
	}
}))
