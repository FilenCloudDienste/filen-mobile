import { memo, useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { type BiometricAuth, BIOMETRIC_AUTH_KEY, BIOMETRIC_MAX_TRIES } from "@/app/(app)/home/settings/security"
import { AppState, type AppStateStatus, BackHandler, View, Platform } from "react-native"
import Animated, { FadeOut } from "react-native-reanimated"
import * as LocalAuthentication from "expo-local-authentication"
import alerts from "@/lib/alerts"
import { Button } from "./nativewindui/Button"
import { Text } from "./nativewindui/Text"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "./prompts/inputPrompt"
import { useTranslation } from "react-i18next"

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
		<Text className="text-foreground font-normal">App locked for {seconds} seconds.</Text>
	) : (
		<Button
			variant="plain"
			size={Platform.OS === "ios" ? "none" : "md"}
			onPress={pinAuth}
		>
			<Text className="text-primary">Authenticate using PIN</Text>
		</Button>
	)
})

Action.displayName = "Action"

export const Biometric = memo(() => {
	const [biometricAuth, setBiometricAuth] = useMMKVObject<BiometricAuth>(BIOMETRIC_AUTH_KEY, mmkvInstance)
	const didRunOnStartRef = useRef<boolean>(false)
	const [show, setShow] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const enabled = useMemo(() => {
		return biometricAuth?.enabled ?? false
	}, [biometricAuth])

	const biometricsLockedForSeconds = useCallback(() => {
		if (!enabled || !biometricAuth) {
			return 0
		}

		const lockedFor = Math.ceil((biometricAuth.triesLockedUntil - Date.now()) / 1000)

		return lockedFor > 0 ? lockedFor : 0
	}, [enabled, biometricAuth])

	const canPromptLocalAuthentication = useMemo(() => {
		if (!show || !enabled || biometricsLockedForSeconds() > 0 || !biometricAuth || biometricAuth.pinOnly) {
			return false
		}

		return true
	}, [show, enabled, biometricsLockedForSeconds, biometricAuth])

	const onNextAppState = useCallback(
		(nextAppState: AppStateStatus) => {
			const now = Date.now()
			const lockTimeout = (biometricAuth?.lastLock ?? 0) + (biometricAuth?.lockAfter ?? 0)

			if ((nextAppState === "active" || nextAppState === "background") && enabled && !show) {
				if (now >= lockTimeout) {
					setShow(true)
				}

				setBiometricAuth(prev =>
					prev
						? {
								...prev,
								lastLock: now
						  }
						: prev
				)
			}
		},
		[enabled, show, setBiometricAuth, biometricAuth]
	)

	const authenticated = useCallback(() => {
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
	}, [setBiometricAuth])

	const promptLocalAuthentication = useCallback(async () => {
		if (!canPromptLocalAuthentication) {
			return
		}

		try {
			const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
				LocalAuthentication.hasHardwareAsync(),
				LocalAuthentication.isEnrolledAsync(),
				LocalAuthentication.supportedAuthenticationTypesAsync()
			])

			if (!hasHardware || !isEnrolled || supportedTypes.length === 0) {
				return
			}

			const result = await LocalAuthentication.authenticateAsync({
				cancelLabel: "Cancel",
				promptMessage: "Authenticate to unlock the app",
				disableDeviceFallback: true,
				fallbackLabel: ""
			})

			if (!result.success) {
				return
			}

			authenticated()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [canPromptLocalAuthentication, authenticated])

	const onBackButtonPress = useCallback(() => {
		if (show) {
			return true
		}

		return false
	}, [show])

	const pinAuth = useCallback(async () => {
		if (!biometricAuth || biometricsLockedForSeconds() > 0) {
			return
		}

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

				alerts.error("Too many incorrect attempts. Please try again later.")

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

			alerts.error("Incorrect code. Please try again.")

			return
		}

		authenticated()
	}, [biometricAuth, setBiometricAuth, t, biometricsLockedForSeconds, authenticated])

	useEffect(() => {
		if (!canPromptLocalAuthentication) {
			return
		}

		promptLocalAuthentication()
	}, [canPromptLocalAuthentication, promptLocalAuthentication])

	useEffect(() => {
		if (!enabled || didRunOnStartRef.current || show) {
			return
		}

		didRunOnStartRef.current = true

		setShow(true)
		setBiometricAuth(prev =>
			prev
				? {
						...prev,
						lastLock: Date.now()
				  }
				: prev
		)
	}, [enabled, setBiometricAuth, show])

	useEffect(() => {
		const appStateListener = AppState.addEventListener("change", onNextAppState)
		const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackButtonPress)

		return () => {
			appStateListener.remove()
			backHandler.remove()
		}
	}, [onNextAppState, onBackButtonPress])

	if (!show) {
		return null
	}

	return (
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
					pinAuth={pinAuth}
				/>
			</View>
		</Animated.View>
	)
})

Biometric.displayName = "Biometric"

export default Biometric
