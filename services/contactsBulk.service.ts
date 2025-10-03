import contactsService from "./contacts.service"
import type { Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import type { ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { promiseAllChunked } from "@/lib/utils"

export class ContactsBulkService {
	public async removeContacts({
		contacts,
		disableLoader,
		disableAlertPrompt
	}: {
		contacts?: Contact[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!contacts) {
			const selectContactsResponse = await contactsService.selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (contacts.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("settings.contacts.prompts.removeContacts.title"),
				message: t("settings.contacts.prompts.removeContacts.message", {
					count: contacts.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				contacts.map(contact =>
					contactsService.removeContact({
						uuid: contact.uuid,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async blockContacts({
		contacts,
		disableLoader,
		disableAlertPrompt
	}: {
		contacts?: Contact[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!contacts) {
			const selectContactsResponse = await contactsService.selectContacts({
				type: "all",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (contacts.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("settings.contacts.prompts.blockContacts.title"),
				message: t("settings.contacts.prompts.blockContacts.message", {
					count: contacts.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				contacts.map(contact =>
					contactsService.blockContact({
						email: contact.email,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async unblockContacts({
		contacts,
		disableLoader,
		disableAlertPrompt
	}: {
		contacts?: Contact[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!contacts) {
			const selectContactsResponse = await contactsService.selectContacts({
				type: "blocked",
				max: 9999
			})

			if (selectContactsResponse.cancelled || selectContactsResponse.contacts.length === 0) {
				return
			}

			contacts = selectContactsResponse.contacts
		}

		if (contacts.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("settings.contacts.prompts.unblockContacts.title"),
				message: t("settings.contacts.prompts.unblockContacts.message", {
					count: contacts.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				contacts.map(contact =>
					contactsService.unblockContact({
						uuid: contact.uuid,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async acceptRequests({ requests, disableLoader }: { requests: ContactRequest[]; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				requests.map(request =>
					contactsService.acceptRequest({
						uuid: request.uuid,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async denyRequests({ requests, disableLoader }: { requests: ContactRequest[]; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				requests.map(request =>
					contactsService.denyRequest({
						uuid: request.uuid,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteRequests({ requests, disableLoader }: { requests: ContactRequest[]; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				requests.map(request =>
					contactsService.deleteRequest({
						uuid: request.uuid,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const contactsBulkService = new ContactsBulkService()

export default contactsBulkService
