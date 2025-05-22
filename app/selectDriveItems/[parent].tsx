import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import SelectDriveItemsComponent from "@/components/selectDriveItems"
import { type PreviewType } from "@/stores/gallery.store"

export type SelectDriveItemsResponse =
	| {
			cancelled: false
			items: DriveCloudItem[]
	  }
	| {
			cancelled: true
	  }

export type SelectDriveItemsParams = {
	type: "file" | "directory"
	max: number
	dismissHref: string
	toMove?: string[]
	extensions?: string[]
	previewTypes?: PreviewType[]
	multiScreen?: boolean
}

export type SelectDriveItemsEvent =
	| {
			type: "request"
			data: {
				id: string
			} & SelectDriveItemsParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & SelectDriveItemsResponse
	  }

export function selectDriveItems(params: SelectDriveItemsParams): Promise<SelectDriveItemsResponse> {
	return new Promise<SelectDriveItemsResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("selectDriveItems", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("selectDriveItems", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export default function SelectDriveItems() {
	return <SelectDriveItemsComponent />
}
