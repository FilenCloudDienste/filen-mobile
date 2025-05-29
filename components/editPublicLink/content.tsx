import { memo, useCallback, useState, useEffect, Fragment, useRef } from "react"
import useItemPublicLinkStatusQuery from "@/queries/useItemPublicLinkStatusQuery"
import { View, ScrollView, BackHandler, Alert, Share } from "react-native"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { Toggle } from "@/components/nativewindui/Toggle"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { type PublicLinkExpiration } from "@filen/sdk"
import { FILE_PUBLIC_LINK_BASE_URL, DIRECTORY_PUBLIC_LINK_BASE_URL } from "@/lib/constants"
import RNPickerSelect, { type Item as RNPickerSelectItem } from "react-native-picker-select"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "../prompts/inputPrompt"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Container from "../Container"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const [toggleStatus, setToggleStatus] = useState<boolean>(false)
	const [downloadEnabled, setDownloadEnabled] = useState<boolean>(false)
	const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
	const [password, setPassword] = useState<string | null>(null)
	const { isDarkColorScheme, colors } = useColorScheme()
	const queryDataUpdatedAt = useRef<number>(0)
	const [didChange, setDidChange] = useState<boolean>(false)

	const query = useItemPublicLinkStatusQuery({
		item
	})

	const save = useCallback(async () => {
		if (!query.isSuccess || !query.data.enabled || !didChange) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("editItemPublicLink", {
				type: item.type,
				itemUUID: item.uuid,
				enableDownload: downloadEnabled,
				expiration,
				linkUUID: query.data.uuid,
				password: password && password.length > 0 ? password : undefined
			})

			await query.refetch()

			setDidChange(false)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [query, downloadEnabled, item, expiration, password, didChange])

	const toggleDownload = useCallback(() => {
		if (!query.isSuccess || !query.data.enabled) {
			return
		}

		setDownloadEnabled(prev => !prev)
		setDidChange(true)
	}, [query.isSuccess, query.data?.enabled])

	const editPassword = useCallback(async () => {
		if (!query.isSuccess || !query.data.enabled) {
			return
		}

		const inputPromptResponse = await inputPrompt({
			title: "Edit password",
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: "Leave empty to disable"
			}
		})

		if (inputPromptResponse.cancelled) {
			setPassword("")
		} else {
			setPassword(inputPromptResponse.type === "text" ? inputPromptResponse.text : inputPromptResponse.password)
		}

		setDidChange(true)
	}, [query.isSuccess, query.data?.enabled])

	const share = useCallback(async () => {
		if (!query.isSuccess || !query.data.enabled) {
			return
		}

		try {
			const key =
				item.type === "file"
					? query.data.key
					: await nodeWorker.proxy("decryptDirectoryPublicLinkKey", {
							metadata: query.data.key
					  })

			const link = `${item.type === "file" ? FILE_PUBLIC_LINK_BASE_URL : DIRECTORY_PUBLIC_LINK_BASE_URL}${
				query.data.uuid
			}${encodeURIComponent("#")}${Buffer.from(key, "utf-8").toString("hex")}`

			await Share.share(
				{
					url: link,
					message: link
				},
				{
					dialogTitle: "Filen public link"
				}
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [query.isSuccess, query.data, item])

	const toggle = useCallback(async () => {
		if (!query.isSuccess) {
			return
		}

		fullScreenLoadingModal.show()

		setToggleStatus(!query.data.enabled)

		try {
			if (query.data.enabled) {
				if (!query.data.uuid) {
					return
				}

				await nodeWorker.proxy("toggleItemPublicLink", {
					item,
					enable: false,
					linkUUID: query.data.uuid
				})
			} else {
				await nodeWorker.proxy("toggleItemPublicLink", {
					item,
					enable: true,
					linkUUID: ""
				})
			}

			await query.refetch()

			setDidChange(false)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [query, item])

	useEffect(() => {
		const backAction = () => {
			if (didChange) {
				Alert.alert(
					"Unsaved Changes",
					"You have unsaved changes. Would you like to save them?",
					[
						{
							text: "Discard",
							onPress: () => {
								return true
							}
						},
						{
							text: "Save",
							onPress: async () => {
								await save()
								return true
							}
						}
					],
					{
						userInterfaceStyle: isDarkColorScheme ? "dark" : "light"
					}
				)

				return true
			}
			return false
		}

		const backHandlerListener = BackHandler.addEventListener("hardwareBackPress", backAction)

		return () => {
			backHandlerListener.remove()
		}
	}, [didChange, save, isDarkColorScheme])

	useEffect(() => {
		if (query.isSuccess && query.dataUpdatedAt > queryDataUpdatedAt.current) {
			queryDataUpdatedAt.current = query.dataUpdatedAt

			setToggleStatus(query.data.enabled)

			if (query.data.enabled) {
				setDownloadEnabled(query.data.downloadButton)
				setExpiration((query.data.expirationText as PublicLinkExpiration) ?? "never")
				setPassword(query.data.password)
			}
		}
	}, [query])

	return (
		<Container>
			<ScrollView
				className="flex-1 px-4"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 flex-col gap-2">
					<View className="flex-row items-center justify-between gap-4 mt-4">
						<Text>Enabled</Text>
						<Toggle
							onChange={toggle}
							value={toggleStatus}
							disabled={query.status !== "success"}
						/>
					</View>
					{query.data?.enabled && (
						<Fragment>
							<View className="flex-row items-center justify-between gap-4">
								<View className="flex-row items-center gap-4">
									<Text>Password</Text>
									<Text
										className="text-muted-foreground pt-1.5"
										numberOfLines={1}
									>
										{password
											? new Array(16)
													.fill(0)
													.map(() => "*")
													.join("")
											: ""}
									</Text>
								</View>
								<View className="flex-row items-center">
									{password && (
										<Button
											variant="plain"
											onPress={() => setPassword(null)}
										>
											<Text className="text-red-500">Disable</Text>
										</Button>
									)}
									<Button
										variant="plain"
										onPress={editPassword}
									>
										<Text className="text-blue-500">Edit</Text>
									</Button>
								</View>
							</View>
							<RNPickerSelect
								disabled={query.status !== "success" || !query.data.enabled}
								onValueChange={exp => {
									setExpiration(exp)
									setDidChange(true)
								}}
								value={expiration}
								placeholder={{
									label: "Expires never",
									value: "never",
									key: "never"
								}}
								textInputProps={{
									pointerEvents: "none"
								}}
								darkTheme={isDarkColorScheme}
								useNativeAndroidPickerStyle={true}
								style={{
									inputIOS: {
										color: colors.foreground,
										backgroundColor: colors.background,
										borderColor: colors.grey5,
										borderWidth: 1,
										borderRadius: 6,
										padding: 10,
										fontSize: 16
									},
									inputAndroid: {
										color: colors.foreground,
										backgroundColor: colors.card,
										borderColor: colors.grey5,
										borderWidth: 1,
										borderRadius: 6,
										padding: 0,
										fontSize: 16
									},
									inputAndroidContainer: {
										borderRadius: 6
									},
									chevron: {
										backgroundColor: colors.foreground,
										borderColor: colors.foreground
									},
									chevronActive: {
										backgroundColor: colors.foreground,
										borderColor: colors.foreground
									},
									chevronDark: {
										backgroundColor: colors.foreground,
										borderColor: colors.foreground
									},
									chevronDown: {
										backgroundColor: colors.foreground,
										borderColor: colors.foreground
									},
									chevronUp: {
										backgroundColor: colors.foreground,
										borderColor: colors.foreground
									},
									placeholder: {
										color: colors.foreground
									}
								}}
								items={
									[
										{
											label: "Expires after 1h",
											value: "1h",
											key: "1h"
										},
										{
											label: "Expires after 6h",
											value: "6h",
											key: "6h"
										}
									] satisfies (RNPickerSelectItem & {
										value: PublicLinkExpiration
									})[]
								}
							/>
							<View className="flex-row items-center justify-between gap-4 mt-2">
								<Text disabled={query.status !== "success" || !query.data.enabled}>Download btn</Text>
								<Toggle
									onChange={toggleDownload}
									value={downloadEnabled}
									disabled={query.status !== "success" || !query.data.enabled}
								/>
							</View>
						</Fragment>
					)}
				</View>
			</ScrollView>
			<Toolbar
				iosBlurIntensity={100}
				iosHint={didChange && query.isSuccess ? "Unsaved changes" : undefined}
				leftView={
					<ToolbarIcon
						disabled={query.status !== "success" || !query.data?.enabled}
						icon={{
							name: "send-outline"
						}}
						onPress={share}
					/>
				}
				rightView={
					<ToolbarCTA
						disabled={query.status !== "success" || !didChange || !query.data?.enabled}
						icon={{
							name: "check-circle-outline"
						}}
						onPress={save}
					/>
				}
			/>
		</Container>
	)
})

Content.displayName = "Content"

export default Content
