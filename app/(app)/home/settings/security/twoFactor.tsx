import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import useAccountQuery from "@/queries/useAccount.query"
import { Toggle } from "@/components/nativewindui/Toggle"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import { View } from "react-native"
import QRCode from "react-native-qrcode-svg"
import useDimensions from "@/hooks/useDimensions"
import * as Clipboard from "expo-clipboard"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { Text } from "@/components/nativewindui/Text"
import { sanitizeFileName } from "@/lib/utils"
import * as FileSystem from "expo-file-system"
import paths from "@/lib/paths"
import * as Sharing from "expo-sharing"
import pathModule from "path"

export const TwoFactor = memo(() => {
	const { t } = useTranslation()
	const { screen } = useDimensions()
	const { colors } = useColorScheme()

	const account = useAccountQuery({
		enabled: false
	})

	const twoFactorEnabled = useMemo(() => {
		return account.data?.settings.twoFactorEnabled ? account.data?.settings.twoFactorEnabled === 1 : false
	}, [account.data?.settings.twoFactorEnabled])

	const qrCodeValue = useMemo(() => {
		if (!account.data?.settings.twoFactorKey || !account.data?.account.email) {
			return ""
		}

		return `otpauth://totp/Filen:${encodeURIComponent(account.data?.account.email)}?secret=${encodeURIComponent(
			account.data?.settings.twoFactorKey
		)}&issuer=Filen&digits=6&period=30&algorithm=SHA1`
	}, [account])

	const exportRecoveryKeys = useCallback(
		async (recoveryKeys: string) => {
			const fileName = `${sanitizeFileName(`Two_Factor_Recovery_Keys_${account.data?.account.email ?? ""}_${Date.now()}`)}.txt`
			const tmpFile = new FileSystem.File(pathModule.posix.join(paths.exports(), fileName))

			try {
				fullScreenLoadingModal.show()

				try {
					if (tmpFile.exists) {
						tmpFile.delete()
					}

					tmpFile.write(recoveryKeys, {
						encoding: "utf8"
					})
				} finally {
					fullScreenLoadingModal.hide()
				}

				await new Promise<void>(resolve => setTimeout(resolve, 300))

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
		},
		[account.data?.account.email]
	)

	const toggleTwoFactor = useCallback(async () => {
		const twoFactorPrompt = await inputPrompt({
			title: t("settings.twoFactorAuth.prompts.enable.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("settings.twoFactorAuth.prompts.enable.placeholder")
			}
		})

		if (twoFactorPrompt.cancelled || twoFactorPrompt.type !== "text") {
			return
		}

		const twoFactorCode = twoFactorPrompt.text.trim()

		if (twoFactorCode.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			if (twoFactorEnabled) {
				await nodeWorker.proxy("disableTwoFactorAuthentication", {
					twoFactorCode
				})
			} else {
				const recoveryKeys = await nodeWorker.proxy("enableTwoFactorAuthentication", {
					twoFactorCode
				})

				await exportRecoveryKeys(recoveryKeys)
			}

			await account.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [account, t, twoFactorEnabled, exportRecoveryKeys])

	const copyKeyToClipboard = useCallback(async () => {
		if (!account.data?.settings.twoFactorKey) {
			return
		}

		try {
			await Clipboard.setStringAsync(account.data.settings.twoFactorKey)

			alerts.normal(t("settings.twoFactorAuth.copied"))
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [account.data?.settings.twoFactorKey, t])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: t("settings.twoFactorAuth.items.2fa"),
				rightView: (
					<Toggle
						value={twoFactorEnabled}
						onValueChange={toggleTwoFactor}
					/>
				)
			}
		]
	}, [toggleTwoFactor, twoFactorEnabled, t])

	const listFooter = useMemo(() => {
		return (
			!twoFactorEnabled &&
			account.data?.settings.twoFactorKey && (
				<View className="flex-1 flex-col pt-10 gap-10">
					<View
						className="rounded-lg items-center justify-center"
						style={{
							width: "100%",
							height: screen.width / 2 + 32
						}}
					>
						<View
							className="p-4 bg-white rounded-lg"
							style={{
								width: screen.width / 2 + 32,
								height: screen.width / 2 + 32
							}}
						>
							<QRCode
								value={qrCodeValue}
								backgroundColor="white"
								size={screen.width / 2}
							/>
						</View>
					</View>
					<View
						className="flex-1 flex-row items-center gap-2 justify-center absolute"
						style={{
							top: screen.width / 2 + 100,
							width: "100%"
						}}
					>
						<Button
							variant="plain"
							size="sm"
							onPress={copyKeyToClipboard}
						>
							<Text className="text-primary">{t("settings.twoFactorAuth.copyKey")}</Text>
							<Icon
								name="clipboard-outline"
								size={24}
								color={colors.primary}
							/>
						</Button>
					</View>
				</View>
			)
		)
	}, [account.data?.settings.twoFactorKey, colors.primary, copyKeyToClipboard, qrCodeValue, screen.width, twoFactorEnabled, t])

	return (
		<SettingsComponent
			title={t("settings.twoFactorAuth.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
			listFooter={listFooter}
		/>
	)
})

TwoFactor.displayName = "TwoFactor"

export default TwoFactor
