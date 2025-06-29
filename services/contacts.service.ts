import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import queryUtils from "@/queries/utils"
import queryClient from "@/queries/client"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { t } from "@/lib/i18n"

export class ContactsService {
	public async remove(params: Parameters<typeof nodeWorker.proxy<"removeContact">>[1]) {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.remove.title"),
			message: t("settings.contacts.prompts.remove.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("removeContact", params)

			queryUtils.useContactsQuerySet({
				type: "all",
				updater: prev => prev.filter(c => c.uuid !== params.uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async block(params: Parameters<typeof nodeWorker.proxy<"blockContact">>[1]) {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.block.title"),
			message: t("settings.contacts.prompts.block.title")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("blockContact", params)

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "blocked"]
			})

			queryUtils.useContactsQuerySet({
				type: "all",
				updater: prev => prev.filter(c => c.email !== params.email)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async unblock(params: Parameters<typeof nodeWorker.proxy<"unblockContact">>[1]) {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.contacts.prompts.unblock.title"),
			message: t("settings.contacts.prompts.unblock.title")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("unblockContact", params)

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "all"]
			})

			queryUtils.useContactsQuerySet({
				type: "blocked",
				updater: prev => prev.filter(c => c.uuid !== params.uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async acceptRequest(params: Parameters<typeof nodeWorker.proxy<"acceptContactRequest">>[1]) {
		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("acceptContactRequest", params)

			await queryClient.refetchQueries({
				queryKey: ["useContactsQuery", "all"]
			})

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== params.uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async denyRequest(params: Parameters<typeof nodeWorker.proxy<"denyContactRequest">>[1]) {
		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("denyContactRequest", params)

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					incoming: prev.incoming.filter(r => r.uuid !== params.uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async deleteRequest(params: Parameters<typeof nodeWorker.proxy<"deleteOutgoingContactRequest">>[1]) {
		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteOutgoingContactRequest", params)

			queryUtils.useContactsRequestsQuerySet({
				updater: prev => ({
					...prev,
					outgoing: prev.outgoing.filter(r => r.uuid !== params.uuid)
				})
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async sendRequest() {
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

		const email = inputPromptResponse.text.trim()

		if (email.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

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
			fullScreenLoadingModal.hide()
		}
	}
}

export const contactsService = new ContactsService()

export default contactsService
