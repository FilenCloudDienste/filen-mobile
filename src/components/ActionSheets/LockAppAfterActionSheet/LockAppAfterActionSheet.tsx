import React, { memo } from "react"
import { View } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import storage from "../../../lib/storage"
import { useMMKVNumber } from "react-native-mmkv"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionSheetIndicator, ActionButton } from "../ActionSheets"
import Ionicon from "@expo/vector-icons/Ionicons"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import useLang from "../../../lib/hooks/useLang"

const LockAppAfterActionSheet = memo(() => {
    const darkMode = useDarkMode()
	const insets: EdgeInsets = useSafeAreaInsets()
	const lang = useLang()
	const [userId, setUserId] = useMMKVNumber("userId", storage)
	const [lockAppAfter, setLockAppAfter] = useMMKVNumber("lockAppAfter:" + userId, storage)

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
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: (insets.bottom + 25),
					paddingTop: 50
				}}
			>
				<ActionSheetIndicator />
				<ActionButton
					onPress={() => {
						setLockAppAfter(1)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (1 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(60)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (60 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(180)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (180 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(300)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (300 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(600)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (600 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(900)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (900 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(1800)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (1800 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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
					onPress={() => {
						setLockAppAfter(3600)

						storage.set("biometricPinAuthTimeout:" + userId, (Math.floor(+new Date()) + (3600 * 1000)))

						SheetManager.hide("LockAppAfterActionSheet")
					}}
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