import { memo, useCallback, useMemo } from "react"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { Button } from "@/components/nativewindui/Button"
import { useTransfersStore } from "@/stores/transfers.store"
import { useRouter } from "expo-router"
import { Platform } from "react-native"
import { useShallow } from "zustand/shallow"

export const Transfers = memo(() => {
	const activeTransfersCount = useTransfersStore(useShallow(state => state.transfers.length))
	const { push: routerPush } = useRouter()

	const onPress = useCallback(() => {
		routerPush({
			pathname: "/transfers"
		})
	}, [routerPush])

	const empty = useMemo(() => {
		return Platform.select({
			ios: (
				<Button
					variant="plain"
					size="icon"
				>
					<ActivityIndicator
						size="small"
						className="text-transparent"
					/>
				</Button>
			),
			default: null
		})
	}, [])

	if (activeTransfersCount === 0) {
		return empty
	}

	return (
		<Button
			variant="plain"
			size="icon"
			onPress={onPress}
			hitSlop={10}
		>
			<ActivityIndicator size="small" />
		</Button>
	)
})

Transfers.displayName = "Transfers"

export default Transfers
