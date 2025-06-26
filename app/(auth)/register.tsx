import { useRouter, Stack } from "expo-router"
import { useState, memo, useMemo, useCallback } from "react"
import { Image, Platform, View } from "react-native"
import { KeyboardAwareScrollView, KeyboardController, KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Container from "@/components/Container"
import { Button } from "@/components/nativewindui/Button"
import { Form, FormItem, FormSection } from "@/components/nativewindui/Form"
import { Text } from "@/components/nativewindui/Text"
import { TextField } from "@/components/nativewindui/TextField"
import { useColorScheme } from "@/lib/useColorScheme"
import { ratePasswordStrength } from "@/lib/utils"
import authService from "@/services/auth.service"
import { cn } from "@/lib/cn"
import { Icon } from "@roninoss/icons"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import RequireInternet from "@/components/requireInternet"

const labels = {
	email: Platform.select({
		ios: undefined,
		default: "Email"
	}),
	password: Platform.select({
		ios: undefined,
		default: "Password"
	}),
	confirmEmail: Platform.select({
		ios: undefined,
		default: "Confirm email"
	}),
	confirmPassword: Platform.select({
		ios: undefined,
		default: "Confirm password"
	})
}

function onSubmitEditing() {
	KeyboardController.setFocusTo("next")
}

const keyboardAwareScrollViewBottomOffset = Platform.select({
	ios: 8
})

export const Register = memo(() => {
	const insets = useSafeAreaInsets()
	const [focusedTextField, setFocusedTextField] = useState<"email" | "password" | "confirmPassword" | "confirmEmail" | null>(null)
	const { isDarkColorScheme, colors } = useColorScheme()
	const [email, setEmail] = useState<string>("")
	const [confirmEmail, setConfirmEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const [confirmPassword, setConfirmPassword] = useState<string>("")
	const router = useRouter()

	const passwordStrength = useMemo(() => {
		return ratePasswordStrength(password)
	}, [password])

	const disabled = useMemo(() => {
		return (
			!email ||
			!confirmEmail ||
			!password ||
			!confirmPassword ||
			password.length === 0 ||
			email.length === 0 ||
			confirmEmail.length === 0 ||
			confirmPassword.length === 0 ||
			password !== confirmPassword ||
			email !== confirmEmail ||
			passwordStrength.strength === "weak"
		)
	}, [email, confirmEmail, password, confirmPassword, passwordStrength])

	const register = useCallback(async () => {
		KeyboardController.dismiss()

		try {
			if (disabled) {
				throw new Error("Please fill in all fields correctly.")
			}

			if (email !== confirmEmail) {
				throw new Error("Email and confirm email do not match.")
			}

			if (password !== confirmPassword) {
				throw new Error("Password and confirm password do not match.")
			}

			await authService.register({
				email,
				password
			})

			router.replace("/(auth)")
		} catch (e) {
			console.error(e)

			setFocusedTextField("email")
			setConfirmEmail("")
			setConfirmPassword("")
			setPassword("")

			if (e instanceof Error) {
				console.error(e.message)
			}
		}
	}, [email, password, router, disabled, confirmEmail, confirmPassword])

	const resend = useCallback(() => {
		KeyboardController.dismiss()

		authService.resendConfirmation()
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
					title: "Sign up",
					headerShadowVisible: false,
					headerBackVisible: false,
					headerLeft() {
						return (
							<Button
								variant="plain"
								className="ios:px-0"
								onPress={goBack}
							>
								<Text className="text-primary">Cancel</Text>
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
	}, [goBack])

	const emailOnFocus = useCallback(() => {
		setFocusedTextField("email")
	}, [])

	const onBlur = useCallback(() => {
		setFocusedTextField(null)
	}, [])

	const passwordOnFocus = useCallback(() => {
		setFocusedTextField("password")
	}, [])

	const confirmPasswordOnFocus = useCallback(() => {
		setFocusedTextField("confirmPassword")
	}, [])

	const confirmEmailOnFocus = useCallback(() => {
		setFocusedTextField("confirmEmail")
	}, [])

	const keyboardStickyViewOffset = useMemo(() => {
		return {
			closed: 0,
			opened: Platform.select({
				ios: insets.bottom + 30,
				default: insets.bottom
			})
		}
	}, [insets.bottom])

	const passwordStrengthIndicator = useMemo(() => {
		return new Array(4).fill(0).map((_, index) => {
			return (
				<View
					key={index}
					className={cn(
						"h-1 flex-1",
						passwordStrength.strength === "weak" && index === 0
							? "bg-red-500"
							: passwordStrength.strength === "normal" && index <= 1
								? "bg-yellow-500"
								: passwordStrength.strength === "strong" && index <= 2
									? "bg-blue-500"
									: passwordStrength.strength === "best" && index <= 3
										? "bg-green-500"
										: "bg-gray-500"
					)}
				/>
			)
		})
	}, [passwordStrength.strength])

	const submit = useCallback(() => {
		if (focusedTextField !== "confirmPassword") {
			KeyboardController.setFocusTo("next")

			return
		}

		register()
	}, [focusedTextField, register])

	const logoSource = useMemo(() => {
		return isDarkColorScheme ? require("../../assets/images/logo_light.png") : require("../../assets/images/logo_dark.png")
	}, [isDarkColorScheme])

	return (
		<RequireInternet redirectHref="/(auth)">
			{header}
			<Container className="ios:bg-card flex-1 android:py-8">
				<KeyboardAwareScrollView
					bottomOffset={keyboardAwareScrollViewBottomOffset}
					bounces={false}
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					contentContainerClassName="ios:pt-12 pt-20"
				>
					<View className="ios:px-12 flex-1 px-8">
						<View className="items-center pb-1">
							<Image
								source={logoSource}
								className="h-14 w-14"
								resizeMode="contain"
							/>
							<Text
								variant="title1"
								className="ios:font-bold pb-1 pt-4 text-center"
							>
								Create an account
							</Text>
							<Text className="ios:text-sm text-muted-foreground text-center">Set up your credentials</Text>
						</View>
						<View className="ios:pt-4 pt-6">
							<Form className="gap-2">
								<FormSection className="ios:bg-background">
									<FormItem>
										<TextField
											placeholder="Email"
											label={labels.email}
											onSubmitEditing={onSubmitEditing}
											submitBehavior="submit"
											autoFocus={true}
											onFocus={emailOnFocus}
											onBlur={onBlur}
											keyboardType="email-address"
											textContentType="emailAddress"
											returnKeyType="next"
											value={email}
											onChangeText={setEmail}
										/>
									</FormItem>
									<FormItem>
										<TextField
											placeholder="Confirm email"
											label={labels.confirmEmail}
											onSubmitEditing={onSubmitEditing}
											submitBehavior="submit"
											onFocus={confirmEmailOnFocus}
											onBlur={onBlur}
											keyboardType="email-address"
											textContentType="emailAddress"
											returnKeyType="next"
											value={confirmEmail}
											onChangeText={setConfirmEmail}
										/>
									</FormItem>
									<FormItem>
										<TextField
											placeholder="Password"
											label={labels.password}
											onSubmitEditing={onSubmitEditing}
											onFocus={passwordOnFocus}
											onBlur={onBlur}
											submitBehavior="submit"
											secureTextEntry={true}
											returnKeyType="next"
											textContentType="newPassword"
											value={password}
											onChangeText={setPassword}
										/>
									</FormItem>
									<FormItem>
										<TextField
											placeholder="Confirm password"
											label={labels.confirmPassword}
											onFocus={confirmPasswordOnFocus}
											onBlur={onBlur}
											onSubmitEditing={register}
											secureTextEntry={true}
											returnKeyType="done"
											textContentType="newPassword"
											value={confirmPassword}
											onChangeText={setConfirmPassword}
										/>
									</FormItem>
								</FormSection>
							</Form>
							{password.length > 0 && (
								<View className="flex-1 flex-col py-4 gap-4 pt-6">
									<View className="flex-1 flex-row items-center gap-1">{passwordStrengthIndicator}</View>
									<View className="flex-1 flex-col gap-2">
										<View className="flex-1 flex-row items-center gap-2">
											{passwordStrength.length ? (
												<Icon
													name="check-circle-outline"
													size={17}
													color={colors.primary}
												/>
											) : (
												<Icon
													name="close-circle-outline"
													size={17}
													color={colors.destructive}
												/>
											)}
											<Text className="font-normal text-sm">Length</Text>
										</View>
										<View className="flex-1 flex-row items-center gap-2">
											{passwordStrength.uppercase ? (
												<Icon
													name="check-circle-outline"
													size={17}
													color={colors.primary}
												/>
											) : (
												<Icon
													name="close-circle-outline"
													size={17}
													color={colors.destructive}
												/>
											)}
											<Text className="font-normal text-sm">Uppercase characters</Text>
										</View>
										<View className="flex-1 flex-row items-center gap-2">
											{passwordStrength.lowercase ? (
												<Icon
													name="check-circle-outline"
													size={17}
													color={colors.primary}
												/>
											) : (
												<Icon
													name="close-circle-outline"
													size={17}
													color={colors.destructive}
												/>
											)}
											<Text className="font-normal text-sm">Lowercase characters</Text>
										</View>
										<View className="flex-1 flex-row items-center gap-2">
											{passwordStrength.specialChars ? (
												<Icon
													name="check-circle-outline"
													size={17}
													color={colors.primary}
												/>
											) : (
												<Icon
													name="close-circle-outline"
													size={17}
													color={colors.destructive}
												/>
											)}
											<Text className="font-normal text-sm">Special characters</Text>
										</View>
									</View>
								</View>
							)}
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
								disabled={disabled}
								onPress={register}
							>
								<Text>Create account</Text>
							</Button>
						</View>
					) : (
						<View className="flex-row justify-between py-4 pl-6 pr-8">
							<Button
								variant="plain"
								className="px-2"
								onPress={resend}
							>
								<Text className="text-primary px-0.5 text-sm">Resend confirmation email</Text>
							</Button>
							<Button
								disabled={disabled}
								onPress={submit}
							>
								<Text className="text-sm">{focusedTextField !== "confirmPassword" ? "Next" : "Create account"}</Text>
							</Button>
						</View>
					)}
				</KeyboardStickyView>
				{Platform.OS === "ios" && (
					<Button
						variant="plain"
						onPress={resend}
					>
						<Text className="text-primary text-sm">Resend confirmation email</Text>
					</Button>
				)}
			</Container>
		</RequireInternet>
	)
})

Register.displayName = "Register"

export default Register
