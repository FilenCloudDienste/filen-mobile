import { memo, Fragment } from "react"
import { View, ActivityIndicator } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import { Text } from "@/components/nativewindui/Text"

export const ListEmpty = memo(({ activeTab, pending }: { activeTab: string; pending: boolean }) => {
	const { colors } = useColorScheme()

	return (
		<View className="flex-1 items-center justify-center pt-[200px] px-4">
			{pending ? (
				<ActivityIndicator
					size="small"
					color={colors.foreground}
				/>
			) : (
				<Fragment>
					{activeTab === "all" && (
						<Text className="text-muted-foreground text-center">
							No contacts found. You can add new contacts by searching for their email or username.
						</Text>
					)}
					{activeTab === "online" && (
						<Fragment>
							<Text className="text-muted-foreground text-center text-sm">No online contacts found.</Text>
						</Fragment>
					)}
					{activeTab === "offline" && (
						<Fragment>
							<Text className="text-muted-foreground text-center text-sm">No offline contacts found.</Text>
						</Fragment>
					)}
					{activeTab === "requests" && (
						<Fragment>
							<Text className="text-muted-foreground text-center text-sm">No incoming contact requests found.</Text>
						</Fragment>
					)}
					{activeTab === "pending" && (
						<Fragment>
							<Text className="text-muted-foreground text-center text-sm">No pending contact requests found.</Text>
						</Fragment>
					)}
					{activeTab === "blocked" && (
						<Fragment>
							<Text className="text-muted-foreground text-center text-sm">No blocked contact requests found.</Text>
						</Fragment>
					)}
				</Fragment>
			)}
		</View>
	)
})

ListEmpty.displayName = "ListEmpty"

export default ListEmpty
