import { useRouter, Stack } from "expo-router"
import { useState, useCallback, memo, useMemo } from "react"
import { Image, Platform, View } from "react-native"
import { KeyboardAwareScrollView, KeyboardController, KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import authService from "@/services/auth.service"
import { Button } from "@/components/nativewindui/Button"
import { Form, FormItem, FormSection } from "@/components/nativewindui/Form"
import { Text } from "@/components/nativewindui/Text"
import { TextField } from "@/components/nativewindui/TextField"
import Container from "@/components/Container"
import { useColorScheme } from "@/lib/useColorScheme"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { FullScreenLoadingModal } from "@/components/modals/fullScreenLoadingModal"
import RequireInternet from "@/components/requireInternet"

export const Login = memo(() => {
	const insets = useSafeAreaInsets()
	const [focusedTextField, setFocusedTextField] = useState<"email" | "password" | null>(null)
	const router = useRouter()
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const { isDarkColorScheme } = useColorScheme()

	const disabled = useMemo(() => {
		return !email || !password || email.length === 0 || password.length === 0
	}, [email, password])

	const login = useCallback(async () => {
		KeyboardController.dismiss()

		try {
			if (disabled) {
				throw new Error("Please fill in all fields correctly.")
			}

			const didLogin = await authService.login({
				email,
				password
			})

			if (!didLogin) {
				setPassword("")
				setFocusedTextField("password")

				return
			}

			router.replace("/(app)/home")
		} catch (e) {
			console.error(e)

			setEmail("")
			setPassword("")

			if (e instanceof Error) {
				console.error(e.message)
			}
		}
	}, [email, password, router, disabled])

	const forgotPassword = useCallback(() => {
		KeyboardController.dismiss()

		authService.forgotPassword()
	}, [])

	return (
		<RequireInternet redirectHref="/(auth)">
			{Platform.OS === "ios" ? (
				<Stack.Screen
					options={{
						headerShown: true,
						headerBlurEffect: "systemChromeMaterial",
						title: "Login",
						headerShadowVisible: false,
						headerBackVisible: false,
						headerLeft() {
							return (
								<Button
									variant="plain"
									className="ios:px-0"
									onPress={() => {
										if (!router.canGoBack()) {
											return
										}

										router.back()
									}}
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
			)}
			<Container className="ios:bg-card flex-1 android:py-8">
				<KeyboardAwareScrollView
					bottomOffset={Platform.select({
						ios: 175
					})}
					bounces={false}
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					contentContainerClassName="ios:pt-12 pt-20"
				>
					<View className="ios:px-12 flex-1 px-8">
						<View className="items-center pb-1">
							<Image
								source={
									isDarkColorScheme
										? require("../../assets/images/logo_light.png")
										: require("../../assets/images/logo_dark.png")
								}
								className="h-14 w-14"
								resizeMode="contain"
							/>
							<Text
								variant="title1"
								className="ios:font-bold pb-1 pt-4 text-center"
							>
								Welcome back!
							</Text>
							<Text className="ios:text-sm text-muted-foreground text-center">Login using your credentials</Text>
						</View>
						<View className="ios:pt-4 pt-6">
							<Form className="gap-2">
								<FormSection className="ios:bg-background">
									<FormItem>
										<TextField
											placeholder="Email"
											label={Platform.select({
												ios: undefined,
												default: "Email"
											})}
											onSubmitEditing={() => KeyboardController.setFocusTo("next")}
											submitBehavior="submit"
											autoFocus={true}
											onChangeText={setEmail}
											value={email}
											onFocus={() => setFocusedTextField("email")}
											onBlur={() => setFocusedTextField(null)}
											keyboardType="email-address"
											textContentType="emailAddress"
											returnKeyType="next"
										/>
									</FormItem>
									<FormItem>
										<TextField
											placeholder="Password"
											label={Platform.select({
												ios: undefined,
												default: "Password"
											})}
											onFocus={() => setFocusedTextField("password")}
											onBlur={() => setFocusedTextField(null)}
											secureTextEntry={true}
											onChangeText={setPassword}
											value={password}
											returnKeyType="done"
											textContentType="password"
											onSubmitEditing={login}
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
										<Text className="text-primary text-sm">Forgot password?</Text>
									</Button>
								</View>
							</Form>
						</View>
					</View>
				</KeyboardAwareScrollView>
				<KeyboardStickyView
					offset={{
						closed: 0,
						opened: Platform.select({
							ios: insets.bottom + 30,
							default: insets.bottom
						})
					}}
				>
					{Platform.OS === "ios" ? (
						<View className=" px-12 py-4">
							<Button
								size="lg"
								onPress={login}
								disabled={disabled}
							>
								<Text>Login</Text>
							</Button>
						</View>
					) : (
						<View className="flex-row justify-between py-4 pl-6 pr-8">
							<Button
								variant="plain"
								className="px-2"
								onPress={() => {
									router.push({
										pathname: "/(auth)/register"
									})
								}}
							>
								<Text className="text-primary px-0.5 text-sm">Sign up for free</Text>
							</Button>
							<Button
								disabled={disabled}
								onPress={() => {
									if (focusedTextField === "email") {
										KeyboardController.setFocusTo("next")

										return
									}

									KeyboardController.dismiss()

									login()
								}}
							>
								<Text className="text-sm">{focusedTextField === "email" ? "Next" : "Submit"}</Text>
							</Button>
						</View>
					)}
				</KeyboardStickyView>
				{Platform.OS === "ios" && (
					<Button
						variant="plain"
						onPress={() => {
							router.push({
								pathname: "/(auth)/register"
							})
						}}
					>
						<Text className="text-primary text-sm">Sign up for free</Text>
					</Button>
				)}
			</Container>
			{Platform.OS === "ios" && <FullScreenLoadingModal />}
		</RequireInternet>
	)
})

Login.displayName = "Login"

export default Login
