import { memo, useCallback, useMemo } from "react"
import { Settings as SettingsComponent } from "@/components/settings"
import useAccountQuery from "@/queries/useAccountQuery"
import { Toggle } from "@/components/nativewindui/Toggle"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useTranslation } from "react-i18next"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { type BiometricAuth, BIOMETRIC_AUTH_KEY } from "."
import { Button } from "@/components/nativewindui/Button"
import { Text } from "@/components/nativewindui/Text"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Platform } from "react-native"
import * as LocalAuthentication from "expo-local-authentication"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import fileProvider from "@/lib/fileProvider"
import alerts from "@/lib/alerts"

export const Biometric = memo(() => {
	const [biometricAuth, setBiometricAuth] = useMMKVObject<BiometricAuth>(BIOMETRIC_AUTH_KEY, mmkvInstance)
	const { t } = useTranslation()
	const { colors } = useColorScheme()

	const account = useAccountQuery({
		enabled: false
	})

	const lockAppAfterDropdownItems = useMemo(() => {
		return [0, 60, 300, 600, 900, 1800, 3600, Number.MAX_SAFE_INTEGER].map(seconds =>
			createDropdownItem({
				title:
					seconds >= Number.MAX_SAFE_INTEGER
						? t("settings.biometric.lockAppAfter.never")
						: seconds === 0
						? t("settings.biometric.lockAppAfter.immediately")
						: t("settings.biometric.lockAppAfter.minutes", {
								minutes: Math.floor(seconds / 60)
						  }),
				actionKey: seconds.toString()
			})
		)
	}, [t])

	const toggleBiometric = useCallback(
		async (value: boolean) => {
			if (value) {
				if (await fileProvider.enabled()) {
					const fileProviderPrompt = await alertPrompt({
						title: Platform.select({
							ios: t("settings.biometric.prompts.fileProvider.title"),
							default: t("settings.biometric.prompts.fileProvider.title")
						}),
						message: Platform.select({
							ios: t("settings.biometric.prompts.documentsProvider.message"),
							default: t("settings.biometric.prompts.documentsProvider.message")
						})
					})

					if (fileProviderPrompt.cancelled) {
						return
					}
				}

				const codePrompt = await inputPrompt({
					title: t("settings.biometric.prompts.enable.title"),
					materialIcon: {
						name: "lock-outline"
					},
					prompt: {
						type: "secure-text",
						keyboardType: "default",
						defaultValue: "",
						placeholder: t("settings.biometric.prompts.enable.placeholder")
					}
				})

				if (codePrompt.cancelled || codePrompt.type !== "text") {
					return
				}

				const code = codePrompt.text.trim()

				if (code.length === 0) {
					return
				}

				if (code.length < 4) {
					alerts.error(t("settings.biometric.errors.pinTooShort"))

					return
				}

				if (code.length > 128) {
					alerts.error(t("settings.biometric.errors.pinTooLong"))

					return
				}

				const confirmCodePrompt = await inputPrompt({
					title: t("settings.biometric.prompts.enableConfirm.title"),
					materialIcon: {
						name: "lock-outline"
					},
					prompt: {
						type: "secure-text",
						keyboardType: "default",
						defaultValue: "",
						placeholder: t("settings.biometric.prompts.enableConfirm.placeholder")
					}
				})

				if (confirmCodePrompt.cancelled || confirmCodePrompt.type !== "text") {
					return
				}

				const confirmCode = confirmCodePrompt.text.trim()

				if (confirmCode.length === 0) {
					return
				}

				if (confirmCode !== code) {
					alerts.error(t("settings.biometric.errors.pinNotMatching"))

					return
				}

				const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
					LocalAuthentication.hasHardwareAsync(),
					LocalAuthentication.isEnrolledAsync(),
					LocalAuthentication.supportedAuthenticationTypesAsync()
				])

				if (hasHardware && isEnrolled && supportedTypes.length > 0) {
					const result = await LocalAuthentication.authenticateAsync({
						cancelLabel: t("localAuthentication.cancelLabel"),
						promptMessage: t("localAuthentication.promptMessage"),
						disableDeviceFallback: true,
						fallbackLabel: ""
					})

					if (!result.success) {
						return
					}
				}

				await fileProvider.disable()

				setBiometricAuth({
					enabled: true,
					code,
					lastLock: Date.now(),
					lockAfter: 300,
					tries: 0,
					triesLockedUntil: 0,
					pinOnly: false,
					triesLockedUntilMultiplier: 1
				})
			} else {
				const alertPromptResponse = await alertPrompt({
					title: t("settings.biometric.prompts.disable.title"),
					message: t("settings.biometric.prompts.disable.message")
				})

				if (alertPromptResponse.cancelled) {
					return
				}

				setBiometricAuth(undefined)
			}
		},
		[t, setBiometricAuth]
	)

	const togglePinOnly = useCallback(
		async (value: boolean) => {
			setBiometricAuth(prev =>
				prev
					? {
							...prev,
							pinOnly: value
					  }
					: prev
			)
		},
		[setBiometricAuth]
	)

	const items = useMemo(() => {
		return [
			{
				id: "0",
				title: t("settings.biometric.items.biometricAuth"),
				rightView: (
					<Toggle
						value={biometricAuth ? biometricAuth.enabled : false}
						onValueChange={toggleBiometric}
					/>
				)
			},
			...(biometricAuth && biometricAuth.enabled
				? [
						{
							id: "1",
							title: t("settings.biometric.items.lockAppAfter"),
							rightView: (
								<DropdownMenu
									items={lockAppAfterDropdownItems}
									onItemPress={item => {
										setBiometricAuth(prev =>
											prev
												? {
														...prev,
														lockAfter: Number(item.actionKey)
												  }
												: prev
										)
									}}
								>
									<Button
										size={Platform.OS === "ios" ? "none" : "md"}
										variant="plain"
										className="items-center justify-start"
									>
										<Text className="ios:px-0 text-primary px-2 font-normal">
											{biometricAuth && biometricAuth.enabled && biometricAuth.lockAfter >= Number.MAX_SAFE_INTEGER
												? t("settings.biometric.lockAppAfter.never")
												: biometricAuth.lockAfter === 0
												? t("settings.biometric.lockAppAfter.immediately")
												: t("settings.biometric.lockAppAfter.minutes", {
														minutes: Math.floor(biometricAuth.lockAfter / 60)
												  })}
										</Text>
										<Icon
											name="pencil"
											size={24}
											color={colors.primary}
										/>
									</Button>
								</DropdownMenu>
							)
						},
						{
							id: "2",
							title: t("settings.biometric.items.pinOnly"),
							rightView: (
								<Toggle
									value={biometricAuth ? biometricAuth.pinOnly : false}
									onValueChange={togglePinOnly}
								/>
							)
						}
				  ]
				: [])
		]
	}, [biometricAuth, toggleBiometric, togglePinOnly, setBiometricAuth, colors.primary, t, lockAppAfterDropdownItems])

	return (
		<SettingsComponent
			title={t("settings.biometric.title")}
			showSearchBar={false}
			loading={account.status !== "success"}
			items={items}
		/>
	)
})

Biometric.displayName = "Biometric"

export default Biometric
