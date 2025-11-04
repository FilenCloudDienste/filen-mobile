import { memo, useMemo, useCallback } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import Avatar from "@/components/avatar"
import useAccountQuery from "@/queries/useAccount.query"
import { formatBytes } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Toggle } from "@/components/nativewindui/Toggle"
import { translateMemoized, t } from "@/lib/i18n"
import { Platform, View } from "react-native"
import useFileProviderEnabledQuery, { fileProviderEnabledQueryRefetch } from "@/queries/useFileProviderEnabled.query"
import fileProvider from "@/lib/fileProvider"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { getBiometricAuth, clearBiometricAuth } from "@/app/settings/security"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import authService from "@/services/auth.service"
import assets from "@/lib/assets"

export const Settings = memo(() => {
	const router = useRouter()
	const account = useAccountQuery()
	const fileProviderEnabledQuery = useFileProviderEnabledQuery()

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

	const onPressAccount = useCallback(() => {
		router.push({
			pathname: "/settings/account"
		})
	}, [router])

	const onPressSecurity = useCallback(() => {
		router.push({
			pathname: "/settings/security"
		})
	}, [router])

	const onPressEvents = useCallback(() => {
		router.push({
			pathname: "/settings/events"
		})
	}, [router])

	const onPressContacts = useCallback(() => {
		router.push({
			pathname: "/settings/contacts"
		})
	}, [router])

	const onPressAdvanced = useCallback(() => {
		router.push({
			pathname: "/settings/advanced"
		})
	}, [router])

	const onPressCameraUpload = useCallback(() => {
		router.push({
			pathname: "/photosSettings"
		})
	}, [router])

	const onChangeFileProvider = useCallback(async (value: boolean) => {
		fullScreenLoadingModal.show()

		try {
			if (value) {
				if (getBiometricAuth()?.enabled) {
					fullScreenLoadingModal.hide()

					const fileProviderPrompt = await alertPrompt({
						title: Platform.select({
							ios: translateMemoized("settings.index.prompts.fileProvider.title"),
							default: translateMemoized("settings.index.prompts.fileProvider.title")
						}),
						message: Platform.select({
							ios: translateMemoized("settings.index.prompts.documentsProvider.message"),
							default: translateMemoized("settings.index.prompts.documentsProvider.message")
						})
					})

					if (fileProviderPrompt.cancelled) {
						return
					}
				}

				clearBiometricAuth()

				await fileProvider.enable(authService.getSDKConfig())
			} else {
				await fileProvider.disable()
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
	}, [])

	const onPressAppearance = useCallback(() => {
		router.push({
			pathname: "/settings/appearance"
		})
	}, [router])

	const items = useMemo(() => {
		return [
			{
				id: "0",
				testID: "settings.account",
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
							width: 36,
							height: 36
						}}
					/>
				)
			},
			"gap-0",
			{
				id: "1",
				testID: "settings.security",
				title: translateMemoized("settings.index.items.security"),
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
				testID: "settings.events",
				title: translateMemoized("settings.index.items.events"),
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
				testID: "settings.cameraUpload",
				title: translateMemoized("settings.index.items.cameraUpload"),
				onPress: onPressCameraUpload,
				leftView: (
					<IconView
						name="image-outline"
						className="bg-green-500"
					/>
				)
			},
			{
				id: "4",
				testID: "settings.fileProvider",
				title: Platform.select({
					ios: translateMemoized("settings.index.items.fileProvider"),
					default: translateMemoized("settings.index.items.documentsProvider")
				}),
				subTitle: Platform.select({
					ios: translateMemoized("settings.index.items.fileProviderInfo"),
					default: translateMemoized("settings.index.items.documentsProviderInfo")
				}),
				leftView: (
					<IconView
						name="folder-open"
						className="bg-purple-500"
					/>
				),
				rightView: (
					<View testID="home.settings.fileProvider.toggle">
						<Toggle
							value={fileProviderEnabledQuery.data ?? false}
							onValueChange={onChangeFileProvider}
						/>
					</View>
				)
			},
			"gap-2",
			{
				id: "5",
				testID: "settings.contacts",
				title: translateMemoized("settings.index.items.contacts"),
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
				id: "6a",
				testID: "settings.appearance",
				title: translateMemoized("settings.index.items.appearance"),
				onPress: onPressAppearance,
				leftView: (
					<IconView
						name="wrench-outline"
						className="bg-teal-500"
					/>
				)
			},
			{
				id: "6",
				testID: "settings.advanced",
				title: translateMemoized("settings.index.items.advanced"),
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
		fileProviderEnabledQuery.data,
		onChangeFileProvider,
		onPressAppearance
	])

	return (
		<SettingsComponent
			title={translateMemoized("settings.index.title")}
			iosBackButtonTitle={translateMemoized("settings.index.back")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Settings.displayName = "Settings"

export default Settings
