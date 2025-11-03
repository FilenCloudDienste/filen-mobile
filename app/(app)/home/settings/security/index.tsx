import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import useAccountQuery from "@/queries/useAccount.query"
import { useRouter } from "expo-router"
import nodeWorker from "@/lib/nodeWorker"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { translateMemoized } from "@/lib/i18n"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { ratePasswordStrength } from "@/lib/utils"
import authService from "@/services/auth.service"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import mmkvInstance from "@/lib/mmkv"

export type BiometricAuth = {
	enabled: boolean
	code: string
	lastLock: number
	lockAfter: number
	tries: number
	triesLockedUntil: number
	triesLockedUntilMultiplier: number
	pinOnly: boolean
}

export const BIOMETRIC_AUTH_KEY = "biometricAuth"
export const BIOMETRIC_MAX_TRIES = 10

export function getBiometricAuth(): BiometricAuth | null {
	try {
		const biometricAuth = JSON.parse(mmkvInstance.getString(BIOMETRIC_AUTH_KEY) ?? "{}") as BiometricAuth

		if (biometricAuth) {
			return biometricAuth
		}

		return null
	} catch {
		return null
	}
}

export function setBiometricAuth(biometricAuth: BiometricAuth): void {
	try {
		mmkvInstance.set(BIOMETRIC_AUTH_KEY, JSON.stringify(biometricAuth))
	} catch (e) {
		console.error(e)

		if (e instanceof Error) {
			alerts.error(e.message)
		}
	}
}

export function clearBiometricAuth(): void {
	try {
		mmkvInstance.delete(BIOMETRIC_AUTH_KEY)
	} catch (e) {
		console.error(e)

		if (e instanceof Error) {
			alerts.error(e.message)
		}
	}
}

export const Security = memo(() => {
	const router = useRouter()

	const account = useAccountQuery({
		enabled: false
	})

	const changePassword = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: translateMemoized("settings.security.prompts.changePassword1.title"),
			message: translateMemoized("settings.security.prompts.changePassword1.message")
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
			title: translateMemoized("settings.security.prompts.currentPassword.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: translateMemoized("settings.security.prompts.currentPassword.placeholder")
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
			title: translateMemoized("settings.security.prompts.newPassword.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: translateMemoized("settings.security.prompts.newPassword.placeholder")
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
			title: translateMemoized("settings.security.prompts.confirmNewPassword.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: translateMemoized("settings.security.prompts.confirmNewPassword.placeholder")
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
			alerts.error(translateMemoized("settings.security.errors.passwordsDoNotMatch"))

			return
		}

		const passwordStrength = ratePasswordStrength(request.newPassword)

		if (passwordStrength.strength === "weak") {
			alerts.error(translateMemoized("settings.security.errors.weak"))

			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("changePassword", {
				currentPassword: request.currentPassword,
				newPassword: request.newPassword
			})

			await authService.logout({
				disableAlertPrompt: true,
				disableLoader: true
			})

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
	}, [router])

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

	const exportMasterKeys = useCallback(async () => {
		const response = await alertPrompt({
			title: translateMemoized("alertPrompt.exportMasterKeys2.title"),
			message: translateMemoized("alertPrompt.exportMasterKeys2.message"),
			okText: translateMemoized("alertPrompt.exportMasterKeys2.okText"),
			cancelText: translateMemoized("alertPrompt.exportMasterKeys2.cancelText")
		})

		if (response.cancelled) {
			return
		}

		try {
			await authService.exportMasterKeys({})
			await nodeWorker.proxy("didExportMasterKeys", undefined)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: translateMemoized("settings.security.items.changePassword"),
				onPress: changePassword,
				leftView: (
					<IconView
						name="lock-outline"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "1",
				title: translateMemoized("settings.security.items.2fa"),
				onPress: openTwoFactorAuthentication,
				leftView: (
					<IconView
						name="shield-outline"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "2",
				title: translateMemoized("settings.security.items.biometricAuth"),
				onPress: openBiometric,
				leftView: (
					<IconView
						name="lock-open-alert-outline"
						className="bg-gray-500"
					/>
				)
			},
			{
				id: "3",
				title: translateMemoized("settings.security.items.exportMasterKeys"),
				onPress: exportMasterKeys,
				leftView: (
					<IconView
						name="key-outline"
						className="bg-gray-500"
					/>
				)
			}
		]
	}, [changePassword, openBiometric, openTwoFactorAuthentication, exportMasterKeys])

	return (
		<SettingsComponent
			title={translateMemoized("settings.security.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Security.displayName = "Security"

export default Security
