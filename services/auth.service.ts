import nodeWorker from "@/lib/nodeWorker"
import setup from "@/lib/setup"
import { setSDKConfig, setIsAuthed } from "@/lib/auth"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { t } from "@/lib/i18n"

export class AuthService {
	public async login({ email, password, twoFactorCode }: { email: string; password: string; twoFactorCode?: string }): Promise<boolean> {
		fullScreenLoadingModal.show()

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
				if (e.message.toLowerCase().includes("enter_2fa") || e.message.toLowerCase().includes("two factor")) {
					const twoFactorCodePrompt = await inputPrompt({
						title: t("drive.header.rightView.actionSheet.create.directory"),
						materialIcon: {
							name: "pencil"
						},
						prompt: {
							type: "secure-text",
							keyboardType: "default",
							defaultValue: "",
							placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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
			fullScreenLoadingModal.hide()
		}
	}

	public async register({ email, password }: { email: string; password: string }): Promise<void> {
		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("register", {
				email,
				password
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

	public async resendConfirmation(): Promise<void> {
		const emailPrompt = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "email-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "email-address",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
			}
		})

		if (emailPrompt.cancelled || emailPrompt.type !== "text") {
			return
		}

		const email = emailPrompt.text.trim()

		if (email.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("resendConfirmation", {
				email
			})

			alerts.normal("Confirmation email resent successfully.")
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}

	public async forgotPassword(): Promise<void> {
		const emailPrompt = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "email-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "email-address",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
			}
		})

		if (emailPrompt.cancelled || emailPrompt.type !== "text") {
			return
		}

		const email = emailPrompt.text.trim()

		if (email.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("forgotPassword", {
				email
			})

			alerts.normal("Instructions to reset your password have been sent to your email.")
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

export const authService = new AuthService()

export default authService
