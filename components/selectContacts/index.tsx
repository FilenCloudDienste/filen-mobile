import { useCallback, useState, useMemo, Fragment, useEffect, memo, useRef } from "react"
import events from "@/lib/events"
import useContactsQuery from "@/queries/useContactsQuery"
import { List, type ListDataItem, type ListRenderItemInfo, ESTIMATED_ITEM_HEIGHT } from "@/components/nativewindui/List"
import { RefreshControl, View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator"
import { useColorScheme } from "@/lib/useColorScheme"
import { AdaptiveSearchHeader } from "@/components/nativewindui/AdaptiveSearchHeader"
import { useLocalSearchParams, useRouter } from "expo-router"
import Container from "@/components/Container"
import { Toolbar, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import Contact, { type ListItemInfo } from "./contact"
import { useSelectContactsStore } from "@/stores/selectContacts.store"
import { inputPrompt } from "../prompts/inputPrompt"
import { contactName } from "@/lib/utils"
import { useShallow } from "zustand/shallow"
import useViewLayout from "@/hooks/useViewLayout"

export const SelectContacts = memo(() => {
	const { colors } = useColorScheme()
	const { id, type, max } = useLocalSearchParams()
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [searchTerm, setSearchTerm] = useState<string>("")
	const { back, canGoBack } = useRouter()
	const selectedContacts = useSelectContactsStore(useShallow(state => state.selectedContacts))
	const setSelectedContacts = useSelectContactsStore(useShallow(state => state.setSelectedContacts))
	const viewRef = useRef<View>(null)
	const { layout: listLayout, onLayout } = useViewLayout(viewRef)

	const query = useContactsQuery({
		type: typeof type === "string" ? (type as "all" | "blocked") : "all"
	})

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const contacts = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		let contacts = query.data
			.map(contact => ({
				id: contact.uuid,
				title: contactName(contact.email, contact.nickName),
				subTitle: contact.email,
				contact
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
	}, [query.isSuccess, query.data, searchTerm])

	const keyExtractor = useCallback((item: (Omit<ListDataItem, string> & { id: string }) | string): string => {
		return typeof item === "string" ? item : item.id
	}, [])

	const renderItem = useCallback(
		(info: ListRenderItemInfo<ListItemInfo>) => {
			return (
				<Contact
					info={info}
					max={maxParsed}
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
		const inputPromptResponse = await inputPrompt({
			title: "Contact email",
			materialIcon: {
				name: "email-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: ""
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const email = inputPromptResponse.text.trim()

		if (email.length === 0) {
			return
		}

		console.log({ email })
	}, [])

	const iosHint = useMemo(() => {
		if (selectedContacts.length === 0) {
			return undefined
		}

		return selectedContacts.length === 1
			? selectedContacts.at(0)
				? `${contactName(selectedContacts.at(0)?.email, selectedContacts.at(0)?.nickName)} selected`
				: undefined
			: `${selectedContacts.length} selected`
	}, [selectedContacts])

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
		<Fragment>
			<AdaptiveSearchHeader
				iosBackButtonTitle="Cancel"
				iosTitle={maxParsed === 1 ? "Select contact" : "Select contacts"}
				iosIsLargeTitle={false}
				backgroundColor={colors.card}
				searchBar={{
					iosHideWhenScrolling: false,
					onChangeText: text => setSearchTerm(text),
					contentTransparent: true,
					persistBlur: true
				}}
			/>
			<Container>
				<View
					className="flex-1"
					ref={viewRef}
					onLayout={onLayout}
				>
					<List
						variant="full-width"
						data={contacts}
						renderItem={renderItem}
						keyExtractor={keyExtractor}
						refreshing={refreshing || query.status === "pending"}
						contentInsetAdjustmentBehavior="automatic"
						contentContainerClassName="pb-40 pt-2"
						ListEmptyComponent={
							<View className="flex-1 items-center justify-center">
								{query.isSuccess ? (
									searchTerm.length > 0 ? (
										<Text>Nothing found</Text>
									) : (
										<Text>No contacts</Text>
									)
								) : (
									<ActivityIndicator color={colors.foreground} />
								)}
							</View>
						}
						estimatedListSize={
							listLayout.width > 0 && listLayout.height > 0
								? {
										width: listLayout.width,
										height: listLayout.height
								  }
								: undefined
						}
						estimatedItemSize={ESTIMATED_ITEM_HEIGHT.withSubTitle}
						drawDistance={0}
						removeClippedSubviews={true}
						disableAutoLayout={true}
						ListFooterComponent={
							<View className="flex flex-row items-center justify-center h-16 p-4">
								<Text className="text-sm">{contacts.length} contacts</Text>
							</View>
						}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={async () => {
									setRefreshing(true)

									await query.refetch().catch(() => {})

									setRefreshing(false)
								}}
							/>
						}
					/>
				</View>
				<Toolbar
					iosBlurIntensity={100}
					iosHint={iosHint}
					leftView={
						<ToolbarIcon
							icon={{
								name: "plus"
							}}
							onPress={add}
						/>
					}
					rightView={
						<ToolbarCTA
							disabled={selectedContacts.length === 0}
							icon={{
								name: "send-outline"
							}}
							onPress={submit}
						/>
					}
				/>
			</Container>
		</Fragment>
	)
})

SelectContacts.displayName = "SelectContacts"

export default SelectContacts
