import { memo, Fragment, useMemo, useCallback, useState } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, type ListRenderItemInfo, type ListDataItem } from "@/components/nativewindui/List"
import { RefreshControl } from "react-native"
import useContactsQuery from "@/queries/useContacts.query"
import { contactName, convertTimestampToMs, fastLocaleCompare } from "@/lib/utils"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useContactsRequestsQuery from "@/queries/useContactsRequests.query"
import Contact, { type ListItemInfo } from "@/components/contacts/contact"
import ListHeader from "@/components/contacts/listHeader"
import ListEmpty from "@/components/listEmpty"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import contactsService from "@/services/contacts.service"
import { CONTACTS_ONLINE_TIMEOUT } from "@/lib/constants"
import alerts from "@/lib/alerts"
import { translateMemoized } from "@/lib/i18n"
import useNetInfo from "@/hooks/useNetInfo"

const contentContainerStyle = {
	paddingBottom: 100
}

export const Contacts = memo(() => {
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [contactsActiveTab] = useMMKVString("contactsActiveTab", mmkvInstance) as unknown as [
		"requests" | "pending" | "all" | "blocked" | "online" | "offline" | undefined
	]
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()

	const allContactsQuery = useContactsQuery({
		type: "all"
	})

	const blockedContactsQuery = useContactsQuery({
		type: "blocked"
	})

	const contactsRequestsQuery = useContactsRequestsQuery()

	const activeTab = useMemo(() => {
		return contactsActiveTab ?? "all"
	}, [contactsActiveTab])

	const listData = useMemo(() => {
		if (
			allContactsQuery.status !== "success" ||
			blockedContactsQuery.status !== "success" ||
			contactsRequestsQuery.status !== "success"
		) {
			return []
		}

		let data: ListItemInfo[] = []

		if (activeTab === "requests") {
			data = contactsRequestsQuery.data.incoming.map(item => ({
				id: item.uuid,
				title: contactName(item.email, item.nickName),
				subTitle: item.email,
				request: item,
				type: "incomingRequest" as const
			}))
		} else if (activeTab === "pending") {
			data = contactsRequestsQuery.data.outgoing.map(item => ({
				id: item.uuid,
				title: contactName(item.email, item.nickName),
				subTitle: item.email,
				request: item,
				type: "outgoingRequest" as const
			}))
		} else {
			data = (
				activeTab === "all" || activeTab === "offline" || activeTab === "online" ? allContactsQuery.data : blockedContactsQuery.data
			).map(item => ({
				id: item.uuid,
				title: contactName(item.email, item.nickName),
				subTitle: item.email,
				contact: item,
				type: activeTab === "blocked" ? ("blocked" as const) : ("contact" as const)
			}))

			if (activeTab === "online") {
				data = data.filter(item => {
					if (item.type === "contact") {
						return convertTimestampToMs(item.contact.lastActive) > Date.now() - CONTACTS_ONLINE_TIMEOUT
					}

					return false
				})
			}

			if (activeTab === "offline") {
				data = data.filter(item => {
					if (item.type === "contact") {
						return convertTimestampToMs(item.contact.lastActive) <= Date.now() - CONTACTS_ONLINE_TIMEOUT
					}

					return false
				})
			}
		}

		if (searchTerm.length > 0) {
			const searchTermLowercase = searchTerm.toLowerCase()

			data = data.filter(
				item => item.title.toLowerCase().includes(searchTermLowercase) || item.subTitle.toLowerCase().includes(searchTermLowercase)
			)
		}

		return data.sort((a, b) => fastLocaleCompare(a.title, b.title))
	}, [
		allContactsQuery.status,
		allContactsQuery.data,
		searchTerm,
		blockedContactsQuery.status,
		blockedContactsQuery.data,
		activeTab,
		contactsRequestsQuery.status,
		contactsRequestsQuery.data
	])

	const renderItem = useCallback((info: ListRenderItemInfo<ListItemInfo>) => {
		return <Contact info={info} />
	}, [])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const sendRequest = useCallback(async () => {
		try {
			await contactsService.sendRequest({})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const headerSearchBar = useMemo(() => {
		return {
			onChangeText: setSearchTerm,
			iosHideWhenScrolling: false
		}
	}, [setSearchTerm])

	const headerRightView = useCallback(() => {
		return (
			<Button
				variant="plain"
				size="icon"
				onPress={sendRequest}
			>
				<Icon
					name="plus"
					size={24}
					color={colors.primary}
				/>
			</Button>
		)
	}, [sendRequest, colors.primary])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={
					activeTab === "all"
						? allContactsQuery.status
						: activeTab === "blocked"
						? blockedContactsQuery.status
						: contactsRequestsQuery.status
				}
				itemCount={listData.length}
				searchTermLength={searchTerm.length}
				texts={{
					error:
						activeTab === "all"
							? translateMemoized("settings.contacts.listEmpty.all.error")
							: activeTab === "blocked"
							? translateMemoized("settings.contacts.listEmpty.blocked.error")
							: activeTab === "requests"
							? translateMemoized("settings.contacts.listEmpty.requests.error")
							: activeTab === "pending"
							? translateMemoized("settings.contacts.listEmpty.pending.error")
							: activeTab === "online"
							? translateMemoized("settings.contacts.listEmpty.online.error")
							: activeTab === "offline"
							? translateMemoized("settings.contacts.listEmpty.offline.error")
							: undefined,
					empty:
						activeTab === "all"
							? translateMemoized("settings.contacts.listEmpty.all.empty")
							: activeTab === "blocked"
							? translateMemoized("settings.contacts.listEmpty.blocked.empty")
							: activeTab === "requests"
							? translateMemoized("settings.contacts.listEmpty.requests.empty")
							: activeTab === "pending"
							? translateMemoized("settings.contacts.listEmpty.pending.empty")
							: activeTab === "online"
							? translateMemoized("settings.contacts.listEmpty.online.empty")
							: activeTab === "offline"
							? translateMemoized("settings.contacts.listEmpty.offline.empty")
							: undefined,
					emptySearch:
						activeTab === "all"
							? translateMemoized("settings.contacts.listEmpty.all.emptySearch")
							: activeTab === "blocked"
							? translateMemoized("settings.contacts.listEmpty.blocked.emptySearch")
							: activeTab === "requests"
							? translateMemoized("settings.contacts.listEmpty.requests.emptySearch")
							: activeTab === "pending"
							? translateMemoized("settings.contacts.listEmpty.pending.emptySearch")
							: activeTab === "online"
							? translateMemoized("settings.contacts.listEmpty.online.emptySearch")
							: activeTab === "offline"
							? translateMemoized("settings.contacts.listEmpty.offline.emptySearch")
							: undefined
				}}
				icons={{
					error: {
						name: "wifi-alert"
					},
					empty: {
						name: "account-multiple-outline"
					},
					emptySearch: {
						name: "magnify"
					}
				}}
			/>
		)
	}, [activeTab, allContactsQuery.status, blockedContactsQuery.status, contactsRequestsQuery.status, listData.length, searchTerm.length])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await Promise.all([blockedContactsQuery.refetch(), allContactsQuery.refetch(), contactsRequestsQuery.refetch()])
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [setRefreshing, allContactsQuery, blockedContactsQuery, contactsRequestsQuery])

	const refreshControl = useMemo(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<RefreshControl
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		)
	}, [refreshing, onRefresh, hasInternet])

	const ListHeaderComponent = useCallback(() => {
		return <ListHeader />
	}, [])

	return (
		<Fragment>
			<LargeTitleHeader
				title={translateMemoized("settings.contacts.title")}
				searchBar={headerSearchBar}
				rightView={headerRightView}
			/>
			<List
				contentInsetAdjustmentBehavior="automatic"
				variant="full-width"
				contentContainerStyle={contentContainerStyle}
				data={listData}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				ListEmptyComponent={ListEmptyComponent}
				refreshing={refreshing}
				refreshControl={refreshControl}
				ListHeaderComponent={ListHeaderComponent}
			/>
		</Fragment>
	)
})

Contacts.displayName = "Contacts"

export default Contacts
