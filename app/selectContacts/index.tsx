import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import SelectContactsComponent from "@/components/selectContacts"
import { Fragment } from "react"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import { Platform } from "react-native"

export type SelectContactsResponse =
	| {
			cancelled: false
			contacts: Contact[]
	  }
	| {
			cancelled: true
	  }

export type SelectContactsParams = { type: "all" | "blocked" } & {
	max: number
}

export type SelectContactsEvent =
	| {
			type: "request"
			data: {
				id: string
			} & SelectContactsParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & SelectContactsResponse
	  }

export function selectContacts(params: SelectContactsParams): Promise<SelectContactsResponse> {
	return new Promise<SelectContactsResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("selectContacts", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("selectContacts", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export default function SelectContacts() {
	return (
		<Fragment>
			<SelectContactsComponent />
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</Fragment>
	)
}
