import events from "@/lib/events"
import { useCallback, useState, useMemo, useEffect } from "react"
import useContactsQuery from "@/queries/useContacts.query"
import { List, type ListDataItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import { RefreshControl, View, Platform } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { useTranslation } from "react-i18next"
import { useColorScheme } from "@/lib/useColorScheme"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { useLocalSearchParams, useRouter } from "expo-router"
import Container from "@/components/Container"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Contact, { type ListItemInfo } from "@/components/contacts/contact"
import { useSelectContactsStore } from "@/stores/selectContacts.store"
import { contactName } from "@/lib/utils"
import { useShallow } from "zustand/shallow"
import { Button } from "@/components/nativewindui/Button"
import contactsService from "@/services/contacts.service"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import RequireInternet from "@/components/requireInternet"
import ListEmpty from "@/components/listEmpty"
import alerts from "@/lib/alerts"
import useNetInfo from "@/hooks/useNetInfo"

export default function SelectContacts() {
	const { colors } = useColorScheme()
	const { id, type, max } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { back, canGoBack } = useRouter()
	const selectedContacts = useSelectContactsStore(useShallow(state => state.selectedContacts))
	const setSelectedContacts = useSelectContactsStore(useShallow(state => state.setSelectedContacts))
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()

	const query = useContactsQuery({
		type: typeof type === "string" ? (type as "all" | "blocked") : "all"
	})

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const contacts = useMemo(() => {
		if (query.status !== "success") {
			return []
		}

		let contacts = query.data
			.map(item => ({
				id: item.uuid,
				title: contactName(item.email, item.nickName),
				subTitle: item.email,
				contact: item,
				type: type === "blocked" ? ("blocked" as const) : ("contact" as const)
			}))
			.sort((a, b) =>
				a.title.localeCompare(b.title, "en", {
					numeric: true
				})
			)

		if (searchTerm.length > 0) {
			const searchTermLowercase = searchTerm.toLowerCase()

			contacts = contacts.filter(
				contact =>
					contact.title.toLowerCase().includes(searchTermLowercase) ||
					contact.subTitle.toLowerCase().includes(searchTermLowercase)
			)
		}

		return contacts
	}, [query.status, query.data, searchTerm, type])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Contact
					info={info}
					fromSelect={{
						max: maxParsed
					}}
				/>
			)
		},
		[maxParsed]
	)

	const submit = useCallback(() => {
		if (!canGoBack() || selectedContacts.length === 0 || typeof id !== "string") {
			return
		}

		events.emit("selectContacts", {
			type: "response",
			data: {
				id,
				cancelled: false,
				contacts: selectedContacts
			}
		})

		back()
	}, [id, selectedContacts, canGoBack, back])

	const add = useCallback(async () => {
		try {
			await contactsService.sendRequest({})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const cancel = useCallback(() => {
		if (!canGoBack() || typeof id !== "string") {
			return
		}

		events.emit("selectContacts", {
			type: "response",
			data: {
				id,
				cancelled: true
			}
		})

		back()
	}, [id, canGoBack, back])

	const iosHint = useMemo(() => {
		if (selectedContacts.length === 0) {
			return undefined
		}

		return selectedContacts.length === 1
			? selectedContacts.at(0)
				? t("selectContacts.toolbar.selected", {
						countOrName: contactName(selectedContacts.at(0)?.email, selectedContacts.at(0)?.nickName)
				  })
				: undefined
			: t("selectContacts.toolbar.selected", {
					countOrName: selectedContacts.length
			  })
	}, [selectedContacts, t])

	const header = useMemo(() => {
		return Platform.OS === "ios" ? (
			<AdaptiveSearchHeader
				iosTitle={maxParsed === 1 ? t("selectContacts.header.selectContact") : t("selectContacts.header.selectContacts")}
				iosIsLargeTitle={false}
				iosBackButtonMenuEnabled={true}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{t("selectContacts.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		) : (
			<LargeTitleHeader
				title={maxParsed === 1 ? t("selectContacts.header.selectContact") : t("selectContacts.header.selectContacts")}
				materialPreset="inline"
				backVisible={true}
				backgroundColor={colors.card}
				rightView={() => {
					return (
						<Button
							variant="plain"
							onPress={cancel}
						>
							<Text className="text-blue-500">{t("selectContacts.header.cancel")}</Text>
						</Button>
					)
				}}
				searchBar={{
					onChangeText: setSearchTerm,
					contentTransparent: true,
					persistBlur: true
				}}
			/>
		)
	}, [cancel, colors.card, maxParsed, t])

	const ListEmptyComponent = useCallback(() => {
		return (
			<ListEmpty
				queryStatus={query.status}
				itemCount={contacts.length}
				texts={{
					error: t("selectContacts.list.error"),
					empty: t("selectContacts.list.empty"),
					emptySearch: t("selectContacts.list.emptySearch")
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
	}, [query.status, contacts.length, t])

	const ListFooterComponent = useCallback(() => {
		if (contacts.length === 0) {
			return undefined
		}

		return (
			<View className="flex flex-row items-center justify-center h-16 p-4">
				<Text className="text-sm">
					{t("selectContacts.list.footer", {
						count: contacts.length
					})}
				</Text>
			</View>
		)
	}, [contacts.length, t])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)

		try {
			await query.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			setRefreshing(false)
		}
	}, [query])

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

	const toolbarLeftView = useMemo(() => {
		return (
			<ToolbarIcon
				icon={{
					name: "plus"
				}}
				onPress={add}
			/>
		)
	}, [add])

	const toolbarRightView = useMemo(() => {
		return (
			<ToolbarCTA
				disabled={selectedContacts.length === 0}
				icon={{
					name: "check"
				}}
				onPress={submit}
			/>
		)
	}, [selectedContacts.length, submit])

	useEffect(() => {
		return () => {
			setSelectedContacts([])

			events.emit("selectContacts", {
				type: "response",
				data: {
					id: typeof id === "string" ? id : "none",
					cancelled: true
				}
			})
		}
	}, [id, setSelectedContacts])

	return (
		<RequireInternet>
			{header}
			<Container>
				<List
					variant="full-width"
					data={contacts}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					refreshing={refreshing}
					contentInsetAdjustmentBehavior="automatic"
					contentContainerClassName="pb-40 pt-2"
					ListEmptyComponent={ListEmptyComponent}
					ListFooterComponent={ListFooterComponent}
					refreshControl={refreshControl}
				/>
				<Toolbar
					iosBlurIntensity={100}
					iosHint={iosHint}
					leftView={toolbarLeftView}
					rightView={toolbarRightView}
				/>
			</Container>
		</RequireInternet>
	)
}
