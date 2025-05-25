import { useMemo } from "react"
import { type ViewStyle, type StyleProp } from "react-native"
import { useChatsStore } from "@/stores/chats.store"
import { useShallow } from "zustand/shallow"

export default function useChatEmbedContainerStyle() {
	const embedContainerWidth = useChatsStore(useShallow(state => state.embedContainerWidth))

	const rootStyle = useMemo((): StyleProp<ViewStyle> => {
		if (embedContainerWidth === 0) {
			return undefined
		}

		return {
			width: embedContainerWidth
		}
	}, [embedContainerWidth])

	return rootStyle
}
