import { memo, useMemo } from "react"
import { View, ScrollView } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useContactsRequestsQuery from "@/queries/useContactsRequests.query"
import { translateMemoized } from "@/lib/i18n"

export const ListHeader = memo(() => {
	const [contactsActiveTab, setContactsActiveTab] = useMMKVString("contactsActiveTab", mmkvInstance)

	const contactsRequestsQuery = useContactsRequestsQuery({
		enabled: false
	})

	const activeTab = useMemo(() => {
		return contactsActiveTab ?? "all"
	}, [contactsActiveTab])

	return (
		<ScrollView
			horizontal={true}
			showsHorizontalScrollIndicator={false}
			showsVerticalScrollIndicator={false}
			directionalLockEnabled={true}
			contentContainerClassName="gap-2 py-2 h-12 px-4"
		>
			{(["all", "online", "offline", "requests", "pending", "blocked"] as const).map(tab => {
				return (
					<Button
						key={tab}
						variant="plain"
						size="none"
						className={cn(
							"bg-card rounded-full px-2.5 py-1.5 flex-row gap-2 items-center",
							activeTab === tab ? "border border-border" : "border border-transparent"
						)}
						androidRootClassName="rounded-full overflow-hidden"
						onPress={() => setContactsActiveTab(tab)}
						onLongPress={() => setContactsActiveTab(tab)}
					>
						<Text className={cn("text-sm", activeTab === tab ? "text-foreground" : "text-muted-foreground")}>
							{tab === "all"
								? translateMemoized("settings.contacts.tabs.all")
								: tab === "blocked"
								? translateMemoized("settings.contacts.tabs.blocked")
								: tab === "offline"
								? translateMemoized("settings.contacts.tabs.offline")
								: tab === "online"
								? translateMemoized("settings.contacts.tabs.online")
								: tab === "pending"
								? translateMemoized("settings.contacts.tabs.pending")
								: tab === "requests"
								? translateMemoized("settings.contacts.tabs.requests")
								: ""}
						</Text>
						{tab === "requests" &&
							contactsRequestsQuery.status === "success" &&
							contactsRequestsQuery.data.incoming.length > 0 && (
								<View className="bg-red-500 rounded-full w-[18px] h-[18px] items-center justify-center">
									<Text className="text-xs text-white">
										{contactsRequestsQuery.data.incoming.length >= 9 ? 9 : contactsRequestsQuery.data.incoming.length}
									</Text>
								</View>
							)}
						{tab === "pending" &&
							contactsRequestsQuery.status === "success" &&
							contactsRequestsQuery.data.outgoing.length > 0 && (
								<View className="bg-red-500 rounded-full w-[18px] h-[18px] items-center justify-center">
									<Text className="text-xs text-white">
										{contactsRequestsQuery.data.outgoing.length >= 9 ? 9 : contactsRequestsQuery.data.outgoing.length}
									</Text>
								</View>
							)}
					</Button>
				)
			})}
		</ScrollView>
	)
})

ListHeader.displayName = "ListHeader"

export default ListHeader
