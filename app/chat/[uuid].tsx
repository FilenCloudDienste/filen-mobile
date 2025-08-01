import { useLocalSearchParams, Redirect, Stack } from "expo-router"
import { useMemo, memo, useCallback, useState } from "react"
import { View, Platform } from "react-native"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Icon } from "@roninoss/icons"
import { Button } from "@/components/nativewindui/Button"
import { useColorScheme } from "@/lib/useColorScheme"
import useChatsQuery from "@/queries/useChatsQuery"
import { getChatName } from "@/components/chats/utils"
import useSDKConfig from "@/hooks/useSDKConfig"
import Messages from "@/components/chats/chat/messages"
import Input from "@/components/chats/chat/input"
import { KeyboardAvoidingView } from "react-native-keyboard-controller"
import Menu from "@/components/chats/item/menu"
import Container from "@/components/Container"
import * as ScreenOrientation from "expo-screen-orientation"
import useNetInfo from "@/hooks/useNetInfo"
import { useTranslation } from "react-i18next"
import useLockOrientation from "@/hooks/useLockOrientation"

export const Chat = memo(() => {
	useLockOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP)

	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [inputHeight, setInputHeight] = useState<number>(0)
	const { hasInternet } = useNetInfo()
	const { t } = useTranslation()

	const chatsQuery = useChatsQuery({
		enabled: false
	})

	const chatParsed = useMemo(() => {
		if (typeof uuid !== "string" || chatsQuery.status !== "success") {
			return null
		}

		const found = chatsQuery.data.find(chat => chat.uuid === uuid)

		if (!found) {
			return null
		}

		return found
	}, [uuid, chatsQuery.status, chatsQuery.data])

	const headerRightView = useCallback(() => {
		if (!chatParsed || !hasInternet) {
			return null
		}

		return (
			<View className="flex-row items-center">
				<Menu
					chat={chatParsed}
					type="dropdown"
					insideChat={true}
				>
					<Button
						variant="plain"
						size="icon"
					>
						<Icon
							namingScheme="sfSymbol"
							name="ellipsis"
							ios={{
								name: "ellipsis.circle"
							}}
							size={24}
							color={colors.primary}
						/>
					</Button>
				</Menu>
			</View>
		)
	}, [colors.primary, chatParsed, hasInternet])

	const name = useMemo(() => {
		if (!chatParsed) {
			return "Chat"
		}

		return getChatName(chatParsed, userId)
	}, [chatParsed, userId])

	const header = useMemo(() => {
		return Platform.select({
			ios: (
				<Stack.Screen
					options={{
						headerShown: true,
						headerTitle: name,
						headerBackTitle: t("transfers.header.back"),
						headerRight: headerRightView,
						headerTransparent: true,
						headerBlurEffect: "systemChromeMaterial"
					}}
				/>
			),
			default: (
				<LargeTitleHeader
					title={name}
					materialPreset="inline"
					backVisible={true}
					rightView={headerRightView}
					backgroundColor={colors.card}
				/>
			)
		})
	}, [name, headerRightView, colors.card, t])

	if (!chatParsed) {
		return <Redirect href="/chats" />
	}

	return (
		<View className="flex-1">
			{header}
			<KeyboardAvoidingView
				className="flex-1 min-h-2"
				behavior="padding"
			>
				<Container>
					<Messages
						chat={chatParsed}
						isPreview={false}
						inputHeight={inputHeight}
					/>
				</Container>
			</KeyboardAvoidingView>
			<Input
				chat={chatParsed}
				setInputHeight={setInputHeight}
			/>
		</View>
	)
})

Chat.displayName = "Chat"

export default Chat
