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
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "../prompts/inputPrompt"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Container from "../Container"
import useIsProUser from "@/hooks/useIsProUser"
import { Settings, type SettingsItem, IconView } from "../settings"
import { DropdownMenu } from "../nativewindui/DropdownMenu"
import { createDropdownItem } from "../nativewindui/DropdownMenu/utils"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const [toggleStatus, setToggleStatus] = useState<boolean>(false)
	const [downloadEnabled, setDownloadEnabled] = useState<boolean>(false)
	const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
	const [password, setPassword] = useState<string | null>(null)
	const { isDarkColorScheme } = useColorScheme()
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

		if (inputPromptResponse.cancelled || (inputPromptResponse.type === "text" && inputPromptResponse.text.length === 0)) {
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
							name="link"
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
					<Button
						variant="plain"
						size="none"
						onPress={editPassword}
						hitSlop={15}
					>
						<Text className="text-blue-500">Edit</Text>
					</Button>
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
					<DropdownMenu
						items={[
							createDropdownItem({
								actionKey: "never",
								title: "Never"
							}),
							createDropdownItem({
								actionKey: "1h",
								title: "1 hour"
							}),
							createDropdownItem({
								actionKey: "6h",
								title: "6 hours"
							}),
							createDropdownItem({
								actionKey: "1d",
								title: "1 day"
							}),
							createDropdownItem({
								actionKey: "3d",
								title: "3 days"
							}),
							createDropdownItem({
								actionKey: "7d",
								title: "7 days"
							}),
							createDropdownItem({
								actionKey: "14d",
								title: "14 days"
							}),
							createDropdownItem({
								actionKey: "30d",
								title: "30 days"
							})
						]}
						onItemPress={({ actionKey }) => {
							setExpiration(actionKey as PublicLinkExpiration)
							setDidChange(true)
						}}
					>
						<Button
							variant="plain"
							size="none"
							onPress={e => {
								e.stopPropagation()
								e.preventDefault()
							}}
							disabled={query.status !== "success" || !query.data.enabled}
							hitSlop={15}
						>
							<Text className="text-blue-500">{expiration}</Text>
						</Button>
					</DropdownMenu>
				)
			},
			{
				id: "3",
				title: "Download button",
				leftView: (
					<IconView
						name="file-download-outline"
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
	}, [toggle, toggleStatus, query.status, query.data?.enabled, editPassword, expiration, downloadEnabled, toggleDownload])

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
				disableAndroidRipple={true}
			/>
			<Toolbar
				iosBlurIntensity={100}
				iosHint={didChange && query.isSuccess ? "Unsaved changes" : undefined}
				leftView={
					<ToolbarIcon
						disabled={query.status !== "success" || !query.data?.enabled}
						icon={{
							ios: {
								name: "square.and.arrow.up"
							},
							name: "link"
						}}
						onPress={share}
					/>
				}
				rightView={
					<ToolbarCTA
						disabled={query.status !== "success" || !didChange || !query.data?.enabled}
						icon={{
							name: didChange ? "check-circle" : "check-circle-outline"
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
