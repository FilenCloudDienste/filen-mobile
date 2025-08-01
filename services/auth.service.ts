import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { t, waitForInitialization as waitForI18n } from "@/lib/i18n"
import { AUTHED_STORAGE_KEY, SDK_CONFIG_STORAGE_KEY, ANONYMOUS_SDK_CONFIG } from "@/lib/constants"
import mmkvInstance from "@/lib/mmkv"
import { type FilenSDKConfig } from "@filen/sdk"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import sqlite from "@/lib/sqlite"
import paths from "@/lib/paths"
import Semaphore from "@/lib/semaphore"
import { reinitSDK } from "@/lib/sdk"
import thumbnails from "@/lib/thumbnails"
import assets from "@/lib/assets"
import { normalizeFilePathForNode, sanitizeFileName } from "@/lib/utils"
import * as FileSystem from "expo-file-system/next"
import fileProvider from "@/lib/fileProvider"
import * as Sharing from "expo-sharing"

export type SetupResult =
	| {
			isAuthed: false
	  }
	| {
			isAuthed: true
			sdkConfig: Required<FilenSDKConfig>
	  }

export type SetupParams = {
	isAuthed?: boolean
	sdkConfig?: Required<FilenSDKConfig>
	background?: boolean
}

export class AuthService {
	private readonly setupMutex = new Semaphore(1)

	public async setup(params?: SetupParams): Promise<SetupResult> {
		await this.setupMutex.acquire()

		try {
			console.log("starting setup...")

			if (!params?.background) {
				await nodeWorker.start()

				console.log("node worker started")
			}

			const thumbnailWarmup = params?.background ? Promise.resolve() : thumbnails.warmupCache()
			const i18n = params?.background ? Promise.resolve() : waitForI18n()
			const isAuthed = params && typeof params.isAuthed === "boolean" ? params.isAuthed : this.getIsAuthed()
			const assetsCopy = params?.background ? Promise.resolve() : assets.initialize()

			if (!isAuthed) {
				await Promise.all([thumbnailWarmup, i18n, assetsCopy, fileProvider.disable()])

				console.log("setup done, not authed")

				return {
					isAuthed: false
				}
			}

			const tmpPath = normalizeFilePathForNode(FileSystem.Paths.cache.uri)
			const sdkConfig = params && params.sdkConfig ? params.sdkConfig : this.getSDKConfig()

			reinitSDK({
				...sdkConfig,
				connectToSocket: false,
				metadataCache: true,
				tmpPath
			})

			await Promise.all([
				params?.background
					? Promise.resolve()
					: nodeWorker.proxy("reinitSDK", {
							sdkConfig,
							tmpPath
					  }),
				thumbnailWarmup,
				i18n,
				assetsCopy
			])

			if (!params?.background) {
				mmkvInstance.delete("notesSearchTerm")
				mmkvInstance.delete("notesSelectedTag")

				sqlite.offlineFiles
					.verify()
					.then(() => {
						console.log("offline files verified")
					})
					.catch(console.error)
			}

			console.log("setup done, authed")

			return {
				isAuthed: true,
				sdkConfig
			}
		} finally {
			this.setupMutex.release()
		}
	}

	public setIsAuthed(authed: boolean): void {
		mmkvInstance.set(AUTHED_STORAGE_KEY, authed)
	}

	public getIsAuthed(): boolean {
		return mmkvInstance.getBoolean(AUTHED_STORAGE_KEY) ?? false
	}

	public setSDKConfig(config: Required<FilenSDKConfig>): void {
		mmkvInstance.set(SDK_CONFIG_STORAGE_KEY, JSON.stringify(config))
	}

	public getSDKConfig(): Required<FilenSDKConfig> {
		try {
			const config = mmkvInstance.getString(SDK_CONFIG_STORAGE_KEY)

			if (!config) {
				return ANONYMOUS_SDK_CONFIG
			}

			return JSON.parse(config) as Required<FilenSDKConfig>
		} catch {
			return ANONYMOUS_SDK_CONFIG
		}
	}

	public async logout({ disableAlertPrompt, disableLoader }: { disableAlertPrompt?: boolean; disableLoader?: boolean }): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("settings.account.prompts.logout.title"),
				message: t("settings.account.prompts.logout.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			mmkvInstance.delete(SDK_CONFIG_STORAGE_KEY)
			mmkvInstance.delete(AUTHED_STORAGE_KEY)

			await Promise.all([sqlite.offlineFiles.clear(), sqlite.kvAsync.clear()])

			paths.clearOfflineFiles()
			paths.clearTempDirectories()
			paths.clearThumbnails()
			paths.clearTrackPlayer()
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

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

			await this.setup({
				isAuthed: true,
				sdkConfig
			})

			this.setSDKConfig(sdkConfig)
			this.setIsAuthed(true)

			return true
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				if (e.message.toLowerCase().includes("please enter your two factor authentication code")) {
					if (!disableLoader) {
						fullScreenLoadingModal.hide()
					}

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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async exportMasterKeys({
		disableLoader,
		disableSharing
	}: {
		disableLoader?: boolean
		disableSharing?: boolean
	}): Promise<FileSystem.File | null> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		const sdkConfig = this.getSDKConfig()
		const fileName = `${sanitizeFileName(sdkConfig.email)}.masterKeys.txt`
		const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.exports(), fileName))

		try {
			if (!(await Sharing.isAvailableAsync())) {
				throw new Error("Sharing is not available on this device.")
			}

			const base64 = Buffer.from(
				sdkConfig.masterKeys
					.map(key => "_VALID_FILEN_MASTERKEY_" + key + "@" + sdkConfig.userId + "_VALID_FILEN_MASTERKEY_")
					.join("|"),
				"utf-8"
			).toString("base64")

			if (tmpFile.exists) {
				tmpFile.delete()
			}

			tmpFile.write(base64)

			if (!disableSharing) {
				await new Promise<void>(resolve => setTimeout(resolve, 250))

				await Sharing.shareAsync(tmpFile.uri, {
					mimeType: "text/plain",
					dialogTitle: fileName
				})
			}

			return tmpFile
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			if (!disableSharing && tmpFile.exists) {
				tmpFile.delete()
			}

			fullScreenLoadingModal.hide()
		}

		return null
	}
}

export const authService = new AuthService()

export default authService
