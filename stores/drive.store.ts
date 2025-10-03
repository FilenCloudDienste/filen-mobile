import { create } from "zustand"

export type DriveStore = {
	searchTerm: string
	selectedItems: DriveCloudItem[]
	setSearchTerm: (fn: string | ((prev: string) => string)) => void
	setSelectedItems: (fn: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])) => void
}

export const useDriveStore = create<DriveStore>(set => ({
	searchTerm: "",
	selectedItems: [],
	setSearchTerm(fn) {
		set(state => ({
			searchTerm: typeof fn === "function" ? fn(state.searchTerm) : fn
		}))
	},
	setSelectedItems(fn) {
		set(state => ({
			selectedItems: typeof fn === "function" ? fn(state.selectedItems) : fn
		}))
	}
}))
