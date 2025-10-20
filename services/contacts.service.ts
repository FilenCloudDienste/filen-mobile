import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { translateMemoized, t } from "@/lib/i18n"
import { Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { randomUUID } from "expo-crypto"
import events from "@/lib/events"
import { contactsQueryUpdate, contactsQueryRefetch } from "@/queries/useContacts.query"
import { contactsRequestsQueryRefetch, contactsRequestsQueryUpdate } from "@/queries/useContactsRequests.query"

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

export class ContactsService {
	public async selectContacts(params: SelectContactsParams): Promise<SelectContactsResponse> {
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

	public async removeContact({
		uuid,
		disableLoader,
		disableAlertPrompt
	}: {
		uuid?: string
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}) {
		if (!uuid) {
			const selectContactsResponse = await this.selectContacts({
				type: "all",
				max: 1
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			const contact = selectContactsResponse.contacts.at(0)

			if (!contact) {
				return
			}

			uuid = contact.uuid
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: translateMemoized("settings.contacts.prompts.removeContact.title"),
				message: translateMemoized("settings.contacts.prompts.removeContact.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("removeContact", {
				uuid
			})

			contactsQueryUpdate({
				params: {
					type: "all"
				},
				updater: prev => prev.filter(c => c.uuid !== uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async blockContact({
		email,
		disableLoader,
		disableAlertPrompt
	}: {
		email?: string
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}) {
		if (!email) {
			const selectContactsResponse = await this.selectContacts({
				type: "all",
				max: 1
			})

			if (selectContactsResponse.cancelled) {
				return
			}

			const contact = selectContactsResponse.contacts.at(0)

			if (!contact) {
				return
			}

			email = contact.email
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: translateMemoized("settings.contacts.prompts.blockContact.title"),
				message: translateMemoized("settings.contacts.prompts.blockContact.title")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("blockContact", {
				email
			})

			await contactsQueryRefetch({
				type: "blocked"
			})

			contactsQueryUpdate({
				params: {
					type: "all"
				},
				updater: prev => prev.filter(c => c.email !== email)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async unblockContact({
		uuid,
		disableLoader,
		disableAlertPrompt
	}: {
		uuid?: string
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}) {
		if (!uuid) {
			const selectContactsResponse = await this.selectContacts({
				type: "blocked",
				max: 1
			})

			if (selectContactsResponse.cancelled) {
				return
			}

			const contact = selectContactsResponse.contacts.at(0)

			if (!contact) {
				return
			}

			uuid = contact.uuid
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: translateMemoized("settings.contacts.prompts.unblockContact.title"),
				message: translateMemoized("settings.contacts.prompts.unblockContact.title")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("unblockContact", {
				uuid
			})

			await contactsQueryRefetch({
				type: "all"
			})

			contactsQueryUpdate({
				params: {
					type: "blocked"
				},
				updater: prev => prev.filter(c => c.uuid !== uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async acceptRequest({ uuid, disableLoader }: { uuid: string; disableLoader?: boolean }) {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("acceptContactRequest", {
				uuid
			})

			await contactsQueryRefetch({
				type: "all"
			})

			contactsRequestsQueryUpdate({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== uuid)
				})
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async denyRequest({ uuid, disableLoader }: { uuid: string; disableLoader?: boolean }) {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("denyContactRequest", {
				uuid
			})

			contactsRequestsQueryUpdate({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== uuid)
				})
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteRequest({ uuid, disableLoader }: { uuid: string; disableLoader?: boolean }) {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("deleteOutgoingContactRequest", {
				uuid
			})

			contactsRequestsQueryUpdate({
				updater: prev => ({
					...prev,
					outgoing: prev.outgoing.filter(r => r.uuid !== uuid)
				})
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async sendRequest({ email, disableLoader, disableAlert }: { email?: string; disableLoader?: boolean; disableAlert?: boolean }) {
		if (!email) {
			const inputPromptResponse = await inputPrompt({
				title: translateMemoized("settings.contacts.prompts.sendRequest.title"),
				materialIcon: {
					name: "email"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: translateMemoized("settings.contacts.prompts.sendRequest.placeholder")
				}
			})

			if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
				return
			}

			const typedEmail = inputPromptResponse.text.trim()

			if (typedEmail.length === 0) {
				return
			}

			email = typedEmail
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("sendContactRequest", {
				email
			})

			await contactsRequestsQueryRefetch()

			if (!disableAlert) {
				alerts.normal(
					t("settings.contacts.prompts.sendRequest.success", {
						email
					})
				)
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const contactsService = new ContactsService()

export default contactsService
