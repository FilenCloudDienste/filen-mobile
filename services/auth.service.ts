import nodeWorker from "@/lib/nodeWorker"
import setup from "@/lib/setup"
import { setSDKConfig, setIsAuthed } from "@/lib/auth"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { t } from "@/lib/i18n"

export class AuthService {
	public async login({
		email,
		password,
		twoFactorCode,
		disableLoader
	}: {
		email: string
		password: string
		twoFactorCode?: string
		disableLoader?: boolean
	}): Promise<boolean> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const sdkConfig = await nodeWorker.proxy("login", {
				email,
				password,
				twoFactorCode: twoFactorCode ?? "XXXXXX"
			})

			await setup({
				isAuthed: true,
				sdkConfig
			})

			setSDKConfig(sdkConfig)
			setIsAuthed(true)

			return true
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				if (e.message.toLowerCase().includes("please enter your two factor authentication code")) {
					const twoFactorCodePrompt = await inputPrompt({
						title: t("auth.prompts.2fa.title"),
						materialIcon: {
							name: "lock-outline"
						},
						prompt: {
							type: "secure-text",
							keyboardType: "default",
							defaultValue: "",
							placeholder: t("auth.prompts.2fa.placeholder")
						}
					})

					if (twoFactorCodePrompt.cancelled || twoFactorCodePrompt.type !== "text") {
						return false
					}

					const twoFactorCode = twoFactorCodePrompt.text.trim()

					if (twoFactorCode.length === 0) {
						return false
					}

					return await this.login({
						email,
						password,
						twoFactorCode
					})
				}

				alerts.error(e.message)
			}

			return false
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async register({
		email,
		password,
		disableLoader,
		disableAlert
	}: {
		email: string
		password: string
		disableLoader?: boolean
		disableAlert?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("register", {
				email,
				password
			})

			if (!disableAlert) {
				alerts.normal(t("auth.registrationSuccessful"))
			}
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

	public async resendConfirmation({
		disableAlert,
		disableLoader,
		email
	}: {
		disableAlert?: boolean
		disableLoader?: boolean
		email?: string
	}): Promise<void> {
		if (!email) {
			const emailPrompt = await inputPrompt({
				title: t("auth.prompts.resendConfirmation.title"),
				materialIcon: {
					name: "email-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "email-address",
					defaultValue: "",
					placeholder: t("auth.prompts.resendConfirmation.placeholder")
				}
			})

			if (emailPrompt.cancelled || emailPrompt.type !== "text") {
				return
			}

			const typedEmail = emailPrompt.text.trim()

			if (typedEmail.length === 0) {
				return
			}

			email = typedEmail
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("resendConfirmation", {
				email
			})

			if (!disableAlert) {
				alerts.normal(t("auth.prompts.resendConfirmation.success"))
			}
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

	public async forgotPassword({
		disableAlert,
		disableLoader,
		email
	}: {
		disableAlert?: boolean
		disableLoader?: boolean
		email?: string
	}): Promise<void> {
		if (!email) {
			const emailPrompt = await inputPrompt({
				title: t("auth.prompts.forgotPassword.title"),
				materialIcon: {
					name: "email-outline"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "email-address",
					defaultValue: "",
					placeholder: t("auth.prompts.forgotPassword.placeholder")
				}
			})

			if (emailPrompt.cancelled || emailPrompt.type !== "text") {
				return
			}

			const typedEmail = emailPrompt.text.trim()

			if (typedEmail.length === 0) {
				return
			}

			email = typedEmail
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("forgotPassword", {
				email
			})

			if (!disableAlert) {
				alerts.normal(t("auth.prompts.forgotPassword.success"))
			}
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

export const authService = new AuthService()

export default authService
