import React, { memo } from "react"
import { View, Text, TouchableOpacity, Platform, DeviceEventEmitter, ActivityIndicator } from "react-native"
import Ionicon from "@expo/vector-icons/Ionicons"
import { navigationAnimation } from "../../lib/state"
import { StackActions } from "@react-navigation/native"
import storage from "../../lib/storage"
import { useMMKVBoolean, useMMKVNumber, useMMKVString } from "react-native-mmkv"
import useNetworkInfo from "../../lib/services/isOnline/useNetworkInfo"
import { i18n } from "../../i18n"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../style"
import { NavigationContainerRef } from "@react-navigation/native"
import { Item } from "../../types"

const ItemListPhotos = memo(
	({
		navigation,
		scrollDate,
		items,
		normalizedPhotoRange,
		calcedPhotosGridSize,
		setScrollIndex
	}: {
		navigation: NavigationContainerRef<ReactNavigation.RootParamList>
		scrollDate: string
		items: Item[]
		normalizedPhotoRange: string
		calcedPhotosGridSize: number
		setScrollIndex: React.Dispatch<React.SetStateAction<number>>
	}) => {
		const networkInfo = useNetworkInfo()
		const lang = useLang()
		const darkMode = useDarkMode()
		const [userId] = useMMKVNumber("userId", storage)
		const [cameraUploadTotal] = useMMKVNumber("cameraUploadTotal", storage)
		const [cameraUploadUploaded] = useMMKVNumber("cameraUploadUploaded", storage)
		const [onlyWifiUploads] = useMMKVBoolean("onlyWifiUploads", storage)
		const [cameraUploadEnabled] = useMMKVBoolean("cameraUploadEnabled:" + userId, storage)
		const [photosGridSize, setPhotosGridSize] = useMMKVNumber("photosGridSize", storage)
		const [photosRange, setPhotosRange] = useMMKVString("photosRange:" + userId, storage)

		return (
			<>
				<View
					style={{
						paddingBottom: 10,
						paddingTop: 5,
						marginBottom: 3,
						height: 35
					}}
				>
					{cameraUploadEnabled ? (
						<View
							style={{
								flexDirection: "row",
								justifyContent: "flex-start",
								paddingLeft: 15,
								paddingRight: 15,
								alignItems: "center"
							}}
						>
							{networkInfo.online ? (
								onlyWifiUploads && networkInfo.wifi ? (
									<>
										<Ionicon
											name="wifi-outline"
											size={20}
											color={"gray"}
										/>
										<Text
											style={{
												marginLeft: 10,
												color: "gray",
												fontSize: 14,
												paddingTop: Platform.OS == "ios" ? 2 : 0
											}}
										>
											{i18n(lang, "onlyWifiUploads")}
										</Text>
									</>
								) : cameraUploadTotal > 0 ? (
									cameraUploadTotal > cameraUploadUploaded ? (
										<>
											<ActivityIndicator
												color={getColor(darkMode, "textPrimary")}
												size="small"
											/>
											<Text
												style={{
													marginLeft: 10,
													color: "gray",
													fontSize: 14,
													paddingTop: Platform.OS == "ios" ? 2 : 0
												}}
											>
												{i18n(
													lang,
													"cameraUploadProgress",
													true,
													["__TOTAL__", "__UPLOADED__"],
													[cameraUploadTotal, cameraUploadUploaded]
												)}
											</Text>
										</>
									) : (
										<>
											<Ionicon
												name="checkmark-done-circle-outline"
												size={20}
												color="green"
											/>
											<Text
												style={{
													marginLeft: 10,
													color: "gray",
													fontSize: 14,
													paddingTop: Platform.OS == "ios" ? 2 : 0
												}}
											>
												{i18n(lang, "cameraUploadEverythingUploaded")}
											</Text>
										</>
									)
								) : cameraUploadTotal == 0 ? (
									<>
										<Ionicon
											name="checkmark-done-circle-outline"
											size={20}
											color="green"
										/>
										<Text
											style={{
												marginLeft: 10,
												color: "gray",
												fontSize: 14,
												paddingTop: Platform.OS == "ios" ? 2 : 0
											}}
										>
											{i18n(lang, "cameraUploadEverythingUploaded")}
										</Text>
									</>
								) : (
									<>
										<ActivityIndicator
											color={getColor(darkMode, "textPrimary")}
											size="small"
										/>
										<Text
											style={{
												marginLeft: 10,
												color: "gray",
												fontSize: 14,
												paddingTop: Platform.OS == "ios" ? 2 : 0
											}}
										>
											{i18n(lang, "cameraUploadFetchingAssetsFromLocal")}
										</Text>
									</>
								)
							) : (
								<>
									<Ionicon
										name="wifi-outline"
										size={20}
										color={"gray"}
									/>
									<Text
										style={{
											marginLeft: 10,
											color: "gray",
											fontSize: 14,
											paddingTop: Platform.OS == "ios" ? 2 : 0
										}}
									>
										{i18n(lang, "deviceOffline")}
									</Text>
								</>
							)}
						</View>
					) : (
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								paddingLeft: 5,
								paddingRight: 15
							}}
						>
							<Text
								style={{
									marginLeft: 10,
									color: "gray"
								}}
							>
								{i18n(lang, "cameraUploadNotEnabled")}
							</Text>
							{networkInfo.online && (
								<TouchableOpacity
									onPress={async () => {
										await navigationAnimation({ enable: true })

										navigation.dispatch(StackActions.push("CameraUploadScreen"))
									}}
								>
									<Text
										style={{
											color: "#0A84FF",
											fontWeight: "bold"
										}}
									>
										{i18n(lang, "enable")}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>
				{scrollDate.length > 0 && items.length > 0 && normalizedPhotoRange == "all" && (
					<View
						style={{
							backgroundColor: darkMode ? "rgba(34, 34, 34, 0.6)" : "rgba(90, 90, 90, 0.65)",
							width: "auto",
							height: "auto",
							borderRadius: 15,
							position: "absolute",
							marginTop: 50,
							marginLeft: 15,
							zIndex: 100,
							paddingTop: 5,
							paddingBottom: 5,
							paddingLeft: 8,
							paddingRight: 8
						}}
						pointerEvents="box-none"
					>
						<Text
							style={{
								color: "white",
								fontSize: 15
							}}
						>
							{scrollDate}
						</Text>
					</View>
				)}
				{items.length > 0 && (
					<>
						{normalizedPhotoRange == "all" && (
							<View
								style={{
									backgroundColor: darkMode ? "rgba(34, 34, 34, 0.6)" : "rgba(90, 90, 90, 0.65)",
									width: "auto",
									height: "auto",
									borderRadius: 15,
									position: "absolute",
									marginTop: 50,
									zIndex: 100,
									paddingTop: 5,
									paddingBottom: 5,
									paddingLeft: 8,
									paddingRight: 8,
									right: 15,
									flexDirection: "row"
								}}
							>
								<TouchableOpacity
									onPress={() => {
										let gridSize = calcedPhotosGridSize

										if (calcedPhotosGridSize >= 10) {
											gridSize = 10
										} else {
											gridSize = gridSize + 1
										}

										setPhotosGridSize(gridSize)
									}}
								>
									<Ionicon
										name="remove-outline"
										size={24}
										color={photosGridSize >= 10 ? "gray" : "white"}
									/>
								</TouchableOpacity>
								<Text
									style={{
										color: "gray",
										fontSize: 17,
										marginLeft: 5
									}}
								>
									|
								</Text>
								<TouchableOpacity
									style={{
										marginLeft: 6
									}}
									onPress={() => {
										let gridSize = calcedPhotosGridSize

										if (photosGridSize <= 1) {
											gridSize = 1
										} else {
											gridSize = gridSize - 1
										}

										setPhotosGridSize(gridSize)
									}}
								>
									<Ionicon
										name="add-outline"
										size={24}
										color={photosGridSize <= 1 ? "gray" : "white"}
									/>
								</TouchableOpacity>
							</View>
						)}
						<View
							style={{
								backgroundColor: darkMode ? "rgba(34, 34, 34, 0.7)" : "rgba(90, 90, 90, 0.65)",
								width: "auto",
								height: "auto",
								borderRadius: 15,
								position: "absolute",
								zIndex: 100,
								alignSelf: "center",
								flexDirection: "row",
								bottom: Platform.OS == "ios" ? 10 : 20,
								paddingTop: 3,
								paddingBottom: 3,
								paddingLeft: 3,
								paddingRight: 3
							}}
						>
							{["years", "months", "days", "all"].map((key, index) => {
								return (
									<TouchableOpacity
										key={index.toString()}
										style={{
											backgroundColor: normalizedPhotoRange == key ? (darkMode ? "gray" : "gray") : "transparent",
											width: "auto",
											height: "auto",
											paddingTop: 5,
											paddingBottom: 5,
											paddingLeft: 10,
											paddingRight: 10,
											borderRadius: 15,
											marginLeft: index == 0 ? 0 : 10
										}}
										onPress={() => {
											DeviceEventEmitter.emit("event", {
												type: "unselect-all-items"
											})

											setScrollIndex(0)
											setPhotosRange(key)
										}}
									>
										<Text
											style={{
												color: "white"
											}}
										>
											{i18n(lang, "photosRange_" + key)}
										</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</>
				)}
			</>
		)
	}
)

export default ItemListPhotos
