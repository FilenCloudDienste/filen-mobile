import { create } from "zustand"
import { validate as validateUUID } from "uuid"

export type PreviewType = "image" | "video" | "unknown" | "pdf" | "text" | "code" | "audio" | "docx"

export type GalleryItem =
	| {
			itemType: "cloudItem"
			previewType: PreviewType
			data: {
				item: DriveCloudItem
				queryParams: FetchCloudItemsParams
			}
	  }
	| {
			itemType: "remoteItem"
			previewType: PreviewType
			data: {
				uri: string
			}
	  }

export type GalleryStore = {
	visible: boolean
	initialUUID: string | null
	items: GalleryItem[]
	initialIndex: number | null
	currentVisibleIndex: number | null
	zoomedIn: boolean
	setVisible: (fn: boolean | ((prev: boolean) => boolean)) => void
	setInitialUUID: (fn: string | null | ((prev: string | null) => string | null)) => void
	setItems: (fn: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void
	setInitialIndex: (fn: (number | null) | ((prev: number | null) => number | null)) => void
	setCurrentVisibleIndex: (fn: number | null | ((prev: number | null) => number | null)) => void
	setZoomedIn: (fn: boolean | ((prev: boolean) => boolean)) => void
	reset: () => void
	open: ({ items, initialUUIDOrURI }: { items: GalleryItem[]; initialUUIDOrURI: string }) => void
}

export const useGalleryStore = create<GalleryStore>(set => ({
	visible: false,
	initialUUID: null,
	items: [],
	currentVisibleIndex: null,
	initialIndex: null,
	zoomedIn: false,
	setInitialIndex(fn) {
		set(state => ({
			initialIndex: typeof fn === "function" ? fn(state.initialIndex) : fn
		}))
	},
	setVisible(fn) {
		set(state => ({
			visible: typeof fn === "function" ? fn(state.visible) : fn
		}))
	},
	setInitialUUID(fn) {
		set(state => ({
			initialUUID: typeof fn === "function" ? fn(state.initialUUID) : fn
		}))
	},
	setItems(fn) {
		set(state => ({
			items: typeof fn === "function" ? fn(state.items) : fn
		}))
	},
	setCurrentVisibleIndex(fn) {
		set(state => ({
			currentVisibleIndex: typeof fn === "function" ? fn(state.currentVisibleIndex) : fn
		}))
	},
	setZoomedIn(fn) {
		set(state => ({
			zoomedIn: typeof fn === "function" ? fn(state.zoomedIn) : fn
		}))
	},
	reset() {
		set(() => ({
			visible: false,
			initialUUID: null,
			items: [],
			currentVisibleIndex: null,
			initialIndex: null,
			zoomedIn: false
		}))
	},
	open({ items, initialUUIDOrURI }) {
		if (items.length === 0) {
			return
		}

		const foundIndex = items.findIndex(item => {
			if (item.itemType === "cloudItem" && item.data.item.uuid === initialUUIDOrURI) {
				return true
			}

			if (item.itemType === "remoteItem" && item.data.uri === initialUUIDOrURI) {
				return true
			}

			return false
		})

		const index = foundIndex === -1 ? 0 : foundIndex

		set(() => ({
			visible: true,
			initialUUIDOrURI: validateUUID(initialUUIDOrURI) ? initialUUIDOrURI : null,
			items: items,
			initialIndex: index,
			currentVisibleIndex: index,
			zoomedIn: false
		}))
	}
}))
