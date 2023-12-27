import React, { memo, useCallback } from "react"
import { View, Platform } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import { useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionSheetIndicator, ActionButton } from "../ActionSheets"
import Ionicon from "@expo/vector-icons/Ionicons"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import useLang from "../../../lib/hooks/useLang"

const LockAppAfterActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [userId] = useMMKVNumber("userId", storage)
	const [lockAppAfter, setLockAppAfter] = useMMKVNumber("lockAppAfter:" + userId, storage)

	const setLock = useCallback(
		async (seconds: number) => {
			setLockAppAfter(seconds)

			storage.set("lastBiometricScreen:" + userId, Math.floor(Date.now()) + seconds * 1000)

			await SheetManager.hide("LockAppAfterActionSheet")
		},
		[userId]
	)

	return (
		// @ts-ignore
		<ActionSheet
			id="LockAppAfterActionSheet"
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
					paddingBottom: insets.bottom + (Platform.OS === "android" ? 25 : 5),
					paddingTop: 10
				}}
			>
				<ActionButton
					onPress={() => setLock(1)}
					text={i18n(lang, "immediately")}
					rightComponent={
						lockAppAfter == 1 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(60)}
					text={i18n(lang, "oneMinute")}
					rightComponent={
						lockAppAfter == 60 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(180)}
					text={i18n(lang, "threeMinutes")}
					rightComponent={
						lockAppAfter == 180 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(300)}
					text={i18n(lang, "fiveMinutes")}
					rightComponent={
						lockAppAfter == 300 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(600)}
					text={i18n(lang, "tenMinutes")}
					rightComponent={
						lockAppAfter == 600 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(900)}
					text={i18n(lang, "fifteenMinutes")}
					rightComponent={
						lockAppAfter == 900 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(1800)}
					text={i18n(lang, "thirtyMinutes")}
					rightComponent={
						lockAppAfter == 1800 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
				<ActionButton
					onPress={() => setLock(3600)}
					text={i18n(lang, "oneHour")}
					rightComponent={
						lockAppAfter == 3600 ? (
							<Ionicon
								name="radio-button-on-outline"
								size={15}
								color={getColor(darkMode, "textPrimary")}
							/>
						) : undefined
					}
				/>
			</View>
		</ActionSheet>
	)
})

export default LockAppAfterActionSheet
