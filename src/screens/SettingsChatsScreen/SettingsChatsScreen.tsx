import React, { useState, useEffect, memo, useCallback } from "react"
import { View, ScrollView, ActivityIndicator, Switch, Text } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { getAccount, chatMute, chatConversations, userAppearOffline, UserGetAccount } from "../../lib/api"
import { showToast } from "../../components/Toasts"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"
import { NavigationContainerRef } from "@react-navigation/native"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../lib/eventListener"
import Ionicon from "@expo/vector-icons/Ionicons"

export const SettingsChatsScreen = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [account, setAccount] = useState<UserGetAccount | undefined>(undefined)
	const [isLoading, setIsLoading] = useState<boolean>(true)

	const appearOffline = useCallback(async (toggle: boolean) => {
		showFullScreenLoadingModal()

		try {
			await userAppearOffline(toggle)

			setAccount(prev => ({ ...prev, appearOffline: toggle }))
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	const muteAll = useCallback(async () => {
		showFullScreenLoadingModal()

		try {
			const conversations = await chatConversations()
			const promises: Promise<void>[] = []

			for (const conversation of conversations) {
				promises.push(chatMute(conversation.uuid, true))
			}

			await Promise.all(promises)

			eventListener.emit("updateChatConversations")
		} catch (e) {
			console.error(e)

			showToast({ message: e.toString() })
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	useEffect(() => {
		getAccount()
			.then(acc => {
				setAccount(acc)
			})
			.catch(err => {
				console.log(err)

				showToast({ message: err.toString() })
			})
			.finally(() => setIsLoading(false))

		const nickNameUpdatedListener = eventListener.on("nickNameUpdated", (name: string) => {
			setAccount(prev => ({ ...prev, nickName: name, displayName: name }))
		})

		return () => {
			nickNameUpdatedListener.remove()
		}
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "settings")}
				middleText={i18n(lang, "chatSettings")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				{isLoading || !account ? (
					<ActivityIndicator
						size="small"
						color={getColor(darkMode, "textPrimary")}
						style={{
							marginTop: "70%"
						}}
					/>
				) : (
					<>
						<SettingsGroup>
							<SettingsButtonLinkHighlight
								onPress={() => eventListener.emit("openChatNickNameDialog", account)}
								title={i18n(lang, "nickname")}
								withBottomBorder={true}
								borderTopRadius={10}
								rightComponent={
									<View
										style={{
											marginRight: -5,
											flexDirection: "row",
											alignItems: "center",
											gap: 5
										}}
									>
										{typeof account.nickName === "string" && account.nickName.length > 0 && (
											<Text
												style={{
													color: getColor(darkMode, "textSecondary"),
													fontSize: 17
												}}
												numberOfLines={1}
											>
												{account.nickName.length >= 12 ? account.nickName.slice(0, 12) + "..." : account.nickName}
											</Text>
										)}
										<Ionicon
											name="chevron-forward-outline"
											size={18}
											color="gray"
											style={{
												marginTop: 2
											}}
										/>
									</View>
								}
							/>
							<SettingsButtonLinkHighlight
								title={i18n(lang, "appearOffline")}
								withBottomBorder={true}
								rightComponent={
									<Switch
										trackColor={getColor(darkMode, "switchTrackColor")}
										thumbColor={
											!true
												? getColor(darkMode, "switchThumbColorEnabled")
												: getColor(darkMode, "switchThumbColorDisabled")
										}
										ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
										onValueChange={value => appearOffline(value)}
										value={account.appearOffline}
									/>
								}
							/>
							<SettingsButtonLinkHighlight
								onPress={muteAll}
								title={i18n(lang, "muteAllChats")}
								borderBottomRadius={10}
							/>
						</SettingsGroup>
						<View
							style={{
								height: 25
							}}
						/>
					</>
				)}
			</ScrollView>
		</>
	)
})

export default SettingsChatsScreen
