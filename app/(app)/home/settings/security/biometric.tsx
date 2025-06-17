import { memo, useCallback } from "react"
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

export const LockAppAfterDropdownItems = [0, 60, 300, 600, 900, 1800, 3600, Number.MAX_SAFE_INTEGER].map(seconds =>
	createDropdownItem({
		title: seconds >= Number.MAX_SAFE_INTEGER ? "Never" : seconds === 0 ? "Immediately" : `${seconds / 60} minutes`,
		actionKey: seconds.toString()
	})
)

export const Biometric = memo(() => {
	const [biometricAuth, setBiometricAuth] = useMMKVObject<BiometricAuth>(BIOMETRIC_AUTH_KEY, mmkvInstance)
	const { t } = useTranslation()

	const account = useAccountQuery({
		enabled: false
	})

	const toggleBiometric = useCallback(
		async (value: boolean) => {
			if (value) {
				const codePrompt = await inputPrompt({
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

				if (codePrompt.cancelled || codePrompt.type !== "text") {
					return
				}

				const code = codePrompt.text.trim()

				if (code.length === 0) {
					return
				}

				setBiometricAuth({
					enabled: true,
					code,
					lastLock: Date.now(),
					lockAfter: Number.MAX_SAFE_INTEGER,
					tries: 0,
					triesLockedUntil: 0,
					pinOnly: false
				})
			} else {
				const alertPromptResponse = await alertPrompt({
					title: "Delete versioned files",
					message: "Are you sure you want to delete all versioned files? This action cannot be undone."
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
			setBiometricAuth(prev => (prev ? { ...prev, pinOnly: value } : prev))
		},
		[setBiometricAuth]
	)

	return (
		<SettingsComponent
			title="Security"
			showSearchBar={false}
			loading={account.status !== "success"}
			items={[
				{
					id: "0",
					title: "Biometric Authentication",
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
								title: "Lock app after",
								rightView: (
									<DropdownMenu
										items={LockAppAfterDropdownItems}
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
										>
											<Text className="text-primary">
												{biometricAuth &&
												biometricAuth.enabled &&
												biometricAuth.lockAfter >= Number.MAX_SAFE_INTEGER
													? "Never"
													: biometricAuth.lockAfter === 0
													? "Immediately"
													: `${biometricAuth.lockAfter / 60} minutes`}
											</Text>
										</Button>
									</DropdownMenu>
								)
							},
							{
								id: "2",
								title: "PIN only",
								rightView: (
									<Toggle
										value={biometricAuth ? biometricAuth.pinOnly : false}
										onValueChange={togglePinOnly}
									/>
								)
							}
					  ]
					: [])
			]}
		/>
	)
})

Biometric.displayName = "Biometric"

export default Biometric
