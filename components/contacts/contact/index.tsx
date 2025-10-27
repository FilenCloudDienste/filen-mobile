import { memo, useCallback, useMemo } from "react"
import { Platform } from "react-native"
import { ListItem, type ListRenderItemInfo } from "@/components/nativewindui/List"
import type { Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import type { BlockedContact } from "@filen/sdk/dist/types/api/v3/contacts/blocked"
import type { ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"
import LeftView from "./leftView"
import Menu from "./menu"
import RightView from "./rightView"
import { useActionSheet } from "@expo/react-native-action-sheet"
import contactsService from "@/services/contacts.service"
import { useColorScheme } from "@/lib/useColorScheme"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import { useSelectContactsStore } from "@/stores/selectContacts.store"
import { useShallow } from "zustand/shallow"
import { translateMemoized } from "@/lib/i18n"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
} & (
	| {
			type: "contact"
			contact: ContactType
	  }
	| {
			type: "blocked"
			contact: BlockedContact
	  }
	| {
			type: "incomingRequest"
			request: ContactRequest
	  }
	| {
			type: "outgoingRequest"
			request: ContactRequest
	  }
)

export const Contact = memo(({ info, fromSelect }: { info: ListRenderItemInfo<ListItemInfo>; fromSelect?: { max: number } }) => {
	const { showActionSheetWithOptions } = useActionSheet()
	const {
		insets: { bottom: bottomInsets }
	} = useDimensions()
	const { colors } = useColorScheme()
	const contact = useMemo(() => (info.item.type === "contact" ? info.item.contact : null), [info.item])
	const selectedContacts = useSelectContactsStore(useShallow(state => state.selectedContacts))
	const setSelectedContacts = useSelectContactsStore(useShallow(state => state.setSelectedContacts))
	const selectedContactsCount = useSelectContactsStore(useShallow(state => state.selectedContacts.length))

	const isSelected = useMemo(() => {
		if (!contact) {
			return false
		}

		return selectedContacts.some(c => c.uuid === contact.uuid)
	}, [selectedContacts, contact])

	const canSelect = useMemo(() => {
		if (isSelected) {
			return true
		}

		if (!fromSelect || !contact || selectedContactsCount >= fromSelect.max) {
			return false
		}

		return true
	}, [fromSelect, selectedContactsCount, isSelected, contact])

	const select = useCallback(() => {
		if (!canSelect || !contact) {
			return
		}

		setSelectedContacts(prev =>
			isSelected ? prev.filter(c => c.uuid !== contact.uuid) : [...prev.filter(c => c.uuid !== contact.uuid), contact]
		)
	}, [setSelectedContacts, contact, isSelected, canSelect])

	const actionSheetOptions = useMemo(() => {
		const options =
			info.item.type === "contact"
				? [
						translateMemoized("contacts.menu.remove"),
						translateMemoized("contacts.menu.block"),
						translateMemoized("contacts.menu.cancel")
				  ]
				: info.item.type === "blocked"
				? [translateMemoized("contacts.menu.unblock"), translateMemoized("contacts.menu.cancel")]
				: info.item.type === "incomingRequest"
				? [
						translateMemoized("contacts.menu.accept"),
						translateMemoized("contacts.menu.decline"),
						translateMemoized("contacts.menu.cancel")
				  ]
				: info.item.type === "outgoingRequest"
				? [translateMemoized("contacts.menu.remove"), translateMemoized("contacts.menu.cancel")]
				: [translateMemoized("contacts.menu.cancel")]

		return {
			options,
			cancelIndex: options.length - 1,
			desctructiveIndex: [options.length - 2, options.length - 1],
			indexToType: (info.item.type === "contact"
				? {
						0: "remove",
						1: "block"
				  }
				: info.item.type === "blocked"
				? {
						0: "unblock"
				  }
				: info.item.type === "incomingRequest"
				? {
						0: "acceptRequest",
						1: "denyRequest"
				  }
				: {
						0: "deleteRequest"
				  }) as Record<number, "remove" | "block" | "unblock" | "acceptRequest" | "denyRequest" | "deleteRequest">
		}
	}, [info.item])

	const onPress = useCallback(() => {
		if (fromSelect) {
			select()

			return
		}

		showActionSheetWithOptions(
			{
				options: actionSheetOptions.options,
				cancelButtonIndex: actionSheetOptions.cancelIndex,
				destructiveButtonIndex: actionSheetOptions.desctructiveIndex,
				...(Platform.OS === "android"
					? {
							containerStyle: {
								paddingBottom: bottomInsets,
								backgroundColor: colors.card
							},
							textStyle: {
								color: colors.foreground
							}
					  }
					: {})
			},
			async (selectedIndex?: number) => {
				const type = actionSheetOptions.indexToType[selectedIndex ?? -1]

				try {
					switch (type) {
						case "remove": {
							if (info.item.type !== "contact") {
								return
							}

							await contactsService.removeContact({
								uuid: info.item.contact.uuid
							})

							break
						}

						case "block": {
							if (info.item.type !== "contact") {
								return
							}

							await contactsService.blockContact({
								email: info.item.contact.email
							})

							break
						}

						case "unblock": {
							if (info.item.type !== "blocked") {
								return
							}

							await contactsService.unblockContact({
								uuid: info.item.contact.uuid
							})

							break
						}

						case "deleteRequest": {
							if (info.item.type !== "outgoingRequest") {
								return
							}

							await contactsService.deleteRequest({
								uuid: info.item.request.uuid
							})

							break
						}

						case "denyRequest": {
							if (info.item.type !== "incomingRequest") {
								return
							}

							await contactsService.denyRequest({
								uuid: info.item.request.uuid
							})

							break
						}

						case "acceptRequest": {
							if (info.item.type !== "incomingRequest") {
								return
							}

							await contactsService.acceptRequest({
								uuid: info.item.request.uuid
							})

							break
						}
					}
				} catch (e) {
					console.error(e)

					if (e instanceof Error) {
						alerts.error(e.message)
					}
				}
			}
		)
	}, [showActionSheetWithOptions, actionSheetOptions, bottomInsets, colors.foreground, colors.card, info.item, fromSelect, select])

	const leftView = useMemo(() => {
		return (
			<LeftView
				info={info}
				fromSelect={fromSelect}
				isSelected={isSelected}
				select={select}
			/>
		)
	}, [info, fromSelect, isSelected, select])

	const rightView = useMemo(() => {
		return <RightView info={info} />
	}, [info])

	const onPressHandler = useMemo(() => {
		return Platform.OS === "ios" || fromSelect ? onPress : undefined
	}, [fromSelect, onPress])

	return (
		<Menu
			info={info}
			type="context"
		>
			<ListItem
				{...info}
				className="overflow-hidden"
				subTitleClassName="text-xs pt-1 font-normal"
				variant="full-width"
				textNumberOfLines={1}
				subTitleNumberOfLines={1}
				isFirstInSection={false}
				isLastInSection={false}
				removeSeparator={Platform.OS === "android"}
				innerClassName="ios:py-3 py-3 android:py-3"
				leftView={leftView}
				rightView={rightView}
				onPress={onPressHandler}
			/>
		</Menu>
	)
})

Contact.displayName = "Contact"

export default Contact
