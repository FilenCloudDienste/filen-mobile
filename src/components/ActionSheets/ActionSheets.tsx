import React, { memo, useEffect, useState } from "react"
import { View, Text, TouchableHighlight, TouchableOpacity, Image } from "react-native"
import { SheetManager } from "react-native-actions-sheet"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVNumber } from "react-native-mmkv"
import { getImageForItem } from "../../assets/thumbnails"
import Ionicon from "@expo/vector-icons/Ionicons"
import { useStore } from "../../lib/state"
import { getFolderColor, formatBytes, getParent } from "../../lib/helpers"
import { i18n } from "../../i18n"
import { getColor } from "../../style/colors"
import { THUMBNAIL_BASE_PATH } from "../../lib/constants"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import * as db from "../../lib/db"

export interface ActionButtonProps {
	onPress: () => void
	icon?: string | React.ReactNode
	text: string
	color?: string
	key?: string | number
	rightComponent?: React.ReactNode
	textColor?: string
}

export const ActionButton = memo(({ onPress, icon, text, color, rightComponent, textColor }: ActionButtonProps) => {
	const darkMode = useDarkMode()

	return (
		<TouchableHighlight
			underlayColor={getColor(darkMode, "underlayActionSheet")}
			style={{
				width: "100%",
				height: 45
			}}
			onPress={onPress}
		>
			<View
				style={{
					width: "100%",
					height: 45,
					flexDirection: "row",
					alignContent: "flex-start",
					paddingLeft: 20,
					paddingRight: 20
				}}
			>
				{typeof color !== "undefined" ? (
					<View
						style={{
							backgroundColor: color,
							height: 22,
							width: 22,
							borderRadius: 22,
							marginTop: 12
						}}
					/>
				) : (
					<View
						style={{
							paddingTop: 11
						}}
					>
						{typeof icon === "string" ? (
							<Ionicon
								name={icon as any}
								size={22}
								color={getColor(darkMode, "textSecondary")}
							/>
						) : (
							icon
						)}
					</View>
				)}
				{typeof rightComponent !== "undefined" ? (
					<View
						style={{
							paddingTop: 5,
							marginLeft: 15,
							borderBottomColor: darkMode ? getColor(darkMode, "actionSheetBorder") : getColor(darkMode, "primaryBorder"),
							borderBottomWidth: darkMode ? 1 : 0.5,
							width: "100%",
							justifyContent: "space-between",
							alignItems: "center",
							flexDirection: "row",
							paddingRight: 20
						}}
					>
						<Text
							style={{
								color: typeof textColor === "string" ? textColor : getColor(darkMode, "textPrimary"),
								fontSize: 15,
								fontWeight: "400"
							}}
						>
							{text}
						</Text>
						{rightComponent}
					</View>
				) : (
					<View
						style={{
							paddingTop: 14,
							marginLeft: 15,
							borderBottomColor: darkMode ? getColor(darkMode, "actionSheetBorder") : getColor(darkMode, "primaryBorder"),
							borderBottomWidth: darkMode ? 1 : 0.5,
							width: "100%"
						}}
					>
						<Text
							style={{
								color: typeof textColor === "string" ? textColor : getColor(darkMode, "textPrimary"),
								fontSize: 15,
								fontWeight: "400"
							}}
						>
							{text}
						</Text>
					</View>
				)}
			</View>
		</TouchableHighlight>
	)
})

export const ItemActionSheetItemHeader = memo(() => {
	const darkMode = useDarkMode()
	const currentActionSheetItem = useStore(state => state.currentActionSheetItem)
	const [userId] = useMMKVNumber("userId", storage)
	const lang = useLang()
	const [hideThumbnails] = useMMKVBoolean("hideThumbnails:" + userId, storage)
	const [hideFileNames] = useMMKVBoolean("hideFileNames:" + userId, storage)
	const [hideSizes] = useMMKVBoolean("hideSizes:" + userId, storage)
	const [folderSizeCache, setFolderSizeCache] = useState<number>(0)

	useEffect(() => {
		if (!currentActionSheetItem) {
			return
		}

		db.get("folderSizeCache:" + currentActionSheetItem.uuid)
			.then(cachedSize => {
				if (!cachedSize) {
					return
				}

				if (cachedSize <= 0) {
					return
				}

				setFolderSizeCache(cachedSize)
			})
			.catch(console.error)
	}, [])

	if (typeof currentActionSheetItem == "undefined") {
		return null
	}

	return (
		<View
			style={{
				flexDirection: "row",
				alignContent: "flex-start",
				alignItems: "center",
				borderBottomColor: getColor(darkMode, "actionSheetBorder"),
				borderBottomWidth: 0,
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopRightRadius: 15,
				borderTopLeftRadius: 15,
				zIndex: 1,
				height: 70,
				paddingLeft: 20,
				paddingRight: 20
			}}
		>
			{currentActionSheetItem.type == "folder" ? (
				<Ionicon
					name="ios-folder"
					size={40}
					color={getFolderColor(currentActionSheetItem.color)}
				/>
			) : (
				<Image
					source={
						hideThumbnails
							? getImageForItem(currentActionSheetItem)
							: typeof currentActionSheetItem.thumbnail !== "undefined"
							? { uri: "file://" + THUMBNAIL_BASE_PATH + currentActionSheetItem.uuid + ".jpg" }
							: getImageForItem(currentActionSheetItem)
					}
					style={{
						width: 40,
						height: 40,
						borderRadius: 5
					}}
				/>
			)}
			<View
				style={{
					width: "75%",
					paddingLeft: 10
				}}
			>
				<Text
					style={{
						color: getColor(darkMode, "textPrimary"),
						fontWeight: "400",
						fontSize: 16
					}}
					numberOfLines={1}
				>
					{hideFileNames ? i18n(lang, currentActionSheetItem.type == "folder" ? "folder" : "file") : currentActionSheetItem.name}
				</Text>
				<Text
					style={{
						color: "gray",
						fontSize: 12,
						marginTop: 4
					}}
					numberOfLines={1}
				>
					{typeof currentActionSheetItem.offline == "boolean" && currentActionSheetItem.offline && (
						<>
							<Ionicon
								name="arrow-down-circle"
								size={12}
								color="green"
							/>
							<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
						</>
					)}
					{typeof currentActionSheetItem.favorited == "boolean" && currentActionSheetItem.favorited && (
						<>
							<Ionicon
								name="heart"
								size={12}
								color="white"
							/>
							<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
						</>
					)}
					{hideSizes
						? formatBytes(0)
						: formatBytes(currentActionSheetItem.type == "file" ? currentActionSheetItem.size : folderSizeCache)}
					{typeof currentActionSheetItem.sharerEmail == "string" &&
						currentActionSheetItem.sharerEmail.length > 0 &&
						getParent().length < 32 && (
							<>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
								<Text>{currentActionSheetItem.sharerEmail}</Text>
							</>
						)}
					{typeof currentActionSheetItem.receivers !== "undefined" &&
						Array.isArray(currentActionSheetItem.receivers) &&
						currentActionSheetItem.receivers.length > 0 &&
						getParent().length < 32 && (
							<>
								<Text>&nbsp;&nbsp;&#8226;&nbsp;&nbsp;</Text>
								<Ionicon
									name="people-outline"
									size={12}
									color={getColor(darkMode, "textPrimary")}
								/>
								<Text>&nbsp;{currentActionSheetItem.receivers.length}</Text>
							</>
						)}
					&nbsp;&nbsp;&#8226;&nbsp;&nbsp;
					{currentActionSheetItem.date}
				</Text>
			</View>
		</View>
	)
})

export const hideAllActionSheets = async () => {
	await Promise.all([
		SheetManager.hide("BottomBarAddActionSheet"),
		SheetManager.hide("FileVersionsActionSheet"),
		SheetManager.hide("FolderColorActionSheet"),
		SheetManager.hide("ItemActionSheet"),
		SheetManager.hide("LockAppAfterActionSheet"),
		SheetManager.hide("ProfilePictureActionSheet"),
		SheetManager.hide("PublicLinkActionSheet"),
		SheetManager.hide("ShareActionSheet"),
		SheetManager.hide("SortByActionSheet"),
		SheetManager.hide("TopBarActionSheet"),
		SheetManager.hide("CreateNoteActionSheet"),
		SheetManager.hide("NoteActionSheet")
	])
}

export const ActionSheetIndicator = memo(() => {
	const darkMode = useDarkMode()

	return (
		<>
			<TouchableOpacity
				style={{
					height: 30,
					width: 30,
					borderRadius: 100,
					backgroundColor: darkMode ? "#2C2C2E" : "lightgray",
					marginVertical: 5,
					alignSelf: "center",
					position: "absolute",
					zIndex: 2,
					right: 12,
					top: 5,
					alignItems: "center",
					justifyContent: "center"
				}}
				onPress={() => hideAllActionSheets()}
			>
				<Ionicon
					name="close"
					size={20}
					color="gray"
				/>
			</TouchableOpacity>
		</>
	)
})
