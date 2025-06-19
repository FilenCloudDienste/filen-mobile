import { memo, useMemo, useCallback } from "react"
import { Settings as SettingsComponent, IconView } from "@/components/settings"
import Avatar from "@/components/avatar"
import useAccountQuery from "@/queries/useAccountQuery"
import { formatBytes } from "@/lib/utils"
import { useRouter } from "expo-router"
import { Toggle } from "@/components/nativewindui/Toggle"

export const Settings = memo(() => {
	const router = useRouter()

	const account = useAccountQuery({})

	const avatarSource = useMemo(() => {
		if (account.status !== "success" || !account.data.account.avatarURL || !account.data.account.avatarURL.startsWith("https://")) {
			return {
				uri: "avatar_fallback"
			}
		}

		return {
			uri: account.data.account.avatarURL
		}
	}, [account.data, account.status])

	const onPressAccount = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/account"
		})
	}, [router])

	const onPressSecurity = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/security"
		})
	}, [router])

	const onPressEvents = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/events"
		})
	}, [router])

	const onPressContacts = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/contacts"
		})
	}, [router])

	const onPressAdvanced = useCallback(() => {
		router.push({
			pathname: "/(app)/home/settings/advanced"
		})
	}, [router])

	const onPressCameraUpload = useCallback(() => {
		router.push({
			pathname: "/(app)/photos"
		})

		setTimeout(() => {
			router.push({
				pathname: "/(app)/photos/settings"
			})
		}, 1)
	}, [router])

	const onPressChats = useCallback(() => {
		router.push({
			pathname: "/(app)/chats"
		})

		setTimeout(() => {
			router.push({
				pathname: "/(app)/chats/settings"
			})
		}, 1)
	}, [router])

	return (
		<SettingsComponent
			title="Settings"
			showSearchBar={false}
			loading={account.status !== "success"}
			items={[
				{
					id: "1",
					title: account.data?.account.email ?? "",
					subTitle: `${formatBytes(account.data?.account.storage ?? 0)} used of ${formatBytes(
						account.data?.account.maxStorage ?? 0
					)} (${(((account.data?.account.storage ?? 0) / (account.data?.account.maxStorage ?? 1)) * 100).toFixed(2)}%)`,
					onPress: onPressAccount,
					leftView: (
						<Avatar
							source={avatarSource}
							style={{
								width: 42,
								height: 42
							}}
						/>
					)
				},
				"gap-0",
				{
					id: "2",
					title: "Security",
					onPress: onPressSecurity,
					leftView: (
						<IconView
							name="lock-outline"
							className="bg-red-500"
						/>
					)
				},
				{
					id: "4",
					title: "Events",
					onPress: onPressEvents,
					leftView: (
						<IconView
							name="format-list-bulleted"
							className="bg-orange-500"
						/>
					)
				},
				"gap-5",
				{
					id: "3",
					title: "Camera upload",
					onPress: onPressCameraUpload,
					leftView: (
						<IconView
							name="account-multiple-outline"
							className="bg-green-500"
						/>
					)
				},
				{
					id: "333",
					title: "File provider",
					leftView: (
						<IconView
							name="folder-open"
							className="bg-purple-500"
						/>
					),
					rightView: <Toggle value={false} />
				},
				"gap-2",
				{
					id: "111",
					title: "Contacts",
					onPress: onPressContacts,
					leftView: (
						<IconView
							name="account-multiple-outline"
							className="bg-blue-500"
						/>
					)
				},
				{
					id: "1112",
					title: "Chat settings",
					onPress: onPressChats,
					leftView: (
						<IconView
							name="message-outline"
							className="bg-cyan-500"
						/>
					)
				},
				"gap-1",
				{
					id: "7",
					title: "Advanced",
					onPress: onPressAdvanced,
					leftView: (
						<IconView
							name="cog-outline"
							className="bg-gray-500"
						/>
					)
				}
			]}
		/>
	)
})

Settings.displayName = "Settings"

export default Settings
