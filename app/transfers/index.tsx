import RequireInternet from "@/components/requireInternet"
import { memo, useCallback, useState, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { View, RefreshControl, Platform } from "react-native"
import { useTransfersStore } from "@/stores/transfers.store"
import { Toolbar, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { Text } from "@/components/nativewindui/Text"
import Transfer, { type ListItemInfo, LIST_ITEM_HEIGHT } from "@/components/transfers/transfer"
import { formatBytes, promiseAllChunked, normalizeTransferProgress, bpsToReadable } from "@/lib/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { useColorScheme } from "@/lib/useColorScheme"
import useDimensions from "@/hooks/useDimensions"

export const Transfers = memo(() => {
	const transfers = useTransfersStore(useShallow(state => state.transfers))
	const finishedTransfers = useTransfersStore(useShallow(state => state.finishedTransfers))
	const speed = useTransfersStore(useShallow(state => state.speed))
	const remaining = useTransfersStore(useShallow(state => state.remaining))
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const { screen } = useDimensions()

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

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Transfer info={info} />
	}, [])

	const pauseAll = useCallback(async () => {
		try {
			const transfers = useTransfersStore.getState().transfers

			await promiseAllChunked(
				transfers.map(async transfer => {
					if (
						!(transfer.state === "queued" || transfer.state === "started") ||
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 95
					) {
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
					if (
						!(transfer.state === "queued" || transfer.state === "paused") ||
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 95
					) {
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

	const stopAll = useCallback(async () => {
		try {
			const transfers = useTransfersStore.getState().transfers

			await promiseAllChunked(
				transfers.map(async transfer => {
					if (
						!(transfer.state === "queued" || transfer.state === "started") ||
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 95
					) {
						return
					}

					await nodeWorker.proxy("transferAction", {
						id: transfer.id,
						action: "stop"
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

	const allPaused = useMemo(() => {
		return ongoingTransfers.every(transfers => transfers.state === "paused")
	}, [ongoingTransfers])

	const canStop = useMemo(() => {
		return ongoingTransfers.length > 0 && ongoingTransfers.some(transfer => transfer.state === "started")
	}, [ongoingTransfers])

	const canResume = useMemo(() => {
		return ongoingTransfers.length > 0 && ongoingTransfers.some(transfer => transfer.state === "paused")
	}, [ongoingTransfers])

	const info = useMemo(() => {
		if (ongoingTransfers.length === 0) {
			return null
		}

		return `Transferring ${ongoingTransfers.length} items at ${bpsToReadable(speed)}, ${remaining} remaining`
	}, [ongoingTransfers.length, speed, remaining])

	const header = useMemo(() => {
		return Platform.OS === "android" ? (
			<LargeTitleHeader
				title="Transfers"
				backVisible={true}
				materialPreset="stack"
				iosBackButtonTitle="Back"
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
			/>
		) : (
			<AdaptiveSearchHeader
				iosTitle="Transfers"
				backVisible={true}
				iosBackButtonTitle="Back"
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
				backgroundColor={colors.card}
			/>
		)
	}, [colors.card])

	const listHeader = useMemo(() => {
		return Platform.OS === "android" && info ? (
			<View className="flex-1 flex-row px-4 pb-4">
				<Text
					numberOfLines={1}
					ellipsizeMode="middle"
					className="text-sm text-muted-foreground flex-1"
				>
					{info}
				</Text>
			</View>
		) : undefined
	}, [info])

	const listEmpty = useMemo(() => {
		return (
			<View className="flex-1 items-center justify-center">
				<Text>No transfers</Text>
			</View>
		)
	}, [])

	const refreshControl = useMemo(() => {
		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={async () => {
					setRefreshing(true)

					await nodeWorker.updateTransfers().catch(() => {})

					setRefreshing(false)
				}}
			/>
		)
	}, [refreshing])

	const { initialNumToRender, maxToRenderPerBatch } = useMemo(() => {
		return {
			initialNumToRender: Math.round(screen.height / LIST_ITEM_HEIGHT),
			maxToRenderPerBatch: Math.round(screen.height / LIST_ITEM_HEIGHT / 2)
		}
	}, [screen.height])

	const getItemLayout = useCallback((_: ArrayLike<ListItemInfo> | null | undefined, index: number) => {
		return {
			length: LIST_ITEM_HEIGHT,
			offset: LIST_ITEM_HEIGHT * index,
			index
		}
	}, [])

	const toolbarLeftView = useMemo(() => {
		return (
			<ToolbarIcon
				disabled={!canStop}
				icon={{
					ios: {
						name: "stop"
					},
					name: "stop",
					color: colors.destructive
				}}
				onPress={stopAll}
			/>
		)
	}, [canStop, stopAll, colors.destructive])

	const toolbarRightView = useMemo(() => {
		return allPaused ? (
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
					name: "pause",
					color: colors.destructive
				}}
				onPress={pauseAll}
			/>
		)
	}, [canResume, canStop, allPaused, resumeAll, pauseAll, colors.destructive])

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					variant="full-width"
					data={data}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-16"
					ListHeaderComponent={listHeader}
					ListEmptyComponent={listEmpty}
					refreshControl={refreshControl}
					removeClippedSubviews={true}
					initialNumToRender={initialNumToRender}
					maxToRenderPerBatch={maxToRenderPerBatch}
					updateCellsBatchingPeriod={100}
					windowSize={3}
					getItemLayout={getItemLayout}
				/>
			</Container>
			<Toolbar
				iosHint={info ?? undefined}
				leftView={toolbarLeftView}
				rightView={toolbarRightView}
			/>
		</RequireInternet>
	)
})

Transfers.displayName = "Transfers"

export default Transfers
