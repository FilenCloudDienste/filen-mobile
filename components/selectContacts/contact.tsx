import { useCallback, memo, useMemo } from "react"
import { useSelectContactsStore } from "@/stores/selectContacts.store"
import { ListItem } from "@/components/nativewindui/List"
import { View, Platform } from "react-native"
import { type Contact as ContactType } from "@filen/sdk/dist/types/api/v3/contacts"
import { Checkbox } from "@/components/nativewindui/Checkbox"
import Avatar from "../avatar"
import { useShallow } from "zustand/shallow"
import { type ListRenderItemInfo } from "@shopify/flash-list"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	contact: ContactType
}

export const Contact = memo(({ info, max }: { info: ListRenderItemInfo<ListItemInfo>; max: number }) => {
	const isSelected = useSelectContactsStore(
		useShallow(state => state.selectedContacts.some(contact => contact.uuid === info.item.contact.uuid))
	)
	const setSelectedContacts = useSelectContactsStore(useShallow(state => state.setSelectedContacts))
	const selectedContactsCount = useSelectContactsStore(useShallow(state => state.selectedContacts.length))

	const canSelect = useMemo(() => {
		if (isSelected) {
			return true
		}

		if (selectedContactsCount >= max) {
			return false
		}

		return true
	}, [max, selectedContactsCount, isSelected])

	const select = useCallback(() => {
		if (!canSelect) {
			return
		}

		setSelectedContacts(prev =>
			isSelected
				? prev.filter(c => c.uuid !== info.item.contact.uuid)
				: [...prev.filter(c => c.uuid !== info.item.contact.uuid), info.item.contact]
		)
	}, [setSelectedContacts, info.item.contact, isSelected, canSelect])

	return (
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
			innerClassName="ios:py-2.5 py-2.5 android:py-2.5"
			onPress={select}
			disabled={!canSelect}
			leftView={
				<View className="flex flex-row items-center justify-center px-4 gap-4">
					<Checkbox
						checked={isSelected}
						onCheckedChange={select}
					/>
					<Avatar
						style={{
							width: 36,
							height: 36
						}}
						source={
							info.item.contact.avatar?.startsWith("https")
								? {
										uri: info.item.contact.avatar
								  }
								: {
										uri: "avatar_fallback"
								  }
						}
					/>
				</View>
			}
		/>
	)
})

Contact.displayName = "Contact"

export default Contact
