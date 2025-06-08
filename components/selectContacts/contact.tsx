import { useCallback, memo } from "react"
import { useSelectContactsStore } from "@/stores/selectContacts.store"
import { ListItem } from "@/components/nativewindui/List"
import { View } from "react-native"
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

export const Contact = memo(({ info, multiple, max }: { info: ListRenderItemInfo<ListItemInfo>; multiple: boolean; max: number }) => {
	const isSelected = useSelectContactsStore(
		useShallow(state => state.selectedContacts.some(contact => contact.uuid === info.item.contact.uuid))
	)
	const setSelectedContacts = useSelectContactsStore(useShallow(state => state.setSelectedContacts))

	const select = useCallback(() => {
		setSelectedContacts(prev =>
			isSelected
				? prev.filter(contact => contact.uuid !== info.item.contact.uuid)
				: multiple || prev.length === 0 || prev.length < max
				? [...prev.filter(contact => contact.uuid !== info.item.contact.uuid), info.item.contact]
				: prev
		)
	}, [info.item.contact, setSelectedContacts, isSelected, multiple, max])

	return (
		<ListItem
			{...info}
			className="overflow-hidden"
			subTitleClassName="text-sm"
			variant="full-width"
			textNumberOfLines={1}
			subTitleNumberOfLines={1}
			isFirstInSection={false}
			isLastInSection={false}
			onPress={select}
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
