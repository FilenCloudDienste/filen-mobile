import React, { useState, useEffect, memo, useCallback, useMemo } from "react"
import { ActivityIndicator, TouchableOpacity, View } from "react-native"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { StackActions } from "@react-navigation/native"
import { useStore } from "../../lib/state"
import { navigationAnimation } from "../../lib/state"
import { normalizeProgress } from "../../lib/helpers"
import { getColor } from "../../style"
import { Circle } from "react-native-progress"
import { TransfersIndicatorProps, IndicatorProps } from "../../types"
import eventListener from "../../lib/eventListener"
import { TransferItem } from "../../screens/TransfersScreen"

export const Indicator = memo(({ darkMode, visible, navigation, progress, currentRouteName }: IndicatorProps) => {
	const openTransfers = useCallback(async () => {
		if (currentRouteName === "TransfersScreen") {
			return
		}

		await navigationAnimation({ enable: true })

		navigation?.current?.dispatch(StackActions.push("TransfersScreen"))
	}, [])

	const normalizedProgress = useMemo(() => {
		return normalizeProgress(progress)
	}, [progress])

	if (!visible || progress <= 0) {
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
					color={getColor(darkMode, "linkPrimary")}
					progress={normalizedProgress}
					thickness={4}
					animated={false}
					indeterminate={false}
					allowFontScaling={false}
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

export const TransfersIndicator = memo(({ navigation }: TransfersIndicatorProps) => {
	const darkMode = useDarkMode()
	const [progress, setProgress] = useState<number>(0)
	const currentRoutes = useStore(state => state.currentRoutes)
	const [currentRouteName, setCurrentRouteName] = useState<string>("")
	const biometricAuthScreenVisible = useStore(state => state.biometricAuthScreenVisible)
	const [currentUploadsCount, setCurrentUploadsCount] = useState<number>(0)
	const [currentDownloadsCount, setCurrentDownloadsCount] = useState<number>(0)
	const setTransfers = useStore(state => state.setTransfers)
	const setTransfersProgress = useStore(state => state.setTransfersProgress)

	const visible = useMemo(() => {
		return (
			currentDownloadsCount + currentUploadsCount > 0 &&
			currentRouteName !== "TransfersScreen" &&
			!biometricAuthScreenVisible &&
			currentRouteName !== "BiometricAuthScreen"
		)
	}, [currentDownloadsCount, currentUploadsCount, currentRouteName, biometricAuthScreenVisible])

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
		const transfersUpdateListener = eventListener.on(
			"transfersUpdate",
			({
				currentDownloadsCount: downloadsCount,
				currentUploadsCount: uploadsCount,
				progress: prog,
				transfers: t
			}: {
				currentDownloadsCount: number
				currentUploadsCount: number
				progress: number
				transfers: TransferItem[]
			}) => {
				setCurrentDownloadsCount(downloadsCount)
				setCurrentUploadsCount(uploadsCount)
				setProgress(prog)
				setTransfers(t)
				setTransfersProgress(prog)
			}
		)

		return () => {
			transfersUpdateListener.remove()
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
