import useIsAuthed from "@/hooks/useIsAuthed"
import { Redirect } from "expo-router"
import { useMemo } from "react"
import useChatUnreadQuery from "@/queries/useChatUnreadQuery"
import Tabs from "@/components/tabs"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"

export default function TabsLayout() {
	const [isAuthed] = useIsAuthed()
	const { colors } = useColorScheme()

	const chatUnreadQuery = useChatUnreadQuery({
		refetchInterval: 15000
	})

	const chatUnread = useMemo(() => {
		if (chatUnreadQuery.status !== "success") {
			return 0
		}

		return chatUnreadQuery.data
	}, [chatUnreadQuery.data, chatUnreadQuery.status])

	if (!isAuthed) {
		return <Redirect href="/(auth)" />
	}

	return (
		<Tabs initialRouteName="home">
			<Tabs.Screen
				name="home"
				options={{
					tabBarLabel: "Home",
					tabBarActiveTintColor: colors.primary,
					tabBarIcon: ({ focused }) =>
						Platform.OS === "ios"
							? {
									sfSymbol: focused ? "house.fill" : "house"
							  }
							: focused
							? require("../../assets/android_tabs/home_fill.png")
							: require("../../assets/android_tabs/home.png")
				}}
			/>
			<Tabs.Screen
				name="drive"
				options={{
					tabBarLabel: "Drive",
					tabBarActiveTintColor: colors.primary,
					tabBarIcon: ({ focused }) =>
						Platform.OS === "ios"
							? {
									sfSymbol: focused ? "folder.fill" : "folder"
							  }
							: focused
							? require("../../assets/android_tabs/folder_fill.png")
							: require("../../assets/android_tabs/folder.png")
				}}
			/>
			<Tabs.Screen
				name="photos"
				options={{
					tabBarLabel: "Photos",
					tabBarActiveTintColor: colors.primary,
					tabBarIcon: ({ focused }) =>
						Platform.OS === "ios"
							? {
									sfSymbol: focused ? "photo.fill" : "photo"
							  }
							: focused
							? require("../../assets/android_tabs/image_fill.png")
							: require("../../assets/android_tabs/image.png")
				}}
			/>
			<Tabs.Screen
				name="notes"
				options={{
					tabBarLabel: "Notes",
					tabBarActiveTintColor: colors.primary,
					tabBarIcon: ({ focused }) =>
						Platform.OS === "ios"
							? {
									sfSymbol: focused ? "book.fill" : "book"
							  }
							: focused
							? require("../../assets/android_tabs/notes_fill.png")
							: require("../../assets/android_tabs/notes.png")
				}}
			/>
			<Tabs.Screen
				name="chats"
				options={{
					tabBarLabel: "Chats",
					tabBarActiveTintColor: colors.primary,
					tabBarBadge: chatUnread > 0 ? chatUnread.toString() : undefined,
					tabBarIcon: ({ focused }) =>
						Platform.OS === "ios"
							? {
									sfSymbol: focused ? "message.fill" : "message"
							  }
							: focused
							? require("../../assets/android_tabs/chat_fill.png")
							: require("../../assets/android_tabs/chat.png")
				}}
			/>
		</Tabs>
	)
}
