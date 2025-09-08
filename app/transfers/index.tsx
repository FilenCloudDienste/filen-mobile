import RequireInternet from "@/components/requireInternet"
import { memo, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { View, Platform } from "react-native"
import { useTransfersStore } from "@/stores/transfers.store"
import { Toolbar, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import Container from "@/components/Container"
import { Text } from "@/components/nativewindui/Text"
import Transfer, { type ListItemInfo } from "@/components/transfers/transfer"
import { formatBytes, promiseAllChunked, normalizeTransferProgress, bpsToReadable, getTimeRemaining } from "@/lib/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"
import ListEmpty from "@/components/listEmpty"

export const Transfers = memo(() => {
	const transfers = useTransfersStore(useShallow(state => state.transfers))
	const finishedTransfers = useTransfersStore(useShallow(state => state.finishedTransfers))
	const speed = useTransfersStore(useShallow(state => state.speed))
	const remaining = useTransfersStore(useShallow(state => state.remaining))
	const hiddenTransfers = useTransfersStore(useShallow(state => state.hiddenTransfers))
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const data = useMemo(() => {
		return transfers
			.filter(transfer => !hiddenTransfers[transfer.id])
			.map(transfer => ({
				id: `${transfer.id}:${transfer.state}:${transfer.type}:${transfer.name}`,
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
					.filter(transfer => !hiddenTransfers[transfer.id])
					.map(transfer => ({
						id: `${transfer.id}:${transfer.state}:${transfer.type}:${transfer.name}`,
						title: transfer.name,
						subTitle: formatBytes(transfer.size),
						transfer
					}))
					.sort((a, b) => b.transfer.finishedTimestamp - a.transfer.finishedTimestamp)
			)
	}, [transfers, finishedTransfers, hiddenTransfers])

	const ongoingTransfers = useMemo(() => {
		return transfers.filter(
			transfer =>
				(!hiddenTransfers[transfer.id] && transfer.state === "queued") ||
				transfer.state === "started" ||
				transfer.state === "paused"
		)
	}, [transfers, hiddenTransfers])

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
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 99
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
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 99
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
						normalizeTransferProgress(transfer.size, transfer.bytes) >= 99
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

		const remainingReadable = getTimeRemaining(Math.floor(Date.now() + remaining * 1000))

		return t("transfers.info", {
			ongoingTransfers: ongoingTransfers.length,
			speed: bpsToReadable(speed),
			remaining:
				remainingReadable.total <= 1 || remainingReadable.seconds <= 1
					? "1s"
					: (remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
					  (remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
					  (remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
					  (remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
		})
	}, [ongoingTransfers.length, speed, remaining, t])

	const header = useMemo(() => {
		return Platform.OS === "android" ? (
			<LargeTitleHeader
				title={t("transfers.header.title")}
				backVisible={true}
				materialPreset="stack"
				iosBackButtonTitle={t("transfers.header.back")}
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
			/>
		) : (
			<AdaptiveSearchHeader
				iosTitle={t("transfers.header.title")}
				backVisible={true}
				iosBackButtonTitle={t("transfers.header.back")}
				iosBackButtonMenuEnabled={false}
				iosBackButtonTitleVisible={true}
				backgroundColor={colors.card}
			/>
		)
	}, [colors.card, t])

	const ListHeaderComponent = useCallback(() => {
		if (Platform.OS !== "android") {
			return undefined
		}

		return (
			<View className="flex-1 flex-row px-4 pb-4">
				<Text
					numberOfLines={1}
					ellipsizeMode="middle"
					className="text-sm text-muted-foreground flex-1"
				>
					{info ? info : t("transfers.noOngoingTransfers")}
				</Text>
			</View>
		)
	}, [info, t])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus="success"
				itemCount={transfers.length}
				texts={{
					error: t("transfers.list.error"),
					empty: t("transfers.list.empty"),
					emptySearch: t("transfers.list.emptySearch")
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "wifi"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [transfers.length, t])

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
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-16"
					ListHeaderComponent={ListHeaderComponent}
					ListEmptyComponent={ListEmptyComponent}
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
