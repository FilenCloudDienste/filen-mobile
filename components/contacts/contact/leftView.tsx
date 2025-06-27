import { memo, useMemo } from "react"
import { View } from "react-native"
import { type ListRenderItemInfo } from "@/components/nativewindui/List"
import Avatar from "@/components/avatar"
import { type ListItemInfo } from "."
import { Checkbox } from "@/components/nativewindui/Checkbox"
import { convertTimestampToMs } from "@/lib/utils"
import { cn } from "@/lib/cn"
import { CONTACTS_ONLINE_TIMEOUT } from "@/lib/constants"

const avatarStyle = {
	width: 36,
	height: 36
}

export const LeftView = memo(
	({
		info,
		fromSelect,
		isSelected,
		select
	}: {
		info: ListRenderItemInfo<ListItemInfo>
		fromSelect?: { max: number }
		isSelected: boolean
		select: () => void
	}) => {
		const isOnline = useMemo(() => {
			if (info.item.type === "contact") {
				return convertTimestampToMs(info.item.contact.lastActive) > Date.now() - CONTACTS_ONLINE_TIMEOUT
			}

			return null
		}, [info.item])

		const avatarSource = useMemo(() => {
			switch (info.item.type) {
				case "contact":
				case "blocked": {
					return info.item.contact.avatar?.startsWith("https")
						? {
								uri: info.item.contact.avatar
						  }
						: {
								uri: "avatar_fallback"
						  }
				}

				case "incomingRequest":
				case "outgoingRequest": {
					return info.item.request.avatar?.startsWith("https")
						? {
								uri: info.item.request.avatar
						  }
						: {
								uri: "avatar_fallback"
						  }
				}
			}
		}, [info.item])

		return (
			<View className="flex flex-row items-center justify-center px-4 gap-4">
				{fromSelect && (
					<Checkbox
						checked={isSelected}
						onCheckedChange={select}
					/>
				)}
				{isOnline !== null && (
					<View
						className={cn("absolute bottom-0 right-3.5 w-3 h-3 rounded-full z-50", isOnline ? "bg-green-500" : "bg-red-500")}
					/>
				)}
				<Avatar
					style={avatarStyle}
					source={avatarSource}
				/>
			</View>
		)
	}
)

LeftView.displayName = "LeftView"

export default LeftView
