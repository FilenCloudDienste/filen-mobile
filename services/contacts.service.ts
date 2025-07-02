import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import queryUtils from "@/queries/utils"
import queryClient from "@/queries/client"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { t } from "@/lib/i18n"
import { selectContacts } from "@/app/selectContacts"

export class ContactsService {
	public async removeContact({ uuid, disableLoader }: { uuid?: string; disableLoader?: boolean }) {
		if (!uuid) {
			const selectContactsResponse = await selectContacts({
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

			uuid = contact.uuid
		}

		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.remove.title"),
			message: t("settings.contacts.prompts.remove.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("removeContact", {
				uuid
			})

			queryUtils.useContactsQuerySet({
				type: "all",
				updater: prev => prev.filter(c => c.uuid !== uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async blockContact({ email, disableLoader }: { email?: string; disableLoader?: boolean }) {
		if (!email) {
			const selectContactsResponse = await selectContacts({
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

		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.block.title"),
			message: t("settings.contacts.prompts.block.title")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("blockContact", {
				email
			})

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "blocked"]
			})

			queryUtils.useContactsQuerySet({
				type: "all",
				updater: prev => prev.filter(c => c.email !== email)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async unblockContact({ uuid, disableLoader }: { uuid?: string; disableLoader?: boolean }) {
		if (!uuid) {
			const selectContactsResponse = await selectContacts({
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

		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.unblock.title"),
			message: t("settings.contacts.prompts.unblock.title")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("unblockContact", {
				uuid
			})

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "all"]
			})

			queryUtils.useContactsQuerySet({
				type: "blocked",
				updater: prev => prev.filter(c => c.uuid !== uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
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

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "all"]
			})

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
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

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
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

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					outgoing: prev.outgoing.filter(r => r.uuid !== uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async sendRequest({ email, disableLoader }: { email?: string; disableLoader?: boolean }) {
		if (!email) {
			const inputPromptResponse = await inputPrompt({
				title: t("settings.contacts.prompts.sendRequest.title"),
				materialIcon: {
					name: "email"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("settings.contacts.prompts.sendRequest.placeholder")
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

			await queryClient.refetchQueries({
				queryKey: ["useContactsRequestsQuery"]
			})

			alerts.normal(
				t("settings.contacts.prompts.sendRequest.success", {
					email
				})
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
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
