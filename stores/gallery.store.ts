import { create } from "zustand"
import { getPreviewType } from "@/lib/utils"
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
	currentVisibleIndex: number | null
	zoomedIn: boolean
	setVisible: (fn: boolean | ((prev: boolean) => boolean)) => void
	setInitialUUID: (fn: string | null | ((prev: string | null) => string | null)) => void
	setItems: (fn: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void
	setCurrentVisibleIndex: (fn: (number | null) | ((prev: number | null) => number | null)) => void
	setZoomedIn: (fn: boolean | ((prev: boolean) => boolean)) => void
	reset: () => void
	open: ({
		items,
		initialUUIDOrURI,
		queryParams
	}: {
		items: DriveCloudItem[]
		initialUUIDOrURI: string
		queryParams: FetchCloudItemsParams
	}) => void
}

export const useGalleryStore = create<GalleryStore>(set => ({
	visible: false,
	initialUUID: null,
	items: [],
	currentVisibleIndex: null,
	zoomedIn: false,
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
			zoomedIn: false
		}))
	},
	open({ items, initialUUIDOrURI, queryParams }) {
		const galleryItems: GalleryItem[] = items
			.map(item => {
				const previewType = getPreviewType(item.name)

				return item.size > 0
					? {
							itemType: "cloudItem" as const,
							previewType,
							data: {
								item,
								queryParams
							}
					  }
					: null
			})
			.filter(item => item !== null) satisfies GalleryItem[]

		if (galleryItems.length === 0) {
			return
		}

		const foundIndex = galleryItems.findIndex(item => {
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
			items: galleryItems,
			currentVisibleIndex: index,
			zoomedIn: false
		}))
	}
}))
