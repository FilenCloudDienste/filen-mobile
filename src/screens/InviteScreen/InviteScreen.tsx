import React, { useState, useEffect, memo } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Share } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import { getAccount } from "../../lib/api"
import { SettingsGroup } from "../SettingsScreen/SettingsScreen"
import * as Clipboard from "expo-clipboard"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { NavigationContainerRef } from "@react-navigation/native"

export interface InviteScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const InviteScreen = memo(({ navigation }: InviteScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [isLoading, setIsLoading] = useState<boolean>(true)
	const [accountData, setAccountData] = useState<any>({})

	useEffect(() => {
		getAccount()
			.then(data => {
				setAccountData(data)
				setIsLoading(false)
			})
			.catch(err => {
				console.log(err)

				showToast({ message: err.toString() })
			})
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "accountSettings")}
				middleText={i18n(lang, "invite")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				{isLoading ? (
					<ActivityIndicator
						size="small"
						color={getColor(darkMode, "textPrimary")}
						style={{
							marginTop: "70%"
						}}
					/>
				) : (
					<>
						<SettingsGroup marginTop={5}>
							<View
								style={{
									width: "100%",
									height: "auto"
								}}
							>
								<View
									style={{
										width: "100%",
										height: "auto",
										flexDirection: "row",
										justifyContent: "space-between",
										paddingLeft: 10,
										paddingRight: 10,
										paddingTop: 10,
										paddingBottom: 10
									}}
								>
									<View>
										<Text
											style={{
												color: getColor(darkMode, "textPrimary"),
												fontWeight: "400",
												fontSize: 17
											}}
										>
											{i18n(lang, "inviteInfo")}
										</Text>
									</View>
								</View>
							</View>
						</SettingsGroup>
						<SettingsGroup>
							<View
								style={{
									width: "100%",
									height: "auto"
								}}
							>
								<View
									style={{
										width: "100%",
										height: "auto",
										flexDirection: "row",
										justifyContent: "space-between",
										paddingLeft: 10,
										paddingRight: 10,
										paddingTop: 10,
										paddingBottom: 10
									}}
								>
									<View>
										<Text
											style={{
												color: getColor(darkMode, "textPrimary"),
												fontWeight: "400",
												fontSize: 17
											}}
										>
											{i18n(lang, "inviteCount")}
										</Text>
									</View>
									<Text
										style={{
											color: "gray",
											fontWeight: "400",
											fontSize: 17
										}}
									>
										{accountData.referCount > accountData.refLimit ? accountData.refLimit : accountData.referCount}/
										{accountData.refLimit}
									</Text>
								</View>
							</View>
						</SettingsGroup>
						<SettingsGroup>
							<Pressable
								style={{
									width: "100%",
									height: "auto"
								}}
								onPress={() => {
									Clipboard.setString("https://filen.io/r/" + accountData.refId)

									showToast({ message: i18n(lang, "copiedToClipboard") })
								}}
							>
								<View
									style={{
										width: "100%",
										height: "auto",
										flexDirection: "row",
										justifyContent: "space-between",
										paddingLeft: 10,
										paddingRight: 10,
										paddingTop: 10,
										paddingBottom: 10
									}}
								>
									<Text
										style={{
											color: getColor(darkMode, "textPrimary"),
											width: "65%",
											fontWeight: "400",
											fontSize: 17
										}}
										numberOfLines={1}
									>
										https://filen.io/r/{accountData.refId}
									</Text>
									<TouchableOpacity
										onPress={() => {
											Share.share({
												message: i18n(lang, "shareRefLinkMessage"),
												url: "https://filen.io/r/" + accountData.refId
											})
										}}
									>
										<Text
											style={{
												color: "#0A84FF",
												fontWeight: "400",
												fontSize: 17
											}}
										>
											{i18n(lang, "share")}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => {
											Clipboard.setString("https://filen.io/r/" + accountData.refId)

											showToast({ message: i18n(lang, "copiedToClipboard") })
										}}
									>
										<Text
											style={{
												color: "#0A84FF",
												fontWeight: "400",
												fontSize: 17
											}}
										>
											{i18n(lang, "copy")}
										</Text>
									</TouchableOpacity>
								</View>
							</Pressable>
						</SettingsGroup>
						<View
							style={{
								width: "100%",
								height: "auto",
								paddingLeft: 8,
								paddingRight: 8,
								marginTop: 5
							}}
						>
							<View
								style={{
									width: "100%",
									height: "auto",
									flexDirection: "row",
									justifyContent: "space-between",
									paddingLeft: 10,
									paddingRight: 10,
									paddingTop: 10,
									paddingBottom: 10
								}}
							>
								<View>
									<Text
										style={{
											color: "gray",
											fontSize: 12
										}}
									>
										{i18n(lang, "inviteInfo2")}
									</Text>
								</View>
							</View>
						</View>
					</>
				)}
			</ScrollView>
		</>
	)
})
