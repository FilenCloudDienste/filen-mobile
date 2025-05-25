import { memo, Fragment, useCallback, useState, useMemo } from "react"
import { LargeTitleHeader } from "../nativewindui/LargeTitleHeader"
import { View, RefreshControl } from "react-native"
import { useTransfersStore } from "@/stores/transfers.store"
import { Toolbar, ToolbarIcon } from "../nativewindui/Toolbar"
import { List, ESTIMATED_ITEM_HEIGHT, type ListDataItem } from "@/components/nativewindui/List"
import Container from "../Container"
import { Text } from "../nativewindui/Text"
import Transfer, { type ListItemInfo } from "./transfer"
import { formatBytes, promiseAllChunked, normalizeTransferProgress, bpsToReadable } from "@/lib/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import { type LegendListRenderItemProps } from "@legendapp/list"

export const Transfers = memo(() => {
	const transfers = useTransfersStore(useShallow(state => state.transfers))
	const finishedTransfers = useTransfersStore(useShallow(state => state.finishedTransfers))
	const speed = useTransfersStore(useShallow(state => state.speed))
	const remaining = useTransfersStore(useShallow(state => state.remaining))
	const [refreshing, setRefreshing] = useState<boolean>(false)

	const data = useMemo(() => {
		return transfers
			.map(transfer => ({
				id: transfer.id,
				title: transfer.name,
				subTitle: formatBytes(transfer.size),
				transfer
			}))
			.sort(
				(a, b) =>
					normalizeTransferProgress(b.transfer.size, b.transfer.bytes) -
					normalizeTransferProgress(a.transfer.size, a.transfer.bytes)
			)
			.concat(
				finishedTransfers
					.map(transfer => ({
						id: transfer.id,
						title: transfer.name,
						subTitle: formatBytes(transfer.size),
						transfer
					}))
					.sort((a, b) => b.transfer.finishedTimestamp - a.transfer.finishedTimestamp)
			)
	}, [transfers, finishedTransfers])

	const ongoingTransfers = useMemo(() => {
		return transfers.filter(transfer => transfer.state === "queued" || transfer.state === "started" || transfer.state === "paused")
	}, [transfers])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback((info: LegendListRenderItemProps<ListItemInfo>) => {
		return <Transfer info={info} />
	}, [])

	const pauseAll = useCallback(async () => {
		try {
			const transfers = useTransfersStore.getState().transfers

			await promiseAllChunked(
				transfers.map(async transfer => {
					if (transfer.state !== "started" || normalizeTransferProgress(transfer.size, transfer.bytes) >= 95) {
						return
					}

					await nodeWorker.proxy("transferAction", {
						id: transfer.id,
						action: "pause"
					})
				})
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const resumeAll = useCallback(async () => {
		try {
			const transfers = useTransfersStore.getState().transfers

			await promiseAllChunked(
				transfers.map(async transfer => {
					if (transfer.state !== "paused" || normalizeTransferProgress(transfer.size, transfer.bytes) >= 95) {
						return
					}

					await nodeWorker.proxy("transferAction", {
						id: transfer.id,
						action: "resume"
					})
				})
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const paused = useMemo(() => {
		return ongoingTransfers.some(transfers => transfers.state === "paused")
	}, [ongoingTransfers])

	const canStop = useMemo(() => {
		return ongoingTransfers.length > 0 && ongoingTransfers.some(transfer => transfer.state === "started")
	}, [ongoingTransfers])

	const canResume = useMemo(() => {
		return ongoingTransfers.length > 0 && ongoingTransfers.some(transfer => transfer.state === "paused")
	}, [ongoingTransfers])

	return (
		<Fragment>
			<LargeTitleHeader
				title="Transfers"
				backVisible={true}
				materialPreset="stack"
				iosBackButtonTitle="Back"
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
			/>
			<View className="flex-1">
				<Container>
					<View className="flex-1">
						<List
							variant="full-width"
							data={data}
							estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							refreshing={refreshing}
							contentInsetAdjustmentBehavior="automatic"
							contentContainerClassName="pb-16"
							drawDistance={ESTIMATED_ITEM_HEIGHT.withSubTitle * 3}
							ListHeaderComponent={
								ongoingTransfers.length > 0 ? (
									<View className="flex-1 flex-row px-4 pb-4">
										<Text
											numberOfLines={1}
											ellipsizeMode="middle"
											className="text-sm text-muted-foreground"
										>
											Transferring {ongoingTransfers.length} items at {bpsToReadable(speed)}, {remaining} remaining
										</Text>
									</View>
								) : undefined
							}
							ListEmptyComponent={
								<View className="flex-1 items-center justify-center">
									<Text>No transfers</Text>
								</View>
							}
							refreshControl={
								<RefreshControl
									refreshing={refreshing}
									onRefresh={async () => {
										setRefreshing(true)

										await nodeWorker.updateTransfers().catch(() => {})

										setRefreshing(false)
									}}
								/>
							}
						/>
					</View>
				</Container>
			</View>
			<Toolbar
				leftView={
					<ToolbarIcon
						disabled={!canResume}
						icon={{
							name: "delete-circle-outline"
						}}
						onPress={resumeAll}
					/>
				}
				rightView={
					paused ? (
						<ToolbarIcon
							disabled={!canResume}
							icon={{
								name: "play-circle-outline"
							}}
							onPress={resumeAll}
						/>
					) : (
						<ToolbarIcon
							disabled={!canStop}
							icon={{
								name: "stop-circle-outline"
							}}
							onPress={pauseAll}
						/>
					)
				}
			/>
		</Fragment>
	)
})

Transfers.displayName = "Transfers"

export default Transfers
