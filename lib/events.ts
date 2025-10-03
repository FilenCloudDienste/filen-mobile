import { EventEmitter } from "eventemitter3"
import type { SocketEvent } from "@filen/sdk"
import type { InputPromptEvent } from "@/components/prompts/inputPrompt"
import type { ColorPickerEvent } from "@/components/sheets/colorPickerSheet"
import type { ItemInfoEvent } from "@/components/sheets/itemInfoSheet"
import type { FullScreenLoadingModalEvent } from "@/components/modals/fullScreenLoadingModal"
import type { SelectContactsEvent } from "@/services/contacts.service"
import type { SelectDriveItemsEvent } from "@/services/drive.service"
import type { AlertPromptEvent } from "@/components/prompts/alertPrompt"
import type { SelectTrackPlayerPlaylistsEvent } from "@/services/trackPlayer.service"

export type Events = {
	socketEvent: SocketEvent
	inputPrompt: InputPromptEvent
	alertPrompt: AlertPromptEvent
	colorPicker: ColorPickerEvent
	itemInfo: ItemInfoEvent
	fullScreenLoadingModal: FullScreenLoadingModalEvent
	shareItemsProgress: {
		shared: number
		total: number
	}
	selectContacts: SelectContactsEvent
	selectDriveItems: SelectDriveItemsEvent
	selectTrackPlayerPlaylists: SelectTrackPlayerPlaylistsEvent
	toggleItemPublicLinkProgress: {
		linked: number
		total: number
	}
	scrollToItem: {
		uuid: string
		type: "file" | "directory"
		parent: string
	}
	hideSearchBar: {
		clearText: boolean
	}
	focusNotesChecklistItem: {
		id: string
	}
}

export class TypedEventEmitter<T> {
	private readonly emitter = new EventEmitter()

	public subscribe<K extends keyof T>(event: K, listener: (payload: T[K]) => void) {
		this.emitter.addListener(event as string, listener)

		return {
			remove: () => {
				this.emitter.removeListener(event as string, listener)
			}
		}
	}

	public emit<K extends keyof T>(event: K, payload: T[K]): boolean {
		return this.emitter.emit(event as string, payload)
	}

	public on<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
		this.emitter.on(event as string, listener)

		return this
	}

	public once<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
		this.emitter.once(event as string, listener)

		return this
	}

	public off<K extends keyof T>(event: K, listener: (payload: T[K]) => void): this {
		this.emitter.off(event as string, listener)

		return this
	}
}

export const events = new TypedEventEmitter<Events>()

export default events
