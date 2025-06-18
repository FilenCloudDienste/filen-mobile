import { memo, Fragment, useRef, useMemo, useCallback, useState } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { List, ESTIMATED_ITEM_HEIGHT, type ListRenderItemInfo, type ListDataItem } from "@/components/nativewindui/List"
import { View, RefreshControl } from "react-native"
import useViewLayout from "@/hooks/useViewLayout"
import useContactsQuery from "@/queries/useContactsQuery"
import { contactName, convertTimestampToMs } from "@/lib/utils"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import useContactsRequestsQuery from "@/queries/useContactsRequestsQuery"
import Contact, { type ListItemInfo } from "@/components/contacts/contact"
import ListHeader from "@/components/contacts/listHeader"
import ListEmpty from "@/components/contacts/listEmpty"
import { Button } from "@/components/nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import contactsService from "@/services/contacts.service"
import { CONTACTS_ONLINE_TIMEOUT } from "@/lib/constants"

export const Contacts = memo(() => {
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const [contactsActiveTab] = useMMKVString("contactsActiveTab", mmkvInstance)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const { colors } = useColorScheme()

	const allContactsQuery = useContactsQuery({
		type: "all"
	})

	const blockedContactsQuery = useContactsQuery({
		type: "blocked"
	})

	const contactsRequestsQuery = useContactsRequestsQuery({})

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

		return data.sort((a, b) =>
			a.title.localeCompare(b.title, "en", {
				numeric: true
			})
		)
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

	const sendRequest = useCallback(() => {
		contactsService.sendRequest()
	}, [])

	return (
		<Fragment>
			<LargeTitleHeader
				title="Contacts"
				searchBar={{
					onChangeText: setSearchTerm,
					iosHideWhenScrolling: true
				}}
				rightView={() => {
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
				}}
			/>
			<View
				className="flex-1"
				ref={viewRef}
				onLayout={onLayout}
			>
				<List
					contentInsetAdjustmentBehavior="automatic"
					variant="full-width"
					contentContainerStyle={{
						paddingBottom: 100
					}}
					data={listData}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					ListEmptyComponent={
						<ListEmpty
							activeTab={activeTab}
							pending={
								allContactsQuery.status === "pending" ||
								blockedContactsQuery.status === "pending" ||
								contactsRequestsQuery.status === "pending"
							}
						/>
					}
					estimatedListSize={
						listLayout.width > 0 && listLayout.height > 0
							? {
									width: listLayout.width,
									height: listLayout.height
							  }
							: undefined
					}
					estimatedItemSize={ESTIMATED_ITEM_HEIGHT.titleOnly}
					drawDistance={0}
					removeClippedSubviews={true}
					disableAutoLayout={true}
					refreshing={
						refreshing ||
						allContactsQuery.status === "pending" ||
						blockedContactsQuery.status === "pending" ||
						contactsRequestsQuery.status === "pending"
					}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)

								await Promise.all([
									blockedContactsQuery.refetch(),
									allContactsQuery.refetch(),
									contactsRequestsQuery.refetch()
								]).catch(console.error)

								setRefreshing(false)
							}}
						/>
					}
					ListHeaderComponent={<ListHeader />}
				/>
			</View>
		</Fragment>
	)
})

Contacts.displayName = "Contacts"

export default Contacts
