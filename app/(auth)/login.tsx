import { useRouter, Stack } from "expo-router"
import { useState, useCallback, memo, useMemo } from "react"
import { Platform, View } from "react-native"
import { KeyboardAwareScrollView, KeyboardController, KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context"
import authService from "@/services/auth.service"
import { Button } from "@/components/nativewindui/Button"
import { Form, FormItem, FormSection } from "@/components/nativewindui/Form"
import { Text } from "@/components/nativewindui/Text"
import { TextField } from "@/components/nativewindui/TextField"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import RequireInternet from "@/components/requireInternet"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"

const keyboardAwareScrollViewBottomOffset = Platform.select({
	ios: 175,
	default: 0
})

export const Login = memo(() => {
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const { t } = useTranslation()

	const disabled = useMemo(() => {
		return !email || !password
	}, [email, password])

	const login = useCallback(async () => {
		KeyboardController.dismiss()

		try {
			if (disabled) {
				throw new Error(t("auth.login.errors.emptyFields"))
			}

			const didLogin = await authService.login({
				email,
				password
			})

			if (!didLogin) {
				setPassword("")
				KeyboardController.setFocusTo("current")

				return
			}

			router.replace("/(app)/home")
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}

			setEmail("")
			setPassword("")
		}
	}, [email, password, router, disabled, t])

	const forgotPassword = useCallback(async () => {
		KeyboardController.dismiss()

		try {
			await authService.forgotPassword({})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const goBack = useCallback(() => {
		if (!router.canGoBack()) {
			return
		}

		router.back()
	}, [router])

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<Stack.Screen
				options={{
					headerShown: true,
					headerBlurEffect: "systemChromeMaterial",
					title: t("auth.login.title"),
					headerShadowVisible: false,
					headerBackVisible: false,
					headerLeft() {
						return (
							<Button
								variant="plain"
								className="ios:px-0"
								onPress={goBack}
							>
								<Text className="text-primary">{t("auth.login.header.cancel")}</Text>
							</Button>
						)
					}
				}}
			/>
		) : (
			<LargeTitleHeader
				backVisible={true}
				materialPreset="inline"
				title=""
			/>
		)
	}, [goBack, t])

	const signUp = useCallback(() => {
		router.push({
			pathname: "/(auth)/register"
		})
	}, [router])

	const onSubmitEmail = useCallback(() => {
		KeyboardController.setFocusTo("next")
	}, [])
	
	const onSubmitPassword = useCallback(() => {
		if (disabled) {
			KeyboardController.dismiss()
			return
		}

		login()
	}, [disabled, login])

	const keyboardStickyViewOffset = useMemo(() => {
		return {
			closed: 0,
			opened: Platform.select({
				ios: insets.bottom + 30,
				default: insets.bottom
			})
		}
	}, [insets.bottom])

	const labels = useMemo(() => {
		return {
			email: Platform.select({
				ios: undefined,
				default: t("auth.login.form.email.label")
			}),
			password: Platform.select({
				ios: undefined,
				default: t("auth.login.form.password.label")
			})
		}
	}, [t])

	return (
		<RequireInternet redirectHref="/(auth)">
			{header}
			<SafeAreaView className="ios:bg-card flex-1">
				<KeyboardAwareScrollView
					bottomOffset={keyboardAwareScrollViewBottomOffset}
					bounces={false}
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					contentContainerClassName="ios:pt-12 pt-20"
				>
					<View className="ios:px-12 flex-1 px-8">
						<View className="items-center pb-1">
							<Text
								variant="title1"
								className="ios:font-bold pb-1 pt-4 text-center"
							>
								{t("auth.login.welcome")}
							</Text>
							<Text className="ios:text-sm text-muted-foreground text-center">{t("auth.login.loginUsingCreds")}</Text>
						</View>
						<View className="ios:pt-4 pt-6">
							<Form className="gap-2">
								<FormSection className="ios:bg-background">
									<FormItem>
										<TextField
											placeholder={t("auth.login.form.email.placeholder")}
											label={labels.email}
											onSubmitEditing={onSubmitEmail}
											submitBehavior="submit"
											autoFocus={true}
											onChangeText={setEmail}
											value={email}
											keyboardType="email-address"
											textContentType="emailAddress"
											returnKeyType="next"
										/>
									</FormItem>
									<FormItem>
										<TextField
											placeholder={t("auth.login.form.password.placeholder")}
											label={labels.password}
											secureTextEntry={true}
											onChangeText={setPassword}
											value={password}
											returnKeyType="done"
											textContentType="password"
											onSubmitEditing={onSubmitPassword}
										/>
									</FormItem>
								</FormSection>
								<View className="flex-row">
									<Button
										size="sm"
										variant="plain"
										className="px-0.5"
										onPress={forgotPassword}
									>
										<Text className="text-primary text-sm">{t("auth.login.forgotPassword")}</Text>
									</Button>
								</View>
							</Form>
						</View>
					</View>
				</KeyboardAwareScrollView>
				<KeyboardStickyView
					offset={keyboardStickyViewOffset}
					className="ios:bg-card bg-background"
				>
					{Platform.OS === "ios" ? (
						<View className="px-12 py-4">
							<Button
								size="lg"
								onPress={login}
								disabled={disabled}
							>
								<Text>{t("auth.login.login")}</Text>
							</Button>
						</View>
					) : (
						<View className="flex-row justify-between py-4 pl-6 pr-8">
							<Button
								variant="plain"
								className="px-2"
								onPress={signUp}
							>
								<Text className="text-primary px-0.5 text-sm">{t("auth.login.signUp")}</Text>
							</Button>
							<Button
								disabled={disabled}
								onPress={login}
							>
								<Text className="text-sm">{t("auth.login.submit")}</Text>
							</Button>
						</View>
					)}
				</KeyboardStickyView>
				{Platform.OS === "ios" && (
					<Button
						variant="plain"
						onPress={signUp}
					>
						<Text className="text-primary text-sm">{t("auth.login.signUp")}</Text>
					</Button>
				)}
			</SafeAreaView>
		</RequireInternet>
	)
})

Login.displayName = "Login"

export default Login
