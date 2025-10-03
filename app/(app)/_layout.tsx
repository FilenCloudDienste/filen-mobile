import useIsAuthed from "@/hooks/useIsAuthed"
import { Redirect } from "expo-router"
import { useMemo } from "react"
import useChatUnreadQuery from "@/queries/useChatUnread.query"
import Tabs from "@/components/tabs"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"
import { type NativeBottomTabNavigationOptions } from "@bottom-tabs/react-navigation"
import { useTranslation } from "react-i18next"

export default function TabsLayout() {
	const [isAuthed] = useIsAuthed()
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const chatUnreadQuery = useChatUnreadQuery({
		refetchInterval: 15000
	})

	const chatUnread = useMemo(() => {
		if (chatUnreadQuery.status !== "success") {
			return 0
		}

		return chatUnreadQuery.data
	}, [chatUnreadQuery.data, chatUnreadQuery.status])

	const tabsOptions = useMemo(() => {
		return {
			tabBarActiveTintColor: colors.primary
		} satisfies NativeBottomTabNavigationOptions
	}, [colors.primary])

	const homeOptions = useMemo(() => {
		return {
			tabBarLabel: t("tabBar.home"),
			title: t("tabBar.home"),
			tabBarIcon: ({ focused }) =>
				Platform.OS === "ios"
					? {
							sfSymbol: focused ? "house.fill" : "house"
					  }
					: focused
					? require("../../assets/android_tabs/home_fill.png")
					: require("../../assets/android_tabs/home.png")
		} satisfies NativeBottomTabNavigationOptions
	}, [t])

	const driveOptions = useMemo(() => {
		return {
			tabBarLabel: t("tabBar.drive"),
			title: t("tabBar.drive"),
			tabBarIcon: ({ focused }) =>
				Platform.OS === "ios"
					? {
							sfSymbol: focused ? "folder.fill" : "folder"
					  }
					: focused
					? require("../../assets/android_tabs/folder_fill.png")
					: require("../../assets/android_tabs/folder.png")
		} satisfies NativeBottomTabNavigationOptions
	}, [t])

	const photosOptions = useMemo(() => {
		return {
			tabBarLabel: t("tabBar.photos"),
			title: t("tabBar.photos"),
			tabBarIcon: ({ focused }) =>
				Platform.OS === "ios"
					? {
							sfSymbol: focused ? "photo.fill" : "photo"
					  }
					: focused
					? require("../../assets/android_tabs/image_fill.png")
					: require("../../assets/android_tabs/image.png")
		} satisfies NativeBottomTabNavigationOptions
	}, [t])

	const notesOptions = useMemo(() => {
		return {
			tabBarLabel: t("tabBar.notes"),
			title: t("tabBar.notes"),
			tabBarIcon: ({ focused }) =>
				Platform.OS === "ios"
					? {
							sfSymbol: focused ? "book.fill" : "book"
					  }
					: focused
					? require("../../assets/android_tabs/notes_fill.png")
					: require("../../assets/android_tabs/notes.png")
		} satisfies NativeBottomTabNavigationOptions
	}, [t])

	const chatsOptions = useMemo(() => {
		return {
			tabBarLabel: t("tabBar.chats"),
			title: t("tabBar.chats"),
			tabBarBadge: chatUnread > 0 ? chatUnread.toString() : undefined,
			tabBarIcon: ({ focused }) =>
				Platform.OS === "ios"
					? {
							sfSymbol: focused ? "message.fill" : "message"
					  }
					: focused
					? require("../../assets/android_tabs/chat_fill.png")
					: require("../../assets/android_tabs/chat.png")
		} satisfies NativeBottomTabNavigationOptions
	}, [chatUnread, t])

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Tabs
			initialRouteName="home"
			screenOptions={tabsOptions}
		>
			<Tabs.Screen
				name="home"
				options={homeOptions}
			/>
			<Tabs.Screen
				name="drive"
				options={driveOptions}
			/>
			<Tabs.Screen
				name="photos"
				options={photosOptions}
			/>
			<Tabs.Screen
				name="notes"
				options={notesOptions}
			/>
			<Tabs.Screen
				name="chats"
				options={chatsOptions}
			/>
		</Tabs>
	)
}
