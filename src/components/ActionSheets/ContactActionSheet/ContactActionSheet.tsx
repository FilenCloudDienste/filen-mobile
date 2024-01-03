import React, { memo, useCallback, useEffect, useState } from "react"
import { View, Platform } from "react-native"
import ActionSheet from "react-native-actions-sheet"
import useLang from "../../../lib/hooks/useLang"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { i18n } from "../../../i18n"
import { getColor } from "../../../style/colors"
import { ActionButton, hideAllActionSheets } from "../ActionSheets"
import useDarkMode from "../../../lib/hooks/useDarkMode"
import Ionicon from "@expo/vector-icons/Ionicons"
import {
	Contact,
	ContactRequest,
	BlockedContact,
	contactsBlockedAdd,
	contactsBlockedDelete,
	contactsRequestsAccept,
	contactsRequestsDeny,
	contactsRequestsOutDelete,
	contactsDelete
} from "../../../lib/api"
import {
	showFullScreenLoadingModal,
	hideFullScreenLoadingModal
} from "../../../components/Modals/FullscreenLoadingModal/FullscreenLoadingModal"
import eventListener from "../../../lib/eventListener"
import { SheetManager } from "react-native-actions-sheet"

const ContactActionSheet = memo(() => {
	const darkMode = useDarkMode()
	const insets = useSafeAreaInsets()
	const lang = useLang()
	const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined)
	const [selectedBlockedContact, setSelectedBlockedContact] = useState<BlockedContact | undefined>(undefined)
	const [selectedContactRequestIn, setSelectedContactRequestIn] = useState<ContactRequest | undefined>(undefined)
	const [selectedContactRequestOut, setSelectedContactRequestOut] = useState<ContactRequest | undefined>(undefined)

	const remove = useCallback(async () => {
		if (!selectedContact) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsDelete(selectedContact.uuid)

			eventListener.emit("contactDeleted", selectedContact.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContact])

	const block = useCallback(async () => {
		if (!selectedContact) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsBlockedAdd(selectedContact.email)

			eventListener.emit("contactBlocked", selectedContact.email)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContact])

	const removeBlock = useCallback(async () => {
		if (!selectedBlockedContact) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsBlockedDelete(selectedBlockedContact.uuid)

			eventListener.emit("contactUnblocked", selectedBlockedContact.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedBlockedContact])

	const removeRequestOut = useCallback(async () => {
		if (!selectedContactRequestOut) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsRequestsOutDelete(selectedContactRequestOut.uuid)

			eventListener.emit("removeContactRequest", selectedContactRequestOut.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContactRequestOut])

	const acceptRequestIn = useCallback(async () => {
		if (!selectedContactRequestIn) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsRequestsAccept(selectedContactRequestIn.uuid)

			eventListener.emit("removeContactRequest", selectedContactRequestIn.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContactRequestIn])

	const denyRequestIn = useCallback(async () => {
		if (!selectedContactRequestIn) {
			return
		}

		showFullScreenLoadingModal()

		await hideAllActionSheets()

		try {
			await contactsRequestsDeny(selectedContactRequestIn.uuid)

			eventListener.emit("removeContactRequest", selectedContactRequestIn.uuid)
			eventListener.emit("updateContactsList")
		} catch (e) {
			console.error(e)
		} finally {
			hideFullScreenLoadingModal()
		}
	}, [selectedContactRequestIn])

	useEffect(() => {
		const openContactActionSheetListener = eventListener.on(
			"openContactActionSheet",
			({ type, data }: { type: "contact" | "request" | "blocked" | "pending"; data: Contact | ContactRequest | BlockedContact }) => {
				if (type === "blocked") {
					setSelectedBlockedContact(data as BlockedContact)
					setSelectedContact(undefined)
					setSelectedContactRequestIn(undefined)
					setSelectedContactRequestOut(undefined)
				} else if (type === "request") {
					setSelectedBlockedContact(undefined)
					setSelectedContact(undefined)
					setSelectedContactRequestIn(data as ContactRequest)
					setSelectedContactRequestOut(undefined)
				} else if (type === "pending") {
					setSelectedBlockedContact(undefined)
					setSelectedContact(undefined)
					setSelectedContactRequestIn(undefined)
					setSelectedContactRequestOut(data as ContactRequest)
				} else {
					setSelectedBlockedContact(undefined)
					setSelectedContactRequestIn(undefined)
					setSelectedContactRequestOut(undefined)
					setSelectedContact(data as Contact)
				}

				SheetManager.show("ContactActionSheet")
			}
		)

		return () => {
			openContactActionSheetListener.remove()
		}
	}, [])

	return (
		<ActionSheet
			id="ContactActionSheet"
			gestureEnabled={true}
			containerStyle={{
				backgroundColor: getColor(darkMode, "backgroundSecondary"),
				borderTopLeftRadius: 15,
				borderTopRightRadius: 15
			}}
			indicatorStyle={{
				backgroundColor: getColor(darkMode, "backgroundTertiary")
			}}
		>
			<View
				style={{
					paddingBottom: insets.bottom + 5
				}}
			>
				{selectedContact && (
					<>
						<ActionButton
							onPress={() => remove()}
							textColor={getColor(darkMode, "red")}
							icon={
								<Ionicon
									name="remove-circle-outline"
									size={22}
									color={getColor(darkMode, "red")}
								/>
							}
							text={i18n(lang, "remove")}
						/>
						<ActionButton
							onPress={() => block()}
							textColor={getColor(darkMode, "red")}
							icon={
								<Ionicon
									name="close-circle-outline"
									size={22}
									color={getColor(darkMode, "red")}
								/>
							}
							text={i18n(lang, "block")}
						/>
					</>
				)}
				{selectedContactRequestIn && (
					<>
						<ActionButton
							onPress={() => acceptRequestIn()}
							icon="checkmark-circle-outline"
							text={i18n(lang, "accept")}
						/>
						<ActionButton
							onPress={() => denyRequestIn()}
							textColor={getColor(darkMode, "red")}
							icon={
								<Ionicon
									name="remove-circle-outline"
									size={22}
									color={getColor(darkMode, "red")}
								/>
							}
							text={i18n(lang, "deny")}
						/>
					</>
				)}
				{selectedContactRequestOut && (
					<>
						<ActionButton
							onPress={() => removeRequestOut()}
							textColor={getColor(darkMode, "red")}
							icon={
								<Ionicon
									name="remove-circle-outline"
									size={22}
									color={getColor(darkMode, "red")}
								/>
							}
							text={i18n(lang, "remove")}
						/>
					</>
				)}
				{selectedBlockedContact && (
					<>
						<ActionButton
							onPress={() => removeBlock()}
							icon="checkmark-circle-outline"
							text={i18n(lang, "unblock")}
						/>
					</>
				)}
			</View>
		</ActionSheet>
	)
})

export default ContactActionSheet
