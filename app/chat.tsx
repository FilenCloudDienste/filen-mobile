import { useLocalSearchParams, Redirect, Stack, useFocusEffect } from "expo-router"
import { useMemo, memo, useCallback, useState, useRef, useEffect } from "react"
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
import nodeWorker from "@/lib/nodeWorker"
import queryUtils from "@/queries/utils"
import Container from "@/components/Container"
import * as ScreenOrientation from "expo-screen-orientation"
import useNetInfo from "@/hooks/useNetInfo"

export const Chat = memo(() => {
	const { uuid } = useLocalSearchParams()
	const { colors } = useColorScheme()
	const [{ userId }] = useSDKConfig()
	const [inputHeight, setInputHeight] = useState<number>(0)
	const isScreenFocusedRef = useRef<boolean>(true)
	const didRunOnFocusOrExitEnteringRef = useRef<boolean>(false)
	const { hasInternet } = useNetInfo()

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
							name="dots-horizontal-circle-outline"
							size={24}
							color={colors.primary}
						/>
					</Button>
				</Menu>
			</View>
		)
	}, [colors.primary, chatParsed, hasInternet])

	const onFocusOrExit = useCallback(
		async (type: "entering" | "exiting") => {
			if (!chatParsed) {
				return
			}

			try {
				queryUtils.useChatUnreadCountQuerySet({
					uuid: chatParsed.uuid,
					updater: count => {
						queryUtils.useChatUnreadQuerySet({
							updater: prev => (prev - count >= 0 ? prev - count : 0)
						})

						return 0
					}
				})

				const lastFocusTimestamp = Date.now()

				if (type === "exiting") {
					queryUtils.useChatsLastFocusQuerySet({
						updater: prev =>
							prev.map(v =>
								v.uuid === chatParsed.uuid
									? {
											...v,
											lastFocus: lastFocusTimestamp
										}
									: v
							)
					})
				}

				await Promise.all([
					nodeWorker.proxy("sendChatTyping", {
						conversation: chatParsed.uuid,
						type: "up"
					}),
					nodeWorker.proxy("chatMarkAsRead", {
						conversation: chatParsed.uuid
					}),
					(async () => {
						const lastFocusValues = await nodeWorker.proxy("fetchChatsLastFocus", undefined)

						await nodeWorker.proxy("updateChatsLastFocus", {
							values: lastFocusValues.map(v =>
								v.uuid === chatParsed.uuid
									? {
											...v,
											lastFocus: lastFocusTimestamp
										}
									: v
							)
						})
					})()
				])
			} catch (e) {
				console.error(e)
			}
		},
		[chatParsed]
	)

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
						headerBackTitle: "Back",
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
	}, [name, headerRightView, colors.card])

	useFocusEffect(
		useCallback(() => {
			isScreenFocusedRef.current = true

			ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(console.error)

			return () => {
				isScreenFocusedRef.current = false

				ScreenOrientation.unlockAsync().catch(console.error)
			}
		}, [])
	)

	useEffect(() => {
		if (isScreenFocusedRef.current && !didRunOnFocusOrExitEnteringRef.current) {
			didRunOnFocusOrExitEnteringRef.current = true

			onFocusOrExit("entering")
		}

		return () => {
			if (!isScreenFocusedRef.current && !didRunOnFocusOrExitEnteringRef.current) {
				didRunOnFocusOrExitEnteringRef.current = true

				onFocusOrExit("exiting")
			}
		}
	}, [onFocusOrExit])

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
