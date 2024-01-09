import React, { memo, useCallback, useMemo } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import useLang from "../../lib/hooks/useLang"
import Ionicon from "@expo/vector-icons/Ionicons"
import { i18n } from "../../i18n"
import { getColor } from "../../style/colors"
import { SheetManager } from "react-native-actions-sheet"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { Bar } from "react-native-progress"
import { Item } from "../../types"
import { normalizeProgress, formatBytes, randomIdUnsafe, getRandomArbitrary } from "../../lib/helpers"
import { NavigationContainerRef } from "@react-navigation/native"
import { FlashList } from "@shopify/flash-list"
import useDimensions from "../../lib/hooks/useDimensions"
import { useStore } from "../../lib/state"
import eventListener from "../../lib/eventListener"

export interface FinishedTransfersListProps {
	finishedTransfers: any
}

export interface FinishedTransferItemProps {
	index: number
	item: any
	containerWidth: number
	darkMode: boolean
}

export type Transfer = {
	uuid: string
	started: number
	bytes: number
	percent: number
	lastTime: number
	lastBps: number
	timeLeft: number
	timestamp: number
	size: number
	name: string
}

export type CurrentUploads = Record<string, Transfer>

export type CurrentDownloads = Record<string, Transfer>

export type FinishedTransfer = Item & {
	transferType: string
}

export type TransferItem = {
	name: string
	progress: number
	timeLeft: number
	lastBps: number
	uuid: string
	type: "upload" | "download"
	done: boolean
	failed: boolean
	stopped: boolean
	paused: boolean
	failedReason?: string
	size: number
	bytes: number
}

const ListItem = memo(
	({
		transfer,
		darkMode,
		dimensions,
		index,
		lang,
		transfers
	}: {
		transfer: TransferItem
		darkMode: boolean
		dimensions: ReturnType<typeof useDimensions>
		index: number
		lang: string
		transfers: TransferItem[]
	}) => {
		const progress = useMemo(() => {
			return normalizeProgress(transfer.progress)
		}, [transfer.progress])

		return (
			<TouchableOpacity
				style={{
					width: "100%",
					height: 50,
					flexDirection: "column",
					justifyContent: "center",
					paddingLeft: 20,
					paddingRight: 20,
					gap: 6.5,
					marginBottom: index >= transfers.length - 1 ? 100 : 0
				}}
			>
				<View
					style={{
						width: "100%",
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center"
					}}
				>
					<Text
						style={{
							color: getColor(darkMode, "textPrimary"),
							fontSize: 14,
							maxWidth: "75%"
						}}
						numberOfLines={1}
					>
						{transfer.name}
					</Text>
					{!transfer.done && !transfer.failed && (
						<Text
							style={{
								color: getColor(darkMode, "textSecondary"),
								fontSize: 12
							}}
						>
							{progress >= 1
								? i18n(lang, "finishing")
								: progress <= 0
								? i18n(lang, "queued")
								: formatBytes(transfer.lastBps) + "/s"}
						</Text>
					)}
				</View>
				<View
					style={{
						width: "100%",
						flexDirection: "row",
						alignItems: "center"
					}}
				>
					<View
						style={{
							width: dimensions.realWidth - 40,
							height: 4,
							backgroundColor: transfer.failed ? getColor(darkMode, "red") : getColor(darkMode, "green"),
							borderRadius: 5
						}}
					/>
				</View>
			</TouchableOpacity>
		)
	}
)

/*const transfers: TransferItem[] = [0, 1, 2, 3, 4, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map(() => ({
	name: randomIdUnsafe() + ".txt",
	progress: getRandomArbitrary(50, 100),
	timeLeft: getRandomArbitrary(0, 100),
	lastBps: getRandomArbitrary(1, 999999999),
	uuid: randomIdUnsafe(),
	type: getRandomArbitrary(1, 3) === 1 ? "upload" : "download",
	done: getRandomArbitrary(1, 3) === 1,
	failed: getRandomArbitrary(1, 3) === 1,
	stopped: getRandomArbitrary(1, 5) === 1,
	paused: getRandomArbitrary(1, 5) === 1,
	failedReason: null
}))*/

export const TransfersScreen = memo(({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }) => {
	const transfers = useStore(state => state.transfers)
	const transfersProgress = useStore(state => state.transfersProgress)
	const darkMode = useDarkMode()
	const lang = useLang()
	const dimensions = useDimensions()
	const transfersPaused = useStore(state => state.transfersPaused)

	const groupedTransfers = useMemo(() => {
		const currentTransfers = transfers.filter(transfer => !transfer.done && !transfer.failed)
		let uploads = 0
		let downloads = 0
		let lastBpsSum = 0
		let timeLeftSum = 0

		for (const transfer of currentTransfers) {
			if (transfer.type === "upload") {
				uploads += 1
			} else {
				downloads += 1
			}

			lastBpsSum += transfer.lastBps
			timeLeftSum += transfer.timeLeft
		}

		return {
			downloads,
			uploads,
			lastBps: lastBpsSum,
			timeLeft: timeLeftSum
		}
	}, [transfers])

	const doneAndFailedTransfers = useMemo(() => {
		return transfers.filter(transfer => transfer.done || transfer.failed)
	}, [transfers])

	const keyExtractor = useCallback((item: TransferItem) => item.uuid, [])

	const renderItem = useCallback(
		({ item, index }: { item: TransferItem; index: number }) => {
			return (
				<ListItem
					darkMode={darkMode}
					transfer={item}
					dimensions={dimensions}
					index={index}
					lang={lang}
					transfers={doneAndFailedTransfers}
				/>
			)
		},
		[darkMode, dimensions, lang, doneAndFailedTransfers]
	)

	return (
		<View
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: getColor(darkMode, "backgroundPrimary")
			}}
		>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "back")}
				middleText={i18n(lang, "transfers")}
				rightComponent={
					<TouchableOpacity
						hitSlop={{
							top: 15,
							bottom: 15,
							right: 15,
							left: 15
						}}
						style={{
							alignItems: "center",
							justifyContent: "flex-end",
							flexDirection: "row",
							backgroundColor: "transparent",
							height: "100%",
							paddingLeft: 0,
							paddingRight: 15,
							width: "33%"
						}}
						//onPress={() => SheetManager.show("TopBarActionSheet")}
					>
						<></>
					</TouchableOpacity>
				}
			/>
			<View
				style={{
					marginTop: 10,
					height: "100%",
					width: "100%"
				}}
			>
				{groupedTransfers.uploads + groupedTransfers.downloads > 0 && (
					<TouchableOpacity
						style={{
							width: "100%",
							height: 50,
							flexDirection: "column",
							justifyContent: "center",
							paddingLeft: 20,
							paddingRight: 20,
							gap: 6.5
						}}
						onPress={() => eventListener.emit("openTransfersActionSheet")}
					>
						<View
							style={{
								width: "100%",
								flexDirection: "row",
								justifyContent: "space-between",
								alignItems: "center"
							}}
						>
							<Text
								style={{
									color: getColor(darkMode, "textPrimary"),
									fontSize: 14,
									maxWidth: "75%"
								}}
								numberOfLines={1}
							>
								{i18n(
									lang,
									"transferringFiles",
									true,
									["__NUM__"],
									[(groupedTransfers.downloads + groupedTransfers.uploads).toString()]
								)}
							</Text>
							<Text
								style={{
									color: getColor(darkMode, "textSecondary"),
									fontSize: 12
								}}
							>
								{transfersPaused
									? i18n(lang, "paused")
									: transfersProgress >= 100
									? i18n(lang, "finishing")
									: transfersProgress <= 0
									? i18n(lang, "queued")
									: transfersProgress.toFixed(2) + "%"}
							</Text>
						</View>
						<View
							style={{
								width: "100%",
								flexDirection: "row",
								alignItems: "center"
							}}
						>
							<Bar
								animated={false}
								indeterminate={transfersProgress >= 100 || transfersProgress <= 0 || transfersPaused}
								useNativeDriver={true}
								progress={normalizeProgress(transfersProgress)}
								color={getColor(darkMode, "linkPrimary")}
								width={dimensions.realWidth - 40}
								height={4}
								borderRadius={5}
								borderColor={getColor(darkMode, "backgroundPrimary")}
								unfilledColor={getColor(darkMode, "backgroundSecondary")}
							/>
						</View>
					</TouchableOpacity>
				)}
				<FlashList
					data={doneAndFailedTransfers}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					estimatedItemSize={50}
					extraData={{
						darkMode,
						dimensions,
						lang,
						doneAndFailedTransfers
					}}
					ListEmptyComponent={
						<View
							style={{
								flexDirection: "column",
								justifyContent: "center",
								alignItems: "center",
								width: "100%",
								marginTop: Math.floor(dimensions.height / 2) - 150
							}}
						>
							<Ionicon
								name="repeat-outline"
								size={70}
								color="gray"
							/>
							<Text
								style={{
									color: "gray",
									marginTop: 5
								}}
							>
								{i18n(lang, "noTransfers")}
							</Text>
						</View>
					}
				/>
			</View>
		</View>
	)
})
