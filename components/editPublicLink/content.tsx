import { memo, useCallback, useState, useMemo } from "react"
import useItemPublicLinkStatusQuery, {
	type UseItemPublicLinkStatusQuery,
	itemPublicLinkStatusQueryRefetch
} from "@/queries/useItemPublicLinkStatus.query"
import { View, Share, Platform } from "react-native"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { Toggle } from "@/components/nativewindui/Toggle"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import type { PublicLinkExpiration } from "@filen/sdk"
import { FILE_PUBLIC_LINK_BASE_URL, DIRECTORY_PUBLIC_LINK_BASE_URL } from "@/lib/constants"
import { inputPrompt } from "../prompts/inputPrompt"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Container from "../Container"
import useIsProUser from "@/hooks/useIsProUser"
import { Settings, type SettingsItem } from "../settings"
import { DropdownMenu } from "../nativewindui/DropdownMenu"
import { createDropdownItem } from "../nativewindui/DropdownMenu/utils"
import { translateMemoized } from "@/lib/i18n"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"
import { ActivityIndicator } from "../nativewindui/ActivityIndicator"

export const Inner = memo(({ item, status }: { item: DriveCloudItem; status: UseItemPublicLinkStatusQuery }) => {
	const [didChange, setDidChange] = useState<boolean>(false)
	const [downloadEnabled, setDownloadEnabled] = useState<boolean>(status.enabled ? status.downloadButton : false)
	const [expiration, setExpiration] = useState<PublicLinkExpiration>(
		status.enabled ? (status.expirationText as PublicLinkExpiration) ?? "never" : "never"
	)
	const [password, setPassword] = useState<string | null>(null)
	const [enabled, setEnabled] = useState<boolean>(status.enabled)
	const { colors } = useColorScheme()

	const save = useCallback(async () => {
		if (!enabled || !didChange || !status.enabled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("editItemPublicLink", {
				type: item.type,
				itemUUID: item.uuid,
				enableDownload: downloadEnabled,
				expiration,
				linkUUID: status.uuid,
				password: password && password.length > 0 ? password : undefined
			})

			await itemPublicLinkStatusQueryRefetch({
				item
			})

			setDidChange(false)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [downloadEnabled, item, expiration, password, didChange, enabled, status])

	const toggleDownload = useCallback(() => {
		if (!status.enabled) {
			return
		}

		setDownloadEnabled(prev => !prev)
		setDidChange(true)
	}, [status])

	const editPassword = useCallback(async () => {
		if (!status.enabled) {
			return
		}

		const inputPromptResponse = await inputPrompt({
			title: translateMemoized("editPublicLink.prompts.editPassword.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: translateMemoized("editPublicLink.prompts.editPassword.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || (inputPromptResponse.type === "text" && inputPromptResponse.text.length === 0)) {
			setPassword("")
		} else {
			setPassword(inputPromptResponse.type === "text" ? inputPromptResponse.text : inputPromptResponse.password)
		}

		setDidChange(true)
	}, [status.enabled])

	const share = useCallback(async () => {
		if (!status.enabled) {
			return
		}

		try {
			const key =
				item.type === "file"
					? status.key
					: await nodeWorker.proxy("decryptDirectoryPublicLinkKey", {
							metadata: status.key
					  })

			const link = `${item.type === "file" ? FILE_PUBLIC_LINK_BASE_URL : DIRECTORY_PUBLIC_LINK_BASE_URL}${
				status.uuid
			}${encodeURIComponent("#")}${Buffer.from(key, "utf-8").toString("hex")}`

			await Share.share(
				{
					message: link
				},
				{
					dialogTitle: translateMemoized("editPublicLink.shareDialogTile")
				}
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [status, item])

	const toggle = useCallback(async () => {
		fullScreenLoadingModal.show()

		const statusBefore = structuredClone(status)

		setEnabled(!status.enabled)

		try {
			if (status.enabled) {
				if (!status.uuid) {
					return
				}

				await nodeWorker.proxy("toggleItemPublicLink", {
					item,
					enable: false,
					linkUUID: status.uuid
				})

				setEnabled(false)
			} else {
				await nodeWorker.proxy("toggleItemPublicLink", {
					item,
					enable: true,
					linkUUID: ""
				})

				setEnabled(true)
			}

			await itemPublicLinkStatusQueryRefetch({
				item
			})

			setDidChange(false)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}

			setEnabled(statusBefore.enabled)
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [status, item])

	const expirationText = useMemo(() => {
		switch (expiration) {
			case "never": {
				return translateMemoized("editPublicLink.items.expirationNever")
			}

			case "1h": {
				return translateMemoized("editPublicLink.items.expiration1h")
			}

			case "6h": {
				return translateMemoized("editPublicLink.items.expiration6h")
			}

			case "1d": {
				return translateMemoized("editPublicLink.items.expiration1d")
			}

			case "3d": {
				return translateMemoized("editPublicLink.items.expiration3d")
			}

			case "7d": {
				return translateMemoized("editPublicLink.items.expiration7d")
			}

			case "14d": {
				return translateMemoized("editPublicLink.items.expiration14d")
			}

			case "30d": {
				return translateMemoized("editPublicLink.items.expiration30d")
			}

			default: {
				return translateMemoized("editPublicLink.items.expirationNever")
			}
		}
	}, [expiration])

	const settingsItems = useMemo(() => {
		return [
			{
				id: "0",
				title: translateMemoized("editPublicLink.items.enabled"),
				rightView: (
					<Toggle
						onChange={toggle}
						value={enabled}
					/>
				)
			},
			...(status.enabled
				? [
						"gap-0",
						{
							id: "1",
							title: translateMemoized("editPublicLink.items.password"),
							rightView: (
								<Button
									variant="plain"
									size="none"
									onPress={editPassword}
									hitSlop={15}
								>
									<Text className="text-blue-500">{translateMemoized("editPublicLink.items.edit")}</Text>
								</Button>
							)
						},
						{
							id: "2",
							title: translateMemoized("editPublicLink.items.expiration"),
							rightView: (
								<DropdownMenu
									items={[
										createDropdownItem({
											actionKey: "never",
											title: translateMemoized("editPublicLink.items.expirationNever")
										}),
										createDropdownItem({
											actionKey: "1h",
											title: translateMemoized("editPublicLink.items.expiration1h")
										}),
										createDropdownItem({
											actionKey: "6h",
											title: translateMemoized("editPublicLink.items.expiration6h")
										}),
										createDropdownItem({
											actionKey: "1d",
											title: translateMemoized("editPublicLink.items.expiration1d")
										}),
										createDropdownItem({
											actionKey: "3d",
											title: translateMemoized("editPublicLink.items.expiration3d")
										}),
										createDropdownItem({
											actionKey: "7d",
											title: translateMemoized("editPublicLink.items.expiration7d")
										}),
										createDropdownItem({
											actionKey: "14d",
											title: translateMemoized("editPublicLink.items.expiration14d")
										}),
										createDropdownItem({
											actionKey: "30d",
											title: translateMemoized("editPublicLink.items.expiration30d")
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
										disabled={!status.enabled}
										hitSlop={15}
									>
										<Text className="text-blue-500">{expirationText}</Text>
									</Button>
								</DropdownMenu>
							)
						},
						{
							id: "3",
							title: translateMemoized("editPublicLink.items.downloadButton"),
							rightView: (
								<Toggle
									onChange={toggleDownload}
									value={downloadEnabled}
									disabled={!status.enabled}
								/>
							)
						},
						{
							id: "4",
							title: translateMemoized("editPublicLink.items.shareLink"),
							rightView:
								Platform.OS === "android" ? (
									<Button
										variant="tonal"
										size="icon"
										onPress={share}
										disabled={!status.enabled}
										hitSlop={15}
									>
										<Icon
											name="send-outline"
											size={20}
											color={colors.foreground}
										/>
									</Button>
								) : (
									<Button
										variant="plain"
										size="none"
										onPress={share}
										disabled={!status.enabled}
										hitSlop={15}
									>
										<Icon
											name="send-outline"
											ios={{
												name: "square.and.arrow.up"
											}}
											size={20}
											color={colors.primary}
										/>
									</Button>
								)
						}
				  ]
				: [])
		] satisfies SettingsItem[]
	}, [
		toggle,
		enabled,
		editPassword,
		downloadEnabled,
		toggleDownload,
		expirationText,
		share,
		colors.foreground,
		status.enabled,
		colors.primary
	])

	return (
		<Container>
			<Settings
				title=""
				showSearchBar={false}
				items={settingsItems}
				hideHeader={true}
				disableAndroidRipple={true}
			/>
			<Toolbar
				iosBlurIntensity={100}
				iosHint={didChange ? translateMemoized("editPublicLink.unsavedChanges") : undefined}
				leftView={Platform.select({
					ios: (
						<ToolbarIcon
							disabled={!status.enabled}
							icon={{
								materialIcon: {
									name: "share-outline"
								},
								ios: {
									name: "square.and.arrow.up"
								}
							}}
							onPress={share}
						/>
					),
					default: undefined
				})}
				rightView={
					<ToolbarCTA
						disabled={!status.enabled || !didChange}
						icon={{
							name: "check"
						}}
						onPress={save}
					/>
				}
			/>
		</Container>
	)
})

Inner.displayName = "Inner"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const isProUser = useIsProUser()
	const { colors } = useColorScheme()

	const query = useItemPublicLinkStatusQuery({
		item
	})

	if (!isProUser) {
		return (
			<Container>
				<View className="flex-1 flex-col gap-4 items-center justify-center px-16">
					<Icon
						name="link"
						size={64}
						color={colors.grey}
					/>
					<Text className="font-normal text-sm text-center">{translateMemoized("editPublicLink.onlyPro")}</Text>
				</View>
			</Container>
		)
	}

	if (query.status !== "success") {
		return (
			<Container>
				<View className="flex-1 flex-col gap-4 items-center justify-center px-16">
					<ActivityIndicator
						size="small"
						color={colors.foreground}
					/>
				</View>
			</Container>
		)
	}

	return (
		<Inner
			key={`${item.uuid}:${query.dataUpdatedAt}`}
			item={item}
			status={query.data}
		/>
	)
})

Content.displayName = "Content"

export default Content
