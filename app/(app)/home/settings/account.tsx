import { memo, useMemo, useCallback } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import Avatar from "@/components/avatar"
import useAccountQuery from "@/queries/useAccountQuery"
import { contactName, formatBytes, sanitizeFileName, normalizeFilePathForNode } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Platform } from "react-native"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import alerts from "@/lib/alerts"
import * as Linking from "expo-linking"
import { WEB_APP_ACCOUNT_SETTINGS_URL } from "@/lib/constants"
import { Toggle } from "@/components/nativewindui/Toggle"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system/next"
import { randomUUID } from "expo-crypto"
import paths from "@/lib/paths"
import * as Sharing from "expo-sharing"
import authService from "@/services/auth.service"
import assets from "@/lib/assets"

export const Account = memo(() => {
	const router = useRouter()
	const { t } = useTranslation()

	const account = useAccountQuery({
		enabled: false
	})

	const avatarSource = useMemo(() => {
		if (account.status !== "success" || !account.data.account.avatarURL || !account.data.account.avatarURL.startsWith("https://")) {
			return {
				uri: assets.uri.images.avatar_fallback()
			}
		}

		return {
			uri: account.data.account.avatarURL
		}
	}, [account.data, account.status])

	const changeAvatar = useCallback(async () => {
		try {
			const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync(false)

			if (!permissions.granted) {
				return
			}

			const imagePickerResult = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				allowsMultipleSelection: false,
				selectionLimit: 1,
				base64: false,
				exif: false,
				quality: 0.7
			})

			if (imagePickerResult.canceled) {
				return
			}

			const asset = imagePickerResult.assets.at(0)

			if (!asset || !asset.uri) {
				throw new Error("No image selected.")
			}

			const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.temporaryUploads(), randomUUID()))

			fullScreenLoadingModal.show()

			try {
				const assetFile = new FileSystem.File(asset.uri)

				if (!assetFile.exists) {
					throw new Error(`Could not find file at "${asset.uri}".`)
				}

				if (tmpFile.exists) {
					tmpFile.delete()
				}

				assetFile.copy(tmpFile)

				if (!tmpFile.size) {
					throw new Error(`Could not get size of file at "${tmpFile.uri}".`)
				}

				if (tmpFile.size > 2.99 * 1024 * 1024) {
					throw new Error(t("settings.account.errors.avatarLimit"))
				}

				await nodeWorker.proxy("uploadAvatar", {
					uri: normalizeFilePathForNode(tmpFile.uri)
				})

				await account.refetch()
			} finally {
				if (tmpFile.exists) {
					tmpFile.delete()
				}

				fullScreenLoadingModal.hide()
			}
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [account, t])

	const openWebApp = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.account.prompts.more.title"),
			message: t("settings.account.prompts.more.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		try {
			if (!(await Linking.canOpenURL(WEB_APP_ACCOUNT_SETTINGS_URL))) {
				throw new Error(t("errors.cannotOpenURL"))
			}

			await Linking.openURL(WEB_APP_ACCOUNT_SETTINGS_URL)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [t])

	const toggleVersioning = useCallback(
		async (value: boolean) => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("toggleVersioning", {
					enabled: value
				})

				await account.refetch()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[account]
	)

	const toggleLoginAlerts = useCallback(
		async (value: boolean) => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("toggleLoginAlerts", {
					enabled: value
				})

				await account.refetch()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[account]
	)

	const onPressPersonalInfo = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/personal"
		})
	}, [router])

	const changeNickname = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("settings.account.prompts.updateNickname.title"),
			materialIcon: {
				name: "pencil"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: contactName(account.data?.account.email, account.data?.account.nickName),
				placeholder: t("settings.account.prompts.updateNickname.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const nickname = inputPromptResponse.text.trim()

		if (nickname.length === 0 || account.data?.account.nickName === nickname) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("updateNickname", {
				nickname
			})

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t])

	const changeEmail = useCallback(async () => {
		const request = {
			email: "",
			confirmEmail: "",
			password: ""
		}

		const emailPrompt = await inputPrompt({
			title: t("settings.account.prompts.changeEmail.newEmail.title"),
			materialIcon: {
				name: "email"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("settings.account.prompts.changeEmail.newEmail.placeholder")
			}
		})

		if (emailPrompt.cancelled || emailPrompt.type !== "text") {
			return
		}

		request.email = emailPrompt.text.trim()

		if (request.email.length === 0 || request.email === account.data?.account.email) {
			return
		}

		const confirmEmailPrompt = await inputPrompt({
			title: t("settings.account.prompts.changeEmail.confirmEmail.title"),
			materialIcon: {
				name: "email"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("settings.account.prompts.changeEmail.confirmEmail.placeholder")
			}
		})

		if (confirmEmailPrompt.cancelled || confirmEmailPrompt.type !== "text") {
			return
		}

		request.confirmEmail = confirmEmailPrompt.text.trim()

		if (request.confirmEmail.length === 0 || request.confirmEmail === account.data?.account.email) {
			return
		}

		const passwordPrompt = await inputPrompt({
			title: t("settings.account.prompts.changeEmail.password.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("settings.account.prompts.changeEmail.password.placeholder")
			}
		})

		if (passwordPrompt.cancelled || passwordPrompt.type !== "text") {
			return
		}

		request.password = passwordPrompt.text

		if (request.password.length === 0) {
			return
		}

		if (request.email !== request.confirmEmail) {
			alerts.error(t("settings.account.errors.emailsNotMatching"))

			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("changeEmail", {
				email: request.email,
				password: request.password
			})

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t])

	const gdpr = useCallback(async () => {
		const fileName = `${sanitizeFileName(`GDPR_Information_${account.data?.account.email ?? ""}_${Date.now()}`)}.json`
		const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.exports(), fileName))

		try {
			fullScreenLoadingModal.show()

			try {
				if (tmpFile.exists) {
					tmpFile.delete()
				}

				const content = await nodeWorker.proxy("fetchGDPR", undefined)

				tmpFile.write(JSON.stringify(content, null, 4))
			} finally {
				fullScreenLoadingModal.hide()
			}

			await new Promise<void>(resolve => setTimeout(resolve, 250))

			await Sharing.shareAsync(tmpFile.uri, {
				mimeType: "application/json",
				dialogTitle: fileName
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (tmpFile.exists) {
				tmpFile.delete()
			}
		}
	}, [account.data?.account.email])

	const deleteVersionedFiles = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.account.prompts.deleteVersionedFiles1.title"),
			message: t("settings.account.prompts.deleteVersionedFiles1.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		const confirmPrompt = await alertPrompt({
			title: t("settings.account.prompts.deleteVersionedFiles2.title"),
			message: t("settings.account.prompts.deleteVersionedFiles2.message")
		})

		if (confirmPrompt.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteAllVersionedFiles", undefined)

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t])

	const deleteAllFilesAndDirectories = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.account.prompts.deleteAllFilesAndDirectories1.title"),
			message: t("settings.account.prompts.deleteAllFilesAndDirectories1.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		const confirmPrompt = await alertPrompt({
			title: t("settings.account.prompts.deleteAllFilesAndDirectories2.title"),
			message: t("settings.account.prompts.deleteAllFilesAndDirectories2.message")
		})

		if (confirmPrompt.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteEverything", undefined)

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t])

	const accountDeletion = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: t("settings.account.prompts.deleteAccount.title"),
			message: t("settings.account.prompts.deleteAccount.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		let twoFactorCode: string | undefined = undefined

		if (account.data?.settings.twoFactorEnabled) {
			const twoFactorPrompt = await inputPrompt({
				title: t("settings.account.prompts.2fa.title"),
				materialIcon: {
					name: "lock-outline"
				},
				prompt: {
					type: "secure-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: t("settings.account.prompts.2fa.placeholder")
				}
			})

			if (twoFactorPrompt.cancelled || twoFactorPrompt.type !== "text") {
				return
			}

			twoFactorCode = twoFactorPrompt.text.trim()

			if (twoFactorCode.length === 0) {
				return
			}
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteAccount", {
				twoFactorCode
			})

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t])

	const logout = useCallback(async () => {
		try {
			await authService.logout({})

			router.replace({
				pathname: "/(auth)"
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [router])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: contactName(account.data?.account.email, account.data?.account.nickName),
				subTitle: t("settings.account.items.changeAvatar"),
				onPress: changeAvatar,
				leftView: (
					<Avatar
						source={avatarSource}
						style={{
							width: 36,
							height: 36
						}}
					/>
				)
			},
			"gap-0",
			{
				id: "1",
				title: t("settings.account.items.emailAddress"),
				rightText: account.data?.account.email ?? "",
				subTitle: Platform.OS === "android" ? account.data?.account.email ?? "" : undefined,
				onPress: changeEmail
			},
			{
				id: "2",
				title: t("settings.account.items.personalInformation"),
				onPress: onPressPersonalInfo
			},
			{
				id: "3",
				title: t("settings.account.items.nickname"),
				rightText: contactName(account.data?.account.email, account.data?.account.nickName),
				subTitle: Platform.OS === "android" ? contactName(account.data?.account.email, account.data?.account.nickName) : undefined,
				onPress: changeNickname
			},
			{
				id: "4",
				title: t("settings.account.items.gdpr"),
				onPress: gdpr
			},
			{
				id: "5",
				title: t("settings.account.items.more"),
				onPress: openWebApp
			},
			"gap-1",
			{
				id: "6",
				title: t("settings.account.items.fileVersioning"),
				subTitle: t("settings.account.items.fileVersioningInfo"),
				rightView: (
					<Toggle
						value={account.data?.settings.versioningEnabled ?? false}
						onValueChange={toggleVersioning}
					/>
				)
			},
			{
				id: "7",
				title: t("settings.account.items.loginAlerts"),
				subTitle: t("settings.account.items.loginAlertsInfo"),
				rightView: (
					<Toggle
						value={account.data?.settings.loginAlertsEnabled ?? false}
						onValueChange={toggleLoginAlerts}
					/>
				)
			},
			"gap-2",
			{
				id: "8",
				title: t("settings.account.items.deleteVersionedFiles"),
				rightText: formatBytes(account.data?.settings.versionedStorage ?? 0),
				subTitle: Platform.OS === "android" ? formatBytes(account.data?.settings.versionedStorage ?? 0) : undefined,
				destructive: true,
				onPress: deleteVersionedFiles
			},
			{
				id: "9",
				title: t("settings.account.items.deleteAllFilesAndDirectories"),
				rightText: formatBytes(account.data?.account.storage ?? 0),
				subTitle: Platform.OS === "android" ? formatBytes(account.data?.account.storage ?? 0) : undefined,
				destructive: true,
				onPress: deleteAllFilesAndDirectories
			},
			"gap-3",
			{
				id: "10",
				title: t("settings.account.items.logout"),
				destructive: true,
				onPress: logout
			},
			"gap-4",
			{
				id: "11",
				title: t("settings.account.items.requestAccountDeletion"),
				subTitle: t("settings.account.items.requestAccountDeletionInfo"),
				destructive: true,
				onPress: accountDeletion
			}
		]
	}, [
		account.data,
		avatarSource,
		changeAvatar,
		changeEmail,
		changeNickname,
		gdpr,
		logout,
		openWebApp,
		toggleVersioning,
		toggleLoginAlerts,
		onPressPersonalInfo,
		deleteVersionedFiles,
		deleteAllFilesAndDirectories,
		accountDeletion,
		t
	])

	return (
		<SettingsComponent
			title={t("settings.account.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Account.displayName = "Account"

export default Account
