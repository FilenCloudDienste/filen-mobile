import { memo, useMemo, useCallback } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import Avatar from "@/components/avatar"
import useAccountQuery from "@/queries/useAccountQuery"
import { formatBytes } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Toggle } from "@/components/nativewindui/Toggle"
import { useTranslation } from "react-i18next"
import { Platform } from "react-native"
import { useQuery } from "@tanstack/react-query"
import fileProvider from "@/lib/fileProvider"
import { getSDKConfig } from "@/lib/auth"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { getBiometricAuth, clearBiometricAuth } from "@/app/(app)/home/settings/security"
import { alertPrompt } from "@/components/prompts/alertPrompt"

export const Settings = memo(() => {
	const router = useRouter()
	const { t } = useTranslation()

	const account = useAccountQuery({})

	const { refetch: fileProviderEnabledQueryRefetch, data: fileProviderEnabledQueryData } = useQuery({
		queryKey: ["fileProviderEnabledQuery"],
		queryFn: () => fileProvider.enabled()
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

	const onPressAccount = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/account"
		})
	}, [router])

	const onPressSecurity = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/security"
		})
	}, [router])

	const onPressEvents = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/events"
		})
	}, [router])

	const onPressContacts = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/contacts"
		})
	}, [router])

	const onPressAdvanced = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/advanced"
		})
	}, [router])

	const onPressCameraUpload = useCallback(() => {
		router.push({
			pathname: "/(app)/photos"
		})

		setTimeout(() => {
			router.push({
				pathname: "/(app)/photos/settings"
			})
		}, 1)
	}, [router])

	const onChangeFileProvider = useCallback(
		async (value: boolean) => {
			fullScreenLoadingModal.show()

			try {
				if (value) {
					if (getBiometricAuth()?.enabled) {
						const fileProviderPrompt = await alertPrompt({
							title: Platform.select({
								ios: t("settings.index.prompts.fileProvider.title"),
								default: t("settings.index.prompts.fileProvider.title")
							}),
							message: Platform.select({
								ios: t("settings.index.prompts.documentsProvider.message"),
								default: t("settings.index.prompts.documentsProvider.message")
							})
						})

						if (fileProviderPrompt.cancelled) {
							return
						}
					}

					clearBiometricAuth()

					fileProvider.enable(getSDKConfig())
				} else {
					fileProvider.disable()
				}

				await fileProviderEnabledQueryRefetch()
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[fileProviderEnabledQueryRefetch, t]
	)

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: account.data?.account.email ?? "",
				subTitle: t("settings.index.items.used", {
					used: formatBytes(account.data?.account.storage ?? 0),
					max: formatBytes(account.data?.account.maxStorage ?? 0),
					percentage: (((account.data?.account.storage ?? 0) / (account.data?.account.maxStorage ?? 1)) * 100).toFixed(2)
				}),
				onPress: onPressAccount,
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
			"gap-0",
			{
				id: "1",
				title: t("settings.index.items.security"),
				onPress: onPressSecurity,
				leftView: (
					<IconView
						name="lock-outline"
						className="bg-red-500"
					/>
				)
			},
			{
				id: "2",
				title: t("settings.index.items.events"),
				onPress: onPressEvents,
				leftView: (
					<IconView
						name="format-list-bulleted"
						className="bg-orange-500"
					/>
				)
			},
			"gap-1",
			{
				id: "3",
				title: t("settings.index.items.cameraUpload"),
				onPress: onPressCameraUpload,
				leftView: (
					<IconView
						name="account-multiple-outline"
						className="bg-green-500"
					/>
				)
			},
			{
				id: "4",
				title: Platform.select({
					ios: t("settings.index.items.fileProvider"),
					default: t("settings.index.items.documentsProvider")
				}),
				subTitle: Platform.select({
					ios: t("settings.index.items.fileProviderInfo"),
					default: t("settings.index.items.documentsProviderInfo")
				}),
				leftView: (
					<IconView
						name="folder-open"
						className="bg-purple-500"
					/>
				),
				rightView: (
					<Toggle
						value={fileProviderEnabledQueryData ?? false}
						onValueChange={onChangeFileProvider}
					/>
				)
			},
			"gap-2",
			{
				id: "5",
				title: t("settings.index.items.contacts"),
				onPress: onPressContacts,
				leftView: (
					<IconView
						name="account-multiple-outline"
						className="bg-blue-500"
					/>
				)
			},
			"gap-3",
			{
				id: "6",
				title: t("settings.index.items.advanced"),
				onPress: onPressAdvanced,
				leftView: (
					<IconView
						name="cog-outline"
						className="bg-gray-500"
					/>
				)
			}
		]
	}, [
		t,
		account.data?.account.email,
		account.data?.account.maxStorage,
		account.data?.account.storage,
		avatarSource,
		onPressAccount,
		onPressSecurity,
		onPressEvents,
		onPressContacts,
		onPressAdvanced,
		onPressCameraUpload,
		fileProviderEnabledQueryData,
		onChangeFileProvider
	])

	return (
		<SettingsComponent
			title={t("settings.index.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Settings.displayName = "Settings"

export default Settings
