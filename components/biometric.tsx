import { memo, useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { type BiometricAuth, BIOMETRIC_AUTH_KEY, BIOMETRIC_MAX_TRIES } from "@/app/(app)/home/settings/security"
import { AppState, BackHandler, View, Platform } from "react-native"
import Animated, { FadeOut } from "react-native-reanimated"
import * as LocalAuthentication from "expo-local-authentication"
import alerts from "@/lib/alerts"
import { Button } from "./nativewindui/Button"
import { Text } from "./nativewindui/Text"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "./prompts/inputPrompt"
import { translateMemoized, t } from "@/lib/i18n"
import { Portal } from "@rn-primitives/portal"
import { useAppStateStore } from "@/stores/appState.store"
import { FullWindowOverlay } from "react-native-screens"
import useIsAuthed from "@/hooks/useIsAuthed"
import useLocalAuthenticationQuery from "@/queries/useLocalAuthentication.query"

export const ParentComponent = memo(({ children, show }: { children: React.ReactNode; show: boolean }) => {
	if (!show) {
		return null
	}

	if (Platform.OS === "android") {
		return <Portal name="biometric-modal">{children}</Portal>
	}

	return <FullWindowOverlay>{children}</FullWindowOverlay>
})

ParentComponent.displayName = "ParentComponent"

export const Action = memo(({ lockedSeconds, pinAuth }: { lockedSeconds: number; pinAuth: () => Promise<void> }) => {
	const [seconds, setSeconds] = useState<number>(lockedSeconds)

	useEffect(() => {
		if (lockedSeconds <= 0) {
			return
		}

		const interval = setInterval(() => {
			setSeconds(prev => {
				if (prev <= 1) {
					clearInterval(interval)

					return 0
				}

				return prev - 1
			})
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [lockedSeconds])

	return seconds > 0 ? (
		<Text className="text-foreground font-normal">
			{t("biometric.appLockedFor", {
				seconds
			})}
		</Text>
	) : (
		<Button
			variant="tonal"
			size={Platform.OS === "ios" ? "none" : "md"}
			onPress={pinAuth}
			className={Platform.OS === "ios" ? "px-2.5 py-1.5 rounded-lg" : undefined}
		>
			<Text className="text-primary">{translateMemoized("biometric.authenticateUsingPin")}</Text>
		</Button>
	)
})

Action.displayName = "Action"

export const Biometric = memo(() => {
	const [biometricAuth, setBiometricAuth] = useMMKVObject<BiometricAuth>(BIOMETRIC_AUTH_KEY, mmkvInstance)
	const { colors } = useColorScheme()
	const [isAuthed] = useIsAuthed()
	const localAuthentication = useLocalAuthenticationQuery()
	const promptingAuthRef = useRef<boolean>(false)

	const enabled = useMemo(() => {
		return isAuthed && (biometricAuth?.enabled ?? false)
	}, [biometricAuth, isAuthed])

	const [show, setShow] = useState<boolean>(enabled ?? false)

	const biometricsLockedForSeconds = useCallback(() => {
		if (!enabled || !biometricAuth) {
			return 0
		}

		const lockedFor = Math.ceil((biometricAuth.triesLockedUntil - Date.now()) / 1000)

		return lockedFor > 0 ? lockedFor : 0
	}, [enabled, biometricAuth])

	const onBackButtonPress = useCallback(() => {
		if (show) {
			return true
		}

		return false
	}, [show])

	const promptAuth = useCallback(async () => {
		if (!show || promptingAuthRef.current || !biometricAuth) {
			return
		}

		promptingAuthRef.current = true

		try {
			if (localAuthentication.status === "success" && localAuthentication.data.hasHardware && localAuthentication.data.isEnrolled) {
				if (!(await LocalAuthentication.hasHardwareAsync())) {
					alerts.error("Biometric authentication is not available on this device.")

					return
				}

				if (!(await LocalAuthentication.isEnrolledAsync())) {
					alerts.error("No biometric data is saved on this device.")

					return
				}

				const result = await LocalAuthentication.authenticateAsync({
					cancelLabel: translateMemoized("localAuthentication.cancelLabel"),
					promptMessage: translateMemoized("localAuthentication.promptMessage"),
					disableDeviceFallback: true,
					fallbackLabel: ""
				})

				if (!result.success) {
					return
				}
			} else {
				const codePrompt = await inputPrompt({
					title: translateMemoized("biometric.prompts.pin.title"),
					materialIcon: {
						name: "lock-outline"
					},
					prompt: {
						type: "secure-text",
						keyboardType: "default",
						defaultValue: "",
						placeholder: translateMemoized("biometric.prompts.pin.placeholder")
					}
				})

				if (codePrompt.cancelled || codePrompt.type !== "text") {
					return
				}

				const code = codePrompt.text.trim()

				if (code.length === 0) {
					return
				}

				if (code !== biometricAuth.code) {
					const currentTries = biometricAuth.tries

					if (currentTries >= BIOMETRIC_MAX_TRIES) {
						const lockedUntil = Math.round(60 * 1000 * biometricAuth.triesLockedUntilMultiplier)

						setBiometricAuth(prev =>
							prev
								? {
										...prev,
										tries: 0,
										triesLockedUntil: Date.now() + lockedUntil,
										triesLockedUntilMultiplier: prev.triesLockedUntilMultiplier * 2
								  }
								: prev
						)

						alerts.error(translateMemoized("biometric.errors.tooManyIncorrectAttempts"))

						return
					}

					setBiometricAuth(prev =>
						prev
							? {
									...prev,
									tries: prev.tries + 1
							  }
							: prev
					)

					alerts.error(translateMemoized("biometric.errors.incorrectPin"))

					return
				}
			}

			setShow(false)
			setBiometricAuth(prev =>
				prev
					? {
							...prev,
							lastLock: Date.now(),
							tries: 0,
							triesLockedUntil: 0,
							triesLockedUntilMultiplier: 1
					  }
					: prev
			)
		} finally {
			promptingAuthRef.current = false
		}
	}, [show, localAuthentication, biometricAuth, setBiometricAuth])

	useEffect(() => {
		const appStateListener = AppState.addEventListener("change", nextAppState => {
			switch (nextAppState) {
				case "background":
				case "active": {
					const now = Date.now()
					const lockTimeout = (biometricAuth?.lastLock ?? now) + (biometricAuth?.lockAfter ?? 0) * 1000
					const show = now > lockTimeout

					if (show) {
						setShow(show)
						setBiometricAuth(prev =>
							prev
								? {
										...prev,
										lastLock: now
								  }
								: prev
						)
					}

					break
				}
			}
		})

		const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackButtonPress)

		return () => {
			appStateListener.remove()

			backHandler.remove()
		}
	}, [setBiometricAuth, biometricAuth, show, onBackButtonPress, localAuthentication.status, localAuthentication.data])

	useEffect(() => {
		useAppStateStore.getState().setBiometricVisible(show)

		promptAuth()
	}, [show, promptAuth])

	return (
		<ParentComponent show={show}>
			<Animated.View
				exiting={FadeOut}
				className="flex-1 items-center justify-center bg-background absolute top-0 left-0 right-0 bottom-0 z-[900] w-full h-full"
			>
				<View className="flex-1 items-center justify-center flex-col gap-4">
					<Icon
						name="lock-outline"
						size={64}
						color={colors.foreground}
					/>
					<Action
						lockedSeconds={biometricsLockedForSeconds()}
						pinAuth={promptAuth}
					/>
				</View>
			</Animated.View>
		</ParentComponent>
	)
})

Biometric.displayName = "Biometric"

export default Biometric
