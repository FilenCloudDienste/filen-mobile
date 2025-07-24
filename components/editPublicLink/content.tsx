import { memo, useCallback, useState, useEffect, useRef, useMemo } from "react"
import useItemPublicLinkStatusQuery from "@/queries/useItemPublicLinkStatusQuery"
import { View, Share } from "react-native"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { Toggle } from "@/components/nativewindui/Toggle"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { type PublicLinkExpiration } from "@filen/sdk"
import { FILE_PUBLIC_LINK_BASE_URL, DIRECTORY_PUBLIC_LINK_BASE_URL } from "@/lib/constants"
import { inputPrompt } from "../prompts/inputPrompt"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Container from "../Container"
import useIsProUser from "@/hooks/useIsProUser"
import { Settings, type SettingsItem } from "../settings"
import { DropdownMenu } from "../nativewindui/DropdownMenu"
import { createDropdownItem } from "../nativewindui/DropdownMenu/utils"
import { useTranslation } from "react-i18next"
import { useColorScheme } from "@/lib/useColorScheme"
import { Icon } from "@roninoss/icons"

export const Content = memo(({ item }: { item: DriveCloudItem }) => {
	const [toggleStatus, setToggleStatus] = useState<boolean>(false)
	const [downloadEnabled, setDownloadEnabled] = useState<boolean>(false)
	const [expiration, setExpiration] = useState<PublicLinkExpiration>("never")
	const [password, setPassword] = useState<string | null>(null)
	const queryDataUpdatedAt = useRef<number>(0)
	const [didChange, setDidChange] = useState<boolean>(false)
	const isProUser = useIsProUser()
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const query = useItemPublicLinkStatusQuery({
		item
	})

	const save = useCallback(async () => {
		if (query.status !== "success" || !query.data.enabled || !didChange) {
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
		if (query.status !== "success" || !query.data.enabled) {
			return
		}

		setDownloadEnabled(prev => !prev)
		setDidChange(true)
	}, [query.status, query.data?.enabled])

	const editPassword = useCallback(async () => {
		if (query.status !== "success" || !query.data.enabled) {
			return
		}

		const inputPromptResponse = await inputPrompt({
			title: t("editPublicLink.prompts.editPassword.title"),
			materialIcon: {
				name: "lock-outline"
			},
			prompt: {
				type: "secure-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("editPublicLink.prompts.editPassword.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || (inputPromptResponse.type === "text" && inputPromptResponse.text.length === 0)) {
			setPassword("")
		} else {
			setPassword(inputPromptResponse.type === "text" ? inputPromptResponse.text : inputPromptResponse.password)
		}

		setDidChange(true)
	}, [query.status, query.data?.enabled, t])

	const share = useCallback(async () => {
		if (query.status !== "success" || !query.data.enabled) {
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
					dialogTitle: t("editPublicLink.shareDialogTile")
				}
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [query.status, query.data, item, t])

	const toggle = useCallback(async () => {
		if (query.status !== "success") {
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

	const expirationText = useMemo(() => {
		switch (expiration) {
			case "never": {
				return t("editPublicLink.items.expirationNever")
			}

			case "1h": {
				return t("editPublicLink.items.expiration1h")
			}

			case "6h": {
				return t("editPublicLink.items.expiration6h")
			}

			case "1d": {
				return t("editPublicLink.items.expiration1d")
			}

			case "3d": {
				return t("editPublicLink.items.expiration3d")
			}

			case "7d": {
				return t("editPublicLink.items.expiration7d")
			}

			case "14d": {
				return t("editPublicLink.items.expiration14d")
			}

			case "30d": {
				return t("editPublicLink.items.expiration30d")
			}

			default: {
				return t("editPublicLink.items.expirationNever")
			}
		}
	}, [expiration, t])

	const settingsItems = useMemo(() => {
		if (query.status !== "success") {
			return []
		}

		if (!query.data.enabled) {
			return [
				{
					id: "0",
					title: t("editPublicLink.items.enabled"),
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
				title: t("editPublicLink.items.enabled"),
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
				title: t("editPublicLink.items.password"),
				rightView: (
					<Button
						variant="plain"
						size="none"
						onPress={editPassword}
						hitSlop={15}
					>
						<Text className="text-blue-500">{t("editPublicLink.items.edit")}</Text>
					</Button>
				)
			},
			{
				id: "2",
				title: t("editPublicLink.items.expiration"),
				rightView: (
					<DropdownMenu
						items={[
							createDropdownItem({
								actionKey: "never",
								title: t("editPublicLink.items.expirationNever")
							}),
							createDropdownItem({
								actionKey: "1h",
								title: t("editPublicLink.items.expiration1h")
							}),
							createDropdownItem({
								actionKey: "6h",
								title: t("editPublicLink.items.expiration6h")
							}),
							createDropdownItem({
								actionKey: "1d",
								title: t("editPublicLink.items.expiration1d")
							}),
							createDropdownItem({
								actionKey: "3d",
								title: t("editPublicLink.items.expiration3d")
							}),
							createDropdownItem({
								actionKey: "7d",
								title: t("editPublicLink.items.expiration7d")
							}),
							createDropdownItem({
								actionKey: "14d",
								title: t("editPublicLink.items.expiration14d")
							}),
							createDropdownItem({
								actionKey: "30d",
								title: t("editPublicLink.items.expiration30d")
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
							<Text className="text-blue-500">{expirationText}</Text>
						</Button>
					</DropdownMenu>
				)
			},
			{
				id: "3",
				title: t("editPublicLink.items.downloadButton"),
				rightView: (
					<Toggle
						onChange={toggleDownload}
						value={downloadEnabled}
						disabled={query.status !== "success" || !query.data.enabled}
					/>
				)
			}
		] satisfies SettingsItem[]
	}, [toggle, toggleStatus, query.status, query.data?.enabled, editPassword, downloadEnabled, toggleDownload, t, expirationText])

	useEffect(() => {
		if (query.status === "success" && query.dataUpdatedAt > queryDataUpdatedAt.current) {
			queryDataUpdatedAt.current = query.dataUpdatedAt

			setToggleStatus(query.data.enabled)

			if (query.data.enabled) {
				setDownloadEnabled(query.data.downloadButton)
				setExpiration((query.data.expirationText as PublicLinkExpiration) ?? "never")
				setPassword(query.data.password)
			}
		}
	}, [query])

	if (isProUser) {
		return (
			<Container>
				<View className="flex-1 flex-col gap-4 items-center justify-center px-16">
					<Icon
						name="link"
						size={64}
						color={colors.grey}
					/>
					<Text className="font-normal text-sm text-center">{t("editPublicLink.onlyPro")}</Text>
				</View>
			</Container>
		)
	}

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
				iosHint={didChange && query.status === "success" ? t("editPublicLink.unsavedChanges") : undefined}
				leftView={
					<ToolbarIcon
						disabled={query.status !== "success" || !query.data?.enabled}
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
				}
				rightView={
					<ToolbarCTA
						disabled={query.status !== "success" || !didChange || !query.data?.enabled}
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

Content.displayName = "Content"

export default Content
