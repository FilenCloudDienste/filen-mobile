import { memo, useCallback, useState, useEffect, useRef, useMemo } from "react"
import useItemPublicLinkStatusQuery from "@/queries/useItemPublicLinkStatusQuery"
import { View, BackHandler, Alert, Share } from "react-native"
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
import useIsProUser from "@/hooks/useIsProUser"
import { Settings, type SettingsItem, IconView } from "../settings"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const [toggleStatus, setToggleStatus] = useState<boolean>(false)
	const [downloadEnabled, setDownloadEnabled] = useState<boolean>(false)
	const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
	const [password, setPassword] = useState<string | null>(null)
	const { isDarkColorScheme, colors } = useColorScheme()
	const queryDataUpdatedAt = useRef<number>(0)
	const [didChange, setDidChange] = useState<boolean>(false)
	const isProUser = useIsProUser()

	const query = useItemPublicLinkStatusQuery({
		item
	})

	const save = useCallback(async () => {
		if (!query.isSuccess || !query.data.enabled || !didChange) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			const start = Date.now()
			await nodeWorker.proxy("editItemPublicLink", {
				type: item.type,
				itemUUID: item.uuid,
				enableDownload: downloadEnabled,
				expiration,
				linkUUID: query.data.uuid,
				password: password && password.length > 0 ? password : undefined
			})

			console.log(
				`Edit public link took ${Date.now() - start}ms for item ${
					item.uuid
				} with expiration ${expiration}, download enabled: ${downloadEnabled}, password: ${!!password}`
			)

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

	const settingsItems = useMemo(() => {
		if (query.status !== "success") {
			return []
		}

		if (!query.data.enabled) {
			return [
				{
					id: "0",
					title: "Enabled",
					leftView: (
						<IconView
							name="play"
							className="bg-blue-500"
						/>
					),
					rightView: (
						<Toggle
							onChange={toggle}
							value={toggleStatus}
							disabled={query.status !== "success"}
						/>
					)
				}
			] satisfies SettingsItem[]
		}

		return [
			{
				id: "0",
				title: "Enabled",
				leftView: (
					<IconView
						name="play"
						className="bg-blue-500"
					/>
				),
				rightView: (
					<Toggle
						onChange={toggle}
						value={toggleStatus}
						disabled={query.status !== "success"}
					/>
				)
			},
			"gap-0",
			{
				id: "1",
				title: "Password",
				leftView: (
					<IconView
						name="lock"
						className="bg-gray-500"
					/>
				),
				rightView: (
					<View className="flex-row items-center gap-4">
						{password && (
							<Button
								variant="plain"
								size="none"
								onPress={() => setPassword(null)}
							>
								<Text className="text-red-500">Disable</Text>
							</Button>
						)}
						<Button
							variant="plain"
							size="none"
							onPress={editPassword}
						>
							<Text className="text-blue-500">Edit</Text>
						</Button>
					</View>
				)
			},
			{
				id: "2",
				title: "Expiration",
				leftView: (
					<IconView
						name="clock"
						className="bg-gray-500"
					/>
				),
				rightView: (
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
								color: colors.primary,
								backgroundColor: "transparent",
								borderColor: "transparent",
								borderWidth: 0,
								borderRadius: 0,
								padding: 4,
								fontSize: 17
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
								color: colors.primary
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
				)
			},
			{
				id: "3",
				title: "Download button",
				leftView: (
					<IconView
						name="file-document"
						className="bg-gray-500"
					/>
				),
				rightView: (
					<Toggle
						onChange={toggleDownload}
						value={downloadEnabled}
						disabled={query.status !== "success" || !query.data.enabled}
					/>
				)
			}
		] satisfies SettingsItem[]
	}, [
		toggle,
		toggleStatus,
		query.status,
		query.data?.enabled,
		password,
		editPassword,
		expiration,
		isDarkColorScheme,
		colors.foreground,
		colors.card,
		colors.grey5,
		colors.primary,
		downloadEnabled,
		toggleDownload
	])

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

	if (!isProUser) {
		return (
			<Container>
				<View className="flex-1 items-center justify-center">
					<Text className="text-red-500 mt-4">Public links are only available for Pro users.</Text>
				</View>
			</Container>
		)
	}

	return (
		<Container>
			<Settings
				title="Settings"
				showSearchBar={false}
				items={settingsItems}
				hideHeader={true}
			/>
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
