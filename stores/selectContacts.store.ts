import { create } from "zustand"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"

export type SelectContactsStore = {
	selectedContacts: Contact[]
	setSelectedContacts: (fn: Contact[] | ((prev: Contact[]) => Contact[])) => void
}

export const useSelectContactsStore = create<SelectContactsStore>(set => ({
	selectedContacts: [],
	setSelectedContacts(fn) {
		set(state => ({
			selectedContacts: typeof fn === "function" ? fn(state.selectedContacts) : fn
		}))
	}
}))
