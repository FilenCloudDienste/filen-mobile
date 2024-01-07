import React, { useState, memo, useMemo } from "react"
import { Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { apiRequest } from "../../lib/api"
import { useStore } from "../../lib/state"
import { showToast } from "../../components/Toasts"
import { Keyboard } from "react-native"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import AuthContainer from "../../components/AuthContainer"
import { NavigationContainerRef } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export const ResendConfirmationScreen = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [email, setEmail] = useState<string>("")
	const dimensions = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const contentWidth = useMemo(() => {
		const scaled = Math.floor((dimensions.width - insets.left - insets.right) * 0.7)

		if (scaled > 300) {
			return 300
		}

		return 300
	}, [dimensions, insets])

	return (
		<AuthContainer>
			<TextInput
				onChangeText={setEmail}
				value={email}
				placeholder={i18n(lang, "emailPlaceholder")}
				placeholderTextColor={"gray"}
				autoCapitalize="none"
				textContentType="emailAddress"
				keyboardType="email-address"
				returnKeyType="next"
				secureTextEntry={false}
				style={{
					height: 44,
					width: contentWidth,
					padding: 5,
					paddingLeft: 10,
					paddingRight: 10,
					backgroundColor: getColor(darkMode, "backgroundSecondary"),
					color: "gray",
					borderRadius: 10,
					marginTop: 10,
					fontSize: 15
				}}
			/>
			<TouchableOpacity
				style={{
					backgroundColor: getColor(darkMode, "indigo"),
					borderRadius: 10,
					width: contentWidth,
					height: 40,
					alignItems: "center",
					justifyContent: "center",
					marginTop: 12
				}}
				onPress={async () => {
					useStore.setState({ fullscreenLoadingModalVisible: true })

					Keyboard.dismiss()

					const resendEmail = email.trim()

					setEmail("")

					if (!resendEmail) {
						useStore.setState({ fullscreenLoadingModalVisible: false })

						return showToast({ message: i18n(lang, "invalidEmail") })
					}

					try {
						var res = await apiRequest({
							method: "POST",
							endpoint: "/v3/confirmation/send",
							data: {
								email: resendEmail
							}
						})
					} catch (e: any) {
						console.log(e)

						useStore.setState({ fullscreenLoadingModalVisible: false })

						return showToast({ message: e.toString() })
					}

					if (!res.status) {
						useStore.setState({ fullscreenLoadingModalVisible: false })

						return showToast({ message: res.message })
					}

					useStore.setState({ fullscreenLoadingModalVisible: false })

					return showToast({
						message: i18n(lang, "resendConfirmationSent", true, ["__EMAIL__"], [resendEmail])
					})
				}}
			>
				<Text
					style={{
						color: "white",
						fontSize: 15,
						fontWeight: "bold"
					}}
				>
					{i18n(lang, "resendConfirmationBtn")}
				</Text>
			</TouchableOpacity>
			<View
				style={{
					width: contentWidth,
					height: 0,
					borderBottomColor: "rgba(84, 84, 88, 0.2)",
					borderBottomWidth: 0.5,
					marginTop: 50
				}}
			/>
			<TouchableOpacity
				style={{
					width: "100%",
					maxWidth: "70%",
					height: "auto",
					alignItems: "center",
					marginTop: 30
				}}
				onPress={() => navigation.goBack()}
			>
				<Text
					style={{
						color: getColor(darkMode, "linkPrimary"),
						fontSize: 15,
						fontWeight: "400"
					}}
				>
					{i18n(lang, "back")}
				</Text>
			</TouchableOpacity>
		</AuthContainer>
	)
})
