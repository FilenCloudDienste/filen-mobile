import React, { useEffect, useState, memo, useRef, useCallback } from "react"
import { View, Text, DeviceEventEmitter, Platform, ActivityIndicator, Switch, TextInput, TouchableOpacity, Share } from "react-native"
import ActionSheet, { SheetManager } from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets, EdgeInsets } from "react-native-safe-area-context"
import Ionicon from "@expo/vector-icons/Ionicons"
import { showToast } from "../../Toasts"
import { i18n } from "../../../i18n"
import { itemPublicLinkInfo, disableItemPublicLink, enableItemPublicLink, editItemPublicLink } from "../../../lib/api"
import * as Clipboard from "expo-clipboard"
import RNPickerSelect from "react-native-picker-select"
import { getColor } from "../../../style/colors"
import { decryptFolderLinkKey, getMasterKeys, getRouteURL } from "../../../lib/helpers"
import { ActionSheetIndicator, ItemActionSheetItemHeader } from "../ActionSheets"
import { Item } from "../../../types"
import useDarkMode from "../../../lib/hooks/useDarkMode"

const PublicLinkActionSheet = memo(() => {
    const darkMode = useDarkMode()
	const insets: EdgeInsets = useSafeAreaInsets()
	const lang = useLang()
    const [currentItem, setCurrentItem] = useState<Item | undefined>(undefined)
    const currentItemRef = useRef<Item | undefined>(undefined)
    const [fetchingInfo, setFetchingInfo] = useState<boolean>(false)
    const [info, setInfo] = useState<any>(undefined)
    const [passwordDummy, setPasswordDummy] = useState<string>("")
    const [linkEnabed, setLinkEnabled] = useState<boolean>(false)
    const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
    const [downloadBtnEnabled, setDownloadBtnEnabled] = useState<boolean>(false)
    const [linkURL, setLinkURL] = useState<string>("")

    const fetchInfo = useCallback((item: Item, waitUntilEnabled: boolean = false, waitUntilDisabled: boolean = false): void => {
        setInfo(undefined)
        setFetchingInfo(true)
        setPasswordDummy("")
        setLinkEnabled(false)
        setDownloadBtnEnabled(false)

        const req = () => {
            itemPublicLinkInfo({ item }).then(async (info) => {
                if(waitUntilEnabled){
                    if(item.type == "folder"){
                        if(typeof info.exists == "boolean" && !info.exists){
                            return setTimeout(req, 250)
                        }
                    }
                    else{
                        if(typeof info.enabled == "boolean" && !info.enabled){
                            return setTimeout(req, 250)
                        }
                    }
                }

                if(waitUntilDisabled){
                    if(item.type == "folder"){
                        if(typeof info.exists == "boolean" && info.exists){
                            return setTimeout(req, 250)
                        }
                    }
                    else{
                        if(typeof info.enabled == "boolean" && info.enabled){
                            return setTimeout(req, 250)
                        }
                    }
                }

                if(item.type == "folder" && typeof info.exists == "boolean" && info.exists){
                    const masterKeys: string[] = getMasterKeys()
                    const keyDecrypted: string = await decryptFolderLinkKey(masterKeys, info.key)
    
                    if(keyDecrypted.length == 0){
                        SheetManager.hide("PublicLinkActionSheet")
    
                        return
                    }
    
                    setLinkEnabled(typeof info.exists == "boolean" && info.exists && typeof keyDecrypted == "string" && keyDecrypted.length >= 32)
                    setDownloadBtnEnabled(false)
                    setLinkURL(typeof keyDecrypted == "string" && keyDecrypted.length >= 32 ? "https://drive.filen.io/f/" + info.uuid +  "#" + keyDecrypted : "")
                }
                else{
                    setLinkEnabled(typeof info.enabled == "boolean" && info.enabled)
                    setDownloadBtnEnabled(typeof info.downloadBtn == "string" ? (info.downloadBtn == "enable") : (info.downloadBtn == 1))
                    setLinkURL("https://drive.filen.io/d/" + info.uuid +  "#" + item.key)
                }
    
                setInfo(info)
                setFetchingInfo(false)
            }).catch((err) => {
                setFetchingInfo(false)
    
                console.error(err)
            })
        }

        req()
    }, [])

    const enable = useCallback(async () => {
        if(typeof currentItem == "undefined"){
            return
        }

        setFetchingInfo(true)
        setProgress({ current: 0, total: 0 })

        try{
            await enableItemPublicLink(currentItem, (current, total) => setProgress({ current, total }))

            fetchInfo(currentItem, true)
        }
        catch(e: any){
            console.error(e)

            fetchInfo(currentItem)
        }

        setProgress({ current: 0, total: 0 })
    }, [currentItem])

    const disable = useCallback(async () => {
        if(typeof currentItem == "undefined" || typeof info == "undefined"){
            return
        }

        setFetchingInfo(true)

        try{
            await disableItemPublicLink(currentItem, info.uuid)

			if(getRouteURL().indexOf("links") !== -1){
				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: currentItem
				})

				SheetManager.hide("PublicLinkActionSheet")
			}
        }
        catch(e: any){
            console.error(e)
        }

        fetchInfo(currentItem)
    }, [currentItem, info])

    const save = useCallback(async (expirationText: string, password: string, downloadBtn: "enable" | "disable") => {
        if(typeof currentItem == "undefined" || typeof info == "undefined"){
            return
        }

        setFetchingInfo(true)

        try{
            await editItemPublicLink(currentItem, info.uuid, expirationText, password, downloadBtn)
        }
        catch(e: any){
            console.error(e)
        }

        fetchInfo(currentItem)
    }, [currentItem, info])

    useEffect(() => {
        const showItemActionSheetListener = (item: Item) => {
			setCurrentItem(item)

            currentItemRef.current = item

            SheetManager.show("PublicLinkActionSheet")

            fetchInfo(item)
		}
		
		DeviceEventEmitter.addListener("showPublicLinkActionSheet", showItemActionSheetListener)

		return () => {
			DeviceEventEmitter.removeListener("showPublicLinkActionSheet", showItemActionSheetListener)
		}
    }, [])

    return (
		// @ts-ignore
        <ActionSheet
			id="PublicLinkActionSheet"
			gestureEnabled={!fetchingInfo}
			closeOnPressBack={!fetchingInfo}
			closeOnTouchBackdrop={!fetchingInfo}
			closable={!fetchingInfo}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15,
                minHeight: 300
			}}
			indicatorStyle={{
				display: "none"
			}}
		>
          	<View
				style={{
					paddingBottom: insets.bottom + (Platform.OS == "android" ? 25 : 0)
				}}
			>
				<ActionSheetIndicator />
				<ItemActionSheetItemHeader />
				{
					fetchingInfo ? (
						<View
							style={{
								width: "100%",
								justifyContent: "center",
								alignItems: "center"
							}}
						>
                            <ActivityIndicator
								size="small"
								color={getColor(darkMode, "textPrimary")}
							/>
                            {
								progress.total > 0 && (
									<Text
										style={{
											color: getColor(darkMode, "textPrimary"),
											marginTop: 15,
											fontSize: 15,
											fontWeight: "400"
										}}
									>
										{i18n(lang, "folderPublicLinkProgress", true, ["__DONE__", "__TOTAL__"], [progress.current, progress.total])}
									</Text>
								)
							}
                        </View>
					) : (
						<>
							<View
								style={{
									width: "100%",
									height: 45,
									flexDirection: "row",
									justifyContent: "space-between",
									borderBottomColor: getColor(darkMode, "actionSheetBorder"),
									borderBottomWidth: 1,
									paddingLeft: 15,
									paddingRight: 15
								}}
							>
								<Text
									style={{
										color: getColor(darkMode, "textPrimary"),
										paddingTop: 12,
										fontSize: 15,
										fontWeight: "400"
									}}
								>
									{i18n(lang, "publicLinkEnabled")}
								</Text>
								<View
									style={{
										paddingTop: Platform.OS == "ios" ? 6 : 8
									}}
								>
									<Switch
										trackColor={getColor(darkMode, "switchTrackColor")}
										thumbColor={linkEnabed ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
										ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
										onValueChange={() => {
											if(linkEnabed){
                                                disable()
                                            }
                                            else{
                                                enable()
                                            }
										}}
										value={linkEnabed}
									/>
								</View>
							</View>
							{
								typeof currentItem !== "undefined" && typeof info !== "undefined" && linkEnabed && (
									<>
										<View
											style={{
												width: "100%",
												height: 45,
												flexDirection: "row",
												justifyContent: "space-between",
												borderBottomColor: getColor(darkMode, "actionSheetBorder"),
												borderBottomWidth: 1,
												paddingLeft: 15,
												paddingRight: 15
											}}
										>
											<TouchableOpacity
												style={{
													width: "65%"
												}}
												onPress={() => {
													Clipboard.setString(linkURL)
												
													showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
												}}
											>
												<Text
													style={{
														color: getColor(darkMode, "textSecondary"),
														paddingTop: 12,
														fontSize: 15,
														fontWeight: "400"
													}}
													numberOfLines={1}
												>
													{linkURL}
												</Text>
											</TouchableOpacity>
											<View
												style={{
													flexDirection: "row"
												}}
											>
												<TouchableOpacity
													onPress={() => {
														Share.share({
															url: linkURL
														})
													}}
												>
													<Text
														style={{
															paddingTop: 13,
															color: "#0A84FF",
															fontSize: 15,
															fontWeight: "400"
														}}
													>
														{i18n(lang, "share")}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													onPress={() => {
														Clipboard.setString(linkURL)
													
														showToast({ message: i18n(lang, "copiedToClipboard"), placement: "top" })
													}}
												>
													<Text
														style={{
															paddingTop: 13,
															color: "#0A84FF",
															fontSize: 15,
															fontWeight: "400",
															marginLeft: 15
														}}
													>
														{i18n(lang, "copy")}
													</Text>
												</TouchableOpacity>
											</View>
										</View>
										<View
											style={{
												width: "100%",
												height: 45,
												flexDirection: "row",
												justifyContent: "space-between",
												borderBottomColor: getColor(darkMode, "actionSheetBorder"),
												borderBottomWidth: 1,
												paddingLeft: 15,
												paddingRight: 15
											}}
										>
											<TextInput
												secureTextEntry={true}
												value={passwordDummy}
												onChangeText={setPasswordDummy}
                                                placeholder={typeof info.password == "string" && info.password.length > 32 ? new Array(16).join("*") : i18n(lang, "publicLinkPassword")}
												placeholderTextColor="gray"
												style={{
													width: "60%",
													paddingLeft: 0,
													paddingRight: 0,
													color: getColor(darkMode, "textPrimary"),
													fontSize: 15,
													fontWeight: "400"
												}}
											/>
											<View
												style={{
													flexDirection: "row"
												}}
											>
                                                {
													typeof info.password == "string" && info.password.length > 32 && (
														<TouchableOpacity
															onPress={() => save(info.expirationText, "", info.downloadBtn)}
														>
															<Text
																style={{
																	paddingTop: 12,
																	color: "#0A84FF",
																	fontSize: 15,
																	fontWeight: "400",
																	marginLeft: 15
																}}
															>
																{i18n(lang, "remove")}
															</Text>
														</TouchableOpacity>
													)
												}
												{
													passwordDummy.length > 0 && (
														<TouchableOpacity
															onPress={() => save(info.expirationText, passwordDummy, info.downloadBtn)}
														>
															<Text
																style={{
																	paddingTop: 12,
																	color: "#0A84FF",
																	fontSize: 15,
																	fontWeight: "400",
																	marginLeft: 15
																}}
															>
																{i18n(lang, "save")}
															</Text>
														</TouchableOpacity>
													)
												}
											</View>
										</View>
										{
											typeof currentItem !== "undefined" && currentItem.type == "file" && (
												<View
													style={{
														width: "100%",
														height: 45,
														flexDirection: "row",
														justifyContent: "space-between",
														borderBottomColor: getColor(darkMode, "actionSheetBorder"),
														borderBottomWidth: 1,
														paddingLeft: 15,
														paddingRight: 15
													}}
												>
													<Text
														style={{
															color: getColor(darkMode, "textPrimary"),
															paddingTop: 12,
															fontSize: 15,
															fontWeight: "400"
														}}
													>
														{i18n(lang, "publicLinkDownloadBtnEnabled")}
													</Text>
													<View
														style={{
															paddingTop: Platform.OS == "ios" ? 7 : 8
														}}
													>
														<Switch
															trackColor={getColor(darkMode, "switchTrackColor")}
															thumbColor={downloadBtnEnabled ? getColor(darkMode, "switchThumbColorEnabled") : getColor(darkMode, "switchThumbColorDisabled")}
															ios_backgroundColor={getColor(darkMode, "switchIOSBackgroundColor")}
															onValueChange={(value) => save(info.expirationText, passwordDummy, value ? "enable" : "disable")}
															value={downloadBtnEnabled}
														/>
													</View>
												</View>
											)
										}
										<RNPickerSelect
											onValueChange={(value) => {
												setInfo((prev: any) => ({
                                                    ...prev,
                                                    expirationText: value
                                                }))

                                                if(Platform.OS == "android"){
                                                    save(value, passwordDummy, info.downloadBtn)
                                                }
											}}
											onDonePress={() => save(info.expirationText, passwordDummy, info.downloadBtn)}
											value={info.expirationText}
											placeholder={{}}
											items={[
												{
													label: i18n(lang, "publicLinkExpiresNever"),
													value: "never"
												},
												{
													label: i18n(lang, "publicLinkExpiresHour", true, ["__NUM__"], [1]),
													value: "1h"
												},
												{
													label: i18n(lang, "publicLinkExpiresHours", true, ["__NUM__"], [6]),
													value: "6h"
												},
												{
													label: i18n(lang, "publicLinkExpiresDay", true, ["__NUM__"], [1]),
													value: "1d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [3]),
													value: "3d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [7]),
													value: "7d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [14]),
													value: "14d"
												},
												{
													label: i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [30]),
													value: "30d"
												}
											]}
										>
											<TouchableOpacity
												style={{
													width: "100%",
													flexDirection: "row",
													justifyContent: "space-between",
													marginTop: 15,
													height: 45
												}}
											>
												<Text
													style={{
														marginLeft: 15,
														color: getColor(darkMode, "textPrimary"),
														fontSize: 15,
														fontWeight: "400"
													}}
												>
													{
														info.expirationText == "never" && i18n(lang, "publicLinkExpiresNever")
													}
													{
														info.expirationText == "1h" && i18n(lang, "publicLinkExpiresHour", true, ["__NUM__"], [1])
													}
													{
														info.expirationText == "6h" && i18n(lang, "publicLinkExpiresHours", true, ["__NUM__"], [6])
													}
													{
														info.expirationText == "1d" && i18n(lang, "publicLinkExpiresDay", true, ["__NUM__"], [1])
													}
													{
														info.expirationText == "3d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [3])
													}
													{
														info.expirationText == "7d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [7])
													}
													{
														info.expirationText == "14d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [14])
													}
													{
														info.expirationText == "30d" && i18n(lang, "publicLinkExpiresDays", true, ["__NUM__"], [30])
													}
												</Text>
												<Ionicon
													name="chevron-forward-outline"
													size={18}
													color={getColor(darkMode, "textPrimary")}
													style={{
														marginRight: 15
													}}
												/>
											</TouchableOpacity>
										</RNPickerSelect>
									</>
								)
							}
						</>
					)
				}
          	</View>
        </ActionSheet>
    )
})

export default PublicLinkActionSheet