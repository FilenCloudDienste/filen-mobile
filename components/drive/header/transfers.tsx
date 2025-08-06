import { memo, useCallback, useMemo } from "react"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { Button } from "@/components/nativewindui/Button"
import { useTransfersStore } from "@/stores/transfers.store"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/shallow"

export const Transfers = memo(() => {
	const transfers = useTransfersStore(useShallow(state => state.transfers))
	const hiddenTransfers = useTransfersStore(useShallow(state => state.hiddenTransfers))
	const { push: routerPush } = useRouter()

	const ongoingTransfersLength = useMemo(() => {
		return transfers.filter(
			transfer =>
				(!hiddenTransfers[transfer.id] && transfer.state === "queued") ||
				transfer.state === "started" ||
				transfer.state === "paused"
		).length
	}, [transfers, hiddenTransfers])

	const onPress = useCallback(() => {
		routerPush({
			pathname: "/transfers"
		})
	}, [routerPush])

	const empty = useMemo(() => {
		return (
			<Button
				variant="plain"
				size="icon"
			>
				<ActivityIndicator
					size="small"
					className="text-transparent"
					color="transparent"
				/>
			</Button>
		)
	}, [])

	if (ongoingTransfersLength === 0) {
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
