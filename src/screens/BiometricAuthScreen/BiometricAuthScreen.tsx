import React, { useEffect, useState, memo, useCallback, useMemo, useRef } from "react"
import { View, Text, TouchableOpacity, useWindowDimensions, Animated, Platform, AppStateStatus } from "react-native"
import storage, { sharedStorage } from "../../lib/storage/storage"
import { useMMKVBoolean, useMMKVNumber } from "react-native-mmkv"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { useStore } from "../../lib/state"
import { navigationAnimation } from "../../lib/state"
import { CommonActions } from "@react-navigation/native"
import { hideAllActionSheets } from "../../components/ActionSheets"
import * as LocalAuthentication from "expo-local-authentication"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import { safeAwait } from "../../lib/helpers"
import { useAppState } from "@react-native-community/hooks"
import BootSplash from "react-native-bootsplash"
import { isRouteInStack } from "../../lib/helpers"

let canGoBack = false

export const PINCodeRow = memo(
	({
		numbers,
		updatePinCode,
		promptBiometrics,
		darkMode
	}: {
		numbers?: number[]
		updatePinCode: (number: number) => void
		promptBiometrics: () => void
		darkMode: boolean
	}) => {
		const [buttonWidthHeight, buttonFontSize, buttonColor, buttonFontColor] = useMemo(() => {
			const buttonWidthHeight: number = 70
			const buttonFontSize: number = 22
			const buttonColor: string = darkMode ? "#333333" : "lightgray"
			const buttonFontColor: string = getColor(darkMode, "textPrimary")

			return [buttonWidthHeight, buttonFontSize, buttonColor, buttonFontColor]
		}, [darkMode])

		return (
			<View
				style={{
					width: 270,
					height: "auto",
					flexDirection: "row",
					justifyContent: "space-between",
					marginBottom: 15
				}}
			>
				{typeof numbers !== "undefined" ? (
					numbers.map(num => {
						return (
							<TouchableOpacity
								key={num}
								style={{
									height: buttonWidthHeight,
									width: buttonWidthHeight,
									borderRadius: buttonWidthHeight,
									backgroundColor: buttonColor,
									justifyContent: "center",
									alignItems: "center"
								}}
								onPress={() => updatePinCode(num)}
							>
								<Text
									style={{
										fontSize: buttonFontSize,
										color: buttonFontColor
									}}
								>
									{num}
								</Text>
							</TouchableOpacity>
						)
					})
				) : (
					<>
						<TouchableOpacity
							style={{
								height: buttonWidthHeight,
								width: buttonWidthHeight,
								borderRadius: buttonWidthHeight,
								backgroundColor: buttonColor,
								justifyContent: "center",
								alignItems: "center"
							}}
							onPress={() => {
								if (Platform.OS === "android" && Platform.constants.Version <= 22) {
									return
								}

								promptBiometrics()
							}}
						>
							{Platform.OS === "android" && Platform.constants.Version <= 22 ? (
								<></>
							) : (
								<Text
									style={{
										fontSize: buttonFontSize
									}}
								>
									<Ionicon
										name="finger-print-outline"
										size={buttonFontSize}
										color={buttonFontColor}
									/>
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								height: buttonWidthHeight,
								width: buttonWidthHeight,
								borderRadius: buttonWidthHeight,
								backgroundColor: buttonColor,
								justifyContent: "center",
								alignItems: "center"
							}}
							onPress={() => updatePinCode(0)}
						>
							<Text
								style={{
									fontSize: buttonFontSize,
									color: buttonFontColor
								}}
							>
								0
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								height: buttonWidthHeight,
								width: buttonWidthHeight,
								borderRadius: buttonWidthHeight,
								backgroundColor: buttonColor,
								justifyContent: "center",
								alignItems: "center"
							}}
							onPress={() => updatePinCode(-1)}
						>
							<Text
								style={{
									fontSize: buttonFontSize
								}}
							>
								<Ionicon
									name="backspace-outline"
									size={buttonFontSize}
									color={buttonFontColor}
								/>
							</Text>
						</TouchableOpacity>
					</>
				)}
			</View>
		)
	}
)

export const BiometricAuthScreen = memo(({ navigation }: { navigation: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const biometricAuthScreenState = useStore(state => state.biometricAuthScreenState)
	const [pinCode, setPinCode] = useState<string>("")
	const [confirmPinCode, setConfirmPinCode] = useState<string>("")
	const [confirmPinCodeVisible, setConfirmPinCodeVisible] = useState<boolean>(false)
	const headerTextColor: string = darkMode ? "white" : "gray"
	const [dotColor, setDotColor] = useState<string>(headerTextColor)
	const [showingBiometrics, setShowingBiometrics] = useState<boolean>(false)
	const [shakeAnimation] = useState<Animated.Value>(new Animated.Value(0))
	const setIsAuthing = useStore(state => state.setIsAuthing)
	const appState = useAppState()
	const setBiometricAuthScreenVisible = useStore(state => state.setBiometricAuthScreenVisible)
	const [startOnCloudScreen] = useMMKVBoolean("startOnCloudScreen:" + userId, storage)
	const dimensions = useWindowDimensions()
	const appStateRef = useRef<AppStateStatus>(appState)

	const startShake = useCallback(() => {
		Animated.sequence([
			Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: false }),
			Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: false }),
			Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: false }),
			Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: false }),
			Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: false }),
			Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: false })
		]).start()

		setTimeout(() => {
			setDotColor(headerTextColor)
		}, 700)
	}, [])

	const authed = useCallback(() => {
		setConfirmPinCode("")
		setPinCode("")
		setConfirmPinCodeVisible(false)
		setShowingBiometrics(false)

		canGoBack = true

		navigationAnimation({ enable: false }).then(() => {
			let wasSetupScreen = false

			if (typeof navigation !== "undefined" && typeof navigation.getState === "function") {
				const navState = navigation.getState()

				if (navState && typeof navState.routes !== "undefined" && Array.isArray(navState.routes)) {
					const routes = navState.routes

					for (let i = 0; i < routes.length; i++) {
						if (routes[i].name === "SetupScreen") {
							wasSetupScreen = true
						}
					}
				}
			}

			setIsAuthing(false)

			storage.set("lastBiometricScreen:" + userId, Date.now() - 1000)
			sharedStorage.set("lastBiometricScreen:" + userId, Date.now() - 1000)

			if (wasSetupScreen) {
				navigationAnimation({ enable: true }).then(() => {
					navigation.dispatch(
						CommonActions.reset({
							index: 0,
							routes: [
								{
									name: "MainScreen",
									params: {
										parent: startOnCloudScreen
											? storage.getBoolean("defaultDriveOnly:" + userId)
												? storage.getString("defaultDriveUUID:" + userId)
												: "base"
											: "recents"
									}
								}
							]
						})
					)
				})
			} else {
				navigation.goBack()
			}
		})
	}, [startOnCloudScreen, navigation, userId])

	const updatePinCode = useCallback(
		(num: number) => {
			setDotColor(headerTextColor)

			if (num === -1) {
				if (pinCode.length > 0) {
					setPinCode(code => code.substring(0, code.length - 1))
				}

				return
			}

			const newCode = pinCode + "" + num.toString()

			if (newCode.length <= 4) {
				setPinCode(newCode)
			}

			if (newCode.length >= 4) {
				if (confirmPinCodeVisible) {
					if (newCode === confirmPinCode) {
						storage.set("pinCode:" + userId, confirmPinCode)
						storage.set("biometricPinAuth:" + userId, true)
						sharedStorage.set("biometricPinAuth:" + userId, true)

						authed()
					} else {
						startShake()
						setDotColor("red")
						setConfirmPinCode("")
						setPinCode("")
						setConfirmPinCodeVisible(false)
					}
				} else {
					if (biometricAuthScreenState === "setup") {
						setConfirmPinCode(newCode)
						setPinCode("")
						setConfirmPinCodeVisible(true)
					} else {
						const storedPinCode = storage.getString("pinCode:" + userId) || "1234567890"

						if (newCode === storedPinCode) {
							authed()
						} else {
							setPinCode("")
							setDotColor("red")
							startShake()
						}
					}
				}
			}
		},
		[confirmPinCodeVisible, biometricAuthScreenState, confirmPinCode, pinCode, userId]
	)

	const promptBiometrics = useCallback(async () => {
		if (
			biometricAuthScreenState === "setup" ||
			showingBiometrics ||
			storage.getBoolean("onlyUsePINCode:" + userId) ||
			(Platform.OS === "android" && Platform.constants.Version <= 22)
		) {
			return
		}

		await new Promise<void>(resolve => {
			const wait = setInterval(() => {
				if (appStateRef.current === "active") {
					clearInterval(wait)

					resolve()
				}
			}, 100)
		})

		hideAllActionSheets().catch(console.error)

		const [authErr, authResponse] = await safeAwait(
			LocalAuthentication.authenticateAsync({
				cancelLabel: i18n(lang, "cancel"),
				promptMessage: i18n(lang, "biometricAuthPrompt")
			})
		)

		if (authErr) {
			console.error(authErr)
		} else {
			if (authResponse.success) {
				authed()
			}
		}

		setShowingBiometrics(false)
	}, [biometricAuthScreenState, showingBiometrics, lang, userId])

	useEffect(() => {
		appStateRef.current = appState
	}, [appState])

	useEffect(() => {
		;(async () => {
			try {
				const visible = await BootSplash.isVisible()

				if (visible) {
					await navigationAnimation({ enable: false })
					await new Promise<void>(resolve => {
						const wait = setInterval(() => {
							if (!isRouteInStack(navigation, ["SetupScreen"])) {
								clearInterval(wait)
								resolve()
							}
						}, 100)
					})

					await BootSplash.hide({ fade: true })
				}
			} catch (e) {
				console.error(e)
			}
		})()

		setIsAuthing(true)
		setBiometricAuthScreenVisible(true)

		canGoBack = false

		hideAllActionSheets().catch(console.error)

		const removeListener = (e: any): void => {
			if (!canGoBack) {
				e.preventDefault()
			}
		}

		navigation.addListener("beforeRemove", removeListener)

		setTimeout(promptBiometrics, 300)

		return () => {
			navigation.removeListener("beforeRemove", removeListener)

			setBiometricAuthScreenVisible(false)
		}
	}, [])

	return (
		<View
			style={{
				height: dimensions.height,
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary"),
				justifyContent: "center",
				alignItems: "center"
			}}
		>
			<View
				style={{
					marginBottom: 100
				}}
			>
				{biometricAuthScreenState === "setup" ? (
					<Text
						style={{
							color: headerTextColor,
							fontSize: 19
						}}
					>
						{confirmPinCodeVisible ? i18n(lang, "confirmPinCode") : i18n(lang, "setupPinCode")}
					</Text>
				) : (
					<Text
						style={{
							color: headerTextColor,
							fontSize: 19
						}}
					>
						{i18n(lang, "enterPinCode")}
					</Text>
				)}
				<Animated.View
					style={{
						flexDirection: "row",
						justifyContent: "center",
						marginTop: 35,
						transform: [
							{
								translateX: shakeAnimation
							}
						]
					}}
				>
					{Array.from(Array(4).keys()).map(key => {
						return (
							<Ionicon
								key={key}
								name={pinCode.charAt(key).length > 0 ? "radio-button-on-outline" : "radio-button-off-outline"}
								size={22}
								color={dotColor}
								style={{
									marginLeft: 5
								}}
							/>
						)
					})}
				</Animated.View>
			</View>
			<PINCodeRow
				numbers={[1, 2, 3]}
				updatePinCode={updatePinCode}
				promptBiometrics={promptBiometrics}
				darkMode={darkMode}
			/>
			<PINCodeRow
				numbers={[4, 5, 6]}
				updatePinCode={updatePinCode}
				promptBiometrics={promptBiometrics}
				darkMode={darkMode}
			/>
			<PINCodeRow
				numbers={[7, 8, 9]}
				updatePinCode={updatePinCode}
				promptBiometrics={promptBiometrics}
				darkMode={darkMode}
			/>
			<PINCodeRow
				updatePinCode={updatePinCode}
				promptBiometrics={promptBiometrics}
				darkMode={darkMode}
			/>
		</View>
	)
})
