import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from "react"
import { ActivityIndicator, TouchableOpacity, View, DeviceEventEmitter } from "react-native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../../lib/state"
import { navigationAnimation } from "../../lib/state"
import { calcSpeed, calcTimeLeft, normalizeProgress } from "../../lib/helpers"
import { throttle } from "lodash"
import memoryCache from "../../lib/memoryCache"
import { getColor } from "../../style"
import { Circle } from "react-native-progress"
import { TransfersIndicatorProps, IndicatorProps, Download, ProgressData, Item } from "../../types"
import eventListener from "../../lib/eventListener"

export const Indicator = memo(({ darkMode, visible, navigation, progress, currentRouteName }: IndicatorProps) => {
	const openTransfers = useCallback(async () => {
		if (currentRouteName === "TransfersScreen") {
			return
		}

		await navigationAnimation({ enable: true })

		navigation?.current?.dispatch(StackActions.push("TransfersScreen"))
	}, [])

	const normalizedProgress: number = useMemo(() => {
		return normalizeProgress(progress)
	}, [progress])

	if (!visible) {
		return null
	}

	return (
		<TouchableOpacity
			style={{
				width: 50,
				height: 50,
				borderRadius: 50,
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				position: "absolute",
				bottom: 60,
				right: 10,
				zIndex: 999999
			}}
			onPress={openTransfers}
		>
			<View
				style={{
					justifyContent: "center",
					alignContent: "center"
				}}
			>
				<Circle
					size={50}
					borderWidth={0}
					color="#0A84FF"
					progress={normalizedProgress}
					thickness={4}
					animated={true}
					indeterminate={false}
				/>
				<ActivityIndicator
					size="small"
					color={getColor(darkMode, "textPrimary")}
					style={{
						position: "absolute",
						marginLeft: 15
					}}
				/>
			</View>
		</TouchableOpacity>
	)
})

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
}

export type CurrentUploads = Record<string, Transfer>

export type CurrentDownloads = Record<string, Transfer>

export type FinishedTransfer = Item & {
	transferType: string
}

export const TransfersIndicator = memo(({ navigation }: TransfersIndicatorProps) => {
	const darkMode = useDarkMode()
	const [visible, setVisible] = useState<boolean>(false)
	const [progress, setProgress] = useState<number>(0)
	const currentRoutes = useStore(state => state.currentRoutes)
	const [currentRouteName, setCurrentRouteName] = useState<string>("")
	const biometricAuthScreenVisible = useStore(state => state.biometricAuthScreenVisible)
	const [currentUploads, setCurrentUploads] = useState<CurrentUploads>({})
	const [currentDownloads, setCurrentDownloads] = useState<CurrentDownloads>({})
	const setCurrentUploadsGlobal = useStore(state => state.setCurrentUploads)
	const setCurrentDownloadsGlobal = useStore(state => state.setCurrentDownloads)
	const setFinishedTransfersGlobal = useStore(state => state.setFinishedTransfers)
	const [finishedTransfers, setFinishedTransfers] = useState<FinishedTransfer[]>([])
	const bytesSent = useRef<number>(0)
	const allBytes = useRef<number>(0)
	const progressStarted = useRef<number>(-1)

	const throttledUpdate = useCallback(
		throttle(
			(
				currentUploads: CurrentUploads,
				currentDownloads: CurrentDownloads,
				currentRouteName: string,
				biometricAuthScreenVisible: boolean
			) => {
				if (Object.keys(currentUploads).length + Object.keys(currentDownloads).length > 0) {
					setProgress((bytesSent.current / allBytes.current) * 100)
				} else {
					bytesSent.current = 0
					progressStarted.current = -1
					allBytes.current = 0

					setProgress(0)
				}

				if (
					Object.keys(currentUploads).length + Object.keys(currentDownloads).length > 0 &&
					currentRouteName !== "TransfersScreen" &&
					!biometricAuthScreenVisible &&
					currentRouteName !== "BiometricAuthScreen"
				) {
					setVisible(true)
				} else {
					setVisible(false)
				}
			},
			1000
		),
		[]
	)

	useEffect(() => {
		eventListener.emit("foregroundServiceUploadDownloadProgress", progress)
	}, [progress])

	useEffect(() => {
		throttledUpdate(currentUploads, currentDownloads, currentRouteName, biometricAuthScreenVisible)

		setCurrentUploadsGlobal(currentUploads)
		setCurrentDownloadsGlobal(currentDownloads)
		setFinishedTransfersGlobal(finishedTransfers)

		eventListener.emit(Object.keys(currentUploads).length > 0 ? "startForegroundService" : "stopForegroundService", "upload")
		eventListener.emit(Object.keys(currentDownloads).length > 0 ? "startForegroundService" : "stopForegroundService", "download")
	}, [currentUploads, currentDownloads, currentRouteName, biometricAuthScreenVisible, finishedTransfers])

	useEffect(() => {
		try {
			if (currentRoutes && currentRoutes[currentRoutes.length - 1] && currentRoutes[currentRoutes.length - 1].name) {
				setCurrentRouteName(currentRoutes[currentRoutes.length - 1].name)
			}
		} catch (e) {
			console.error(e)
		}
	}, [currentRoutes])

	useEffect(() => {
		const uploadListener = DeviceEventEmitter.addListener("upload", data => {
			const now = Date.now()

			if (data.type == "start") {
				setCurrentUploads(prev => ({
					...prev,
					[data.data.uuid]: {
						...data.data,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))

				if (progressStarted.current == -1) {
					progressStarted.current = now
				} else {
					if (now < progressStarted.current) {
						progressStarted.current = now
					}
				}

				allBytes.current += data.data.size
			} else if (data.type == "started") {
				setCurrentUploads(prev => ({
					...prev,
					[data.data.uuid]: {
						...prev[data.data.uuid],
						started: now,
						lastTime: now,
						timestamp: now
					}
				}))
			} else if (data.type == "done") {
				setCurrentUploads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
				setFinishedTransfers(prev => [
					...[
						{
							...data.data,
							transferType: "upload"
						}
					],
					...prev
				])
			} else if (data.type == "err") {
				setCurrentUploads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)

				if (allBytes.current >= data.data.size) {
					allBytes.current -= data.data.size
				}
			}
		})

		const downloadListener = DeviceEventEmitter.addListener("download", (data: Download) => {
			if (memoryCache.has("showDownloadProgress:" + data.data.uuid)) {
				if (!memoryCache.get("showDownloadProgress:" + data.data.uuid)) {
					return
				}
			}

			const now = Date.now()

			if (data.type == "start") {
				setCurrentDownloads(prev => ({
					...prev,
					[data.data.uuid]: {
						...data.data,
						started: now,
						bytes: 0,
						percent: 0,
						lastTime: now,
						lastBps: 0,
						timeLeft: 0,
						timestamp: now
					}
				}))

				if (progressStarted.current == -1) {
					progressStarted.current = now
				} else {
					if (now < progressStarted.current) {
						progressStarted.current = now
					}
				}

				allBytes.current += data.data.size
			} else if (data.type == "started") {
				setCurrentDownloads(prev => ({
					...prev,
					[data.data.uuid]: {
						...prev[data.data.uuid],
						started: now,
						lastTime: now,
						timestamp: now
					}
				}))
			} else if (data.type == "done") {
				setCurrentDownloads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)
				setFinishedTransfers(prev => [
					...[
						{
							...data.data,
							transferType: "download"
						}
					],
					...prev
				])
			} else if (data.type == "err") {
				setCurrentDownloads(prev =>
					Object.keys(prev)
						.filter(key => key !== data.data.uuid)
						.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
				)

				if (allBytes.current >= data.data.size) {
					allBytes.current -= data.data.size
				}
			}
		})

		const uploadProgressListener = DeviceEventEmitter.addListener("uploadProgress", (data: ProgressData) => {
			const now = Date.now()

			setCurrentUploads(prev =>
				Object.keys(prev).filter(key => key == data.data.uuid).length > 0
					? {
							...prev,
							[data.data.uuid]: {
								...prev[data.data.uuid],
								percent:
									((prev[data.data.uuid].bytes + data.data.bytes) / Math.floor((prev[data.data.uuid].size || 0) * 1)) *
									100,
								lastBps: calcSpeed(now, prev[data.data.uuid].started, prev[data.data.uuid].bytes + data.data.bytes),
								lastTime: now,
								bytes: prev[data.data.uuid].bytes + data.data.bytes,
								timeLeft: calcTimeLeft(
									prev[data.data.uuid].bytes + data.data.bytes,
									Math.floor((prev[data.data.uuid].size || 0) * 1),
									prev[data.data.uuid].started
								)
							}
					  }
					: prev
			)

			bytesSent.current += data.data.bytes
		})

		const downloadProgressListener = DeviceEventEmitter.addListener("downloadProgress", (data: ProgressData) => {
			if (memoryCache.has("showDownloadProgress:" + data.data.uuid)) {
				if (!memoryCache.get("showDownloadProgress:" + data.data.uuid)) {
					return
				}
			}

			const now = Date.now()

			setCurrentDownloads(prev =>
				Object.keys(prev).filter(key => key == data.data.uuid).length > 0
					? {
							...prev,
							[data.data.uuid]: {
								...prev[data.data.uuid],
								percent:
									((prev[data.data.uuid].bytes + data.data.bytes) / Math.floor((prev[data.data.uuid].size || 0) * 1)) *
									100,
								lastBps: calcSpeed(now, prev[data.data.uuid].started, prev[data.data.uuid].bytes + data.data.bytes),
								lastTime: now,
								bytes: prev[data.data.uuid].bytes + data.data.bytes,
								timeLeft: calcTimeLeft(
									prev[data.data.uuid].bytes + data.data.bytes,
									Math.floor((prev[data.data.uuid].size || 0) * 1),
									prev[data.data.uuid].started
								)
							}
					  }
					: prev
			)

			bytesSent.current += data.data.bytes
		})

		const stopTransferListener = DeviceEventEmitter.addListener("stopTransfer", uuid => {
			setCurrentUploads(prev =>
				Object.keys(prev)
					.filter(key => key !== uuid)
					.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
			)
			setCurrentDownloads(prev =>
				Object.keys(prev)
					.filter(key => key !== uuid)
					.reduce((current, key) => Object.assign(current, { [key]: prev[key] }), {})
			)

			let size = 0

			for (const prop in currentUploads) {
				if (currentUploads[prop].uuid == uuid) {
					size += currentUploads[prop].size
				}
			}

			for (const prop in currentDownloads) {
				if (currentDownloads[prop].uuid == uuid) {
					size += currentDownloads[prop].size
				}
			}

			if (allBytes.current >= size) {
				allBytes.current -= size
			}
		})

		return () => {
			uploadListener.remove()
			downloadListener.remove()
			uploadProgressListener.remove()
			downloadProgressListener.remove()
			stopTransferListener.remove()
		}
	}, [])

	return (
		<Indicator
			darkMode={darkMode}
			visible={visible}
			navigation={navigation}
			progress={progress}
			currentRouteName={currentRouteName}
		/>
	)
})
