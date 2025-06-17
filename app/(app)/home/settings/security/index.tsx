import { memo, useCallback } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import useAccountQuery from "@/queries/useAccountQuery"
import { useRouter } from "expo-router"
import nodeWorker from "@/lib/nodeWorker"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { ratePasswordStrength } from "@/lib/utils"
import { logout } from "@/lib/auth"
import { alertPrompt } from "@/components/prompts/alertPrompt"

export type BiometricAuth = {
	enabled: boolean
	code: string
	lastLock: number
	lockAfter: number
	tries: number
	triesLockedUntil: number
	pinOnly: boolean
}

export const BIOMETRIC_AUTH_KEY = "biometricAuth"
export const BIOMETRIC_MAX_TRIES = 10

export const Security = memo(() => {
	const router = useRouter()
	const { t } = useTranslation()

	const account = useAccountQuery({
		enabled: false
	})

	const changePassword = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Change password",
			message: "After changing your password, you will be logged out and need to log in again with the new password."
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		const request = {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: ""
		}

		const currentPasswordPrompt = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: "Password"
			}
		})

		if (currentPasswordPrompt.cancelled || currentPasswordPrompt.type !== "text") {
			return
		}

		request.currentPassword = currentPasswordPrompt.text

		if (request.currentPassword.length === 0) {
			return
		}

		const newPasswordPrompt = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: "Password"
			}
		})

		if (newPasswordPrompt.cancelled || newPasswordPrompt.type !== "text") {
			return
		}

		request.newPassword = newPasswordPrompt.text

		if (request.newPassword.length === 0) {
			return
		}

		const confirmNewPasswordPrompt = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: "Password"
			}
		})

		if (confirmNewPasswordPrompt.cancelled || confirmNewPasswordPrompt.type !== "text") {
			return
		}

		request.confirmNewPassword = confirmNewPasswordPrompt.text

		if (request.confirmNewPassword.length === 0) {
			return
		}

		if (request.newPassword !== request.confirmNewPassword) {
			alerts.error("New passwords do not match.")

			return
		}

		const passwordStrength = ratePasswordStrength(request.newPassword)

		if (passwordStrength.strength === "weak") {
			alerts.error(
				"Your new password is too weak. Please choose a stronger password. One that is at least 10 characters long, contains a mix of uppercase and lowercase letters, numbers, and special characters."
			)

			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("changePassword", {
				currentPassword: request.currentPassword,
				newPassword: request.newPassword
			})

			await account.refetch()

			logout()

			router.replace({
				pathname: "/(auth)"
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t, router])

	const openTwoFactorAuthentication = useCallback(() => {
		router.push({
			pathname: "/home/settings/security/twoFactor"
		})
	}, [router])

	const openBiometric = useCallback(() => {
		router.push({
			pathname: "/home/settings/security/biometric"
		})
	}, [router])

	return (
		<SettingsComponent
			title="Security"
			showSearchBar={false}
			loading={account.status !== "success"}
			items={[
				{
					id: "0",
					title: "Change password",
					onPress: changePassword
				},
				{
					id: "1",
					title: "Two Factor Authentication",
					onPress: openTwoFactorAuthentication
				},
				{
					id: "2",
					title: "Biometric Authentication",
					onPress: openBiometric
				}
			]}
		/>
	)
})

Security.displayName = "Security"

export default Security
