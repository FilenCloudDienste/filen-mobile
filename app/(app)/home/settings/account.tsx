import { memo, useMemo, useCallback } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import Avatar from "@/components/avatar"
import useAccountQuery from "@/queries/useAccountQuery"
import { contactName, formatBytes, sanitizeFileName } from "@/lib/utils"
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

export const Account = memo(() => {
	const router = useRouter()
	const { t } = useTranslation()

	const account = useAccountQuery({
		enabled: false
	})

	const avatarSource = useMemo(() => {
		if (account.status !== "success" || !account.data.account.avatarURL || !account.data.account.avatarURL.startsWith("https://")) {
			return {
				uri: "avatar_fallback"
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
				exif: false
			})

			if (imagePickerResult.canceled) {
				return
			}

			const asset = imagePickerResult.assets[0]

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

				await nodeWorker.proxy("uploadAvatar", {
					uri: tmpFile.uri
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
	}, [account])

	const openWebApp = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "open webapp",
			message: "more settings are available in the webapp"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		try {
			if (!(await Linking.canOpenURL(WEB_APP_ACCOUNT_SETTINGS_URL))) {
				throw new Error("Cannot open URL.")
			}

			await Linking.openURL(WEB_APP_ACCOUNT_SETTINGS_URL)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

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
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "pencil"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: contactName(account.data?.account.email, account.data?.account.nickName),
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "email"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "email"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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

		if (passwordPrompt.cancelled || passwordPrompt.type !== "text") {
			return
		}

		request.password = passwordPrompt.text

		if (request.password.length === 0) {
			return
		}

		if (request.email !== request.confirmEmail) {
			alerts.error("Email addresses do not match.")

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
				mimeType: "text/plain",
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
			title: "Delete versioned files",
			message: "Are you sure you want to delete all versioned files? This action cannot be undone."
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		const confirmPrompt = await alertPrompt({
			title: "Delete versioned files",
			message: "sure?."
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
	}, [account])

	const deleteAllFilesAndDirectories = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Delete all files and directories",
			message: "Are you sure you want to delete all files and directories? This action cannot be undone."
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		const confirmPrompt = await alertPrompt({
			title: "Delete versioned files",
			message: "sure?."
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
	}, [account])

	const accountDeletion = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "Delete all files and directories",
			message: "Are you sure you want to delete all files and directories? This action cannot be undone."
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		let twoFactorCode: string | undefined = undefined

		if (account.data?.settings.twoFactorEnabled) {
			const twoFactorPrompt = await inputPrompt({
				title: t("drive.header.rightView.actionSheet.create.directory"),
				materialIcon: {
					name: "lock-outline"
				},
				prompt: {
					type: "secure-text",
					keyboardType: "default",
					defaultValue: "",
					placeholder: "Two-factor code"
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
		const alertPromptResponse = await alertPrompt({
			title: "Logout",
			message: "Are you sure you want to logout? You will need to login again to access your account."
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		//TODO: Implement logout functionality
	}, [])

	return (
		<SettingsComponent
			title="Account"
			showSearchBar={false}
			loading={account.status !== "success"}
			items={[
				{
					id: "0",
					title: contactName(account.data?.account.email, account.data?.account.nickName),
					subTitle: "Change avatar",
					onPress: changeAvatar,
					leftView: (
						<Avatar
							source={avatarSource}
							style={{
								width: 42,
								height: 42
							}}
						/>
					)
				},
				"gap",
				{
					id: "1",
					title: "Email address",
					rightText: account.data?.account.email ?? "",
					subTitle: Platform.OS === "android" ? account.data?.account.email ?? "" : undefined,
					onPress: changeEmail
				},
				{
					id: "1321",
					title: "Personal information",
					onPress: onPressPersonalInfo
				},
				{
					id: "13212",
					title: "Nickname",
					rightText: contactName(account.data?.account.email, account.data?.account.nickName),
					subTitle:
						Platform.OS === "android" ? contactName(account.data?.account.email, account.data?.account.nickName) : undefined,
					onPress: changeNickname
				},
				{
					id: "12",
					title: "GDPR info",
					onPress: gdpr
				},
				{
					id: "123",
					title: "More account settings",
					onPress: openWebApp
				},
				"gap-1",
				{
					id: "1234",
					title: "File versioning",
					subTitle: "Enable file versioning to keep track of changes made to your files.",
					rightView: (
						<Toggle
							value={account.data?.settings.versioningEnabled ?? false}
							onValueChange={toggleVersioning}
						/>
					)
				},
				{
					id: "1234x",
					title: "Login alerts",
					subTitle: "Receive alerts when your account is accessed.",
					rightView: (
						<Toggle
							value={account.data?.settings.loginAlertsEnabled ?? false}
							onValueChange={toggleLoginAlerts}
						/>
					)
				},
				"gap-33",
				{
					id: "2xx",
					title: "Delete versioned files",
					rightText: formatBytes(account.data?.settings.versionedStorage ?? 0),
					subTitle: Platform.OS === "android" ? formatBytes(account.data?.settings.versionedStorage ?? 0) : undefined,
					destructive: true,
					onPress: deleteVersionedFiles
				},
				{
					id: "21111",
					title: "Delete all files and directories",
					rightText: formatBytes(account.data?.account.storage ?? 0),
					subTitle: Platform.OS === "android" ? formatBytes(account.data?.account.storage ?? 0) : undefined,
					destructive: true,
					onPress: deleteAllFilesAndDirectories
				},
				"gap-34221",
				{
					id: "232",
					title: "Logout",
					destructive: true,
					onPress: logout
				},
				"gap-242",
				{
					id: "312312",
					title: "Request account deletion",
					subTitle: "Request account deletion. We will send you an email with further instructions.",
					destructive: true,
					onPress: accountDeletion
				}
			]}
		/>
	)
})

Account.displayName = "Account"

export default Account
