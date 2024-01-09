import React, { memo, useCallback, useEffect, useState } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import useDimensions from "../../../lib/hooks/useDimensions"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { useStore } from "../../../lib/state"

const TransfersActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const dimensions = useDimensions()
	const lang = useLang()
	const transfersPaused = useStore(state => state.transfersPaused)
	const setTransfersPaused = useStore(state => state.setTransfersPaused)

	const pause = useCallback(async () => {
		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			const { currentUploads, currentDownloads, currentUploadsCount, currentDownloadsCount } =
				await global.nodeThread.getCurrentTransfers()

			if (currentUploadsCount + currentDownloadsCount <= 0) {
				return
			}

			for (const uuid in currentUploads) {
				await global.nodeThread.pauseTransfer({ uuid })
			}

			for (const uuid in currentDownloads) {
				await global.nodeThread.pauseTransfer({ uuid })
			}

			setTransfersPaused(true)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	const resume = useCallback(async () => {
		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			const { currentUploads, currentDownloads, currentUploadsCount, currentDownloadsCount } =
				await global.nodeThread.getCurrentTransfers()

			if (currentUploadsCount + currentDownloadsCount <= 0) {
				return
			}

			for (const uuid in currentUploads) {
				await global.nodeThread.resumeTransfer({ uuid })
			}

			for (const uuid in currentDownloads) {
				await global.nodeThread.resumeTransfer({ uuid })
			}

			setTransfersPaused(false)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	const stop = useCallback(async () => {
		await hideAllActionSheets()

		showFullScreenLoadingModal()

		try {
			const { currentUploads, currentDownloads, currentUploadsCount, currentDownloadsCount } =
				await global.nodeThread.getCurrentTransfers()

			if (currentUploadsCount + currentDownloadsCount <= 0) {
				return
			}

			for (const uuid in currentUploads) {
				await global.nodeThread.stopTransfer({ uuid })
			}

			for (const uuid in currentDownloads) {
				await global.nodeThread.stopTransfer({ uuid })
			}

			setTransfersPaused(false)
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [])

	useEffect(() => {
		const openTransfersActionSheetListener = eventListener.on("openTransfersActionSheet", () => {
			SheetManager.show("TransfersActionSheet")
		})

		return () => {
			openTransfersActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="TransfersActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
		>
			<View
				style={{
					paddingBottom: dimensions.insets.bottom + dimensions.navigationBarHeight
				}}
			>
				{transfersPaused ? (
					<ActionButton
						onPress={resume}
						icon="play-circle-outline"
						text={i18n(lang, "resume")}
					/>
				) : (
					<ActionButton
						onPress={pause}
						icon="pause-circle-outline"
						text={i18n(lang, "pause")}
					/>
				)}
				<ActionButton
					onPress={stop}
					icon="close-circle-outline"
					text={i18n(lang, "stop")}
				/>
			</View>
		</ActionSheet>
	)
})

export default TransfersActionSheet
