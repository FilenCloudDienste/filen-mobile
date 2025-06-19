import { memo, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "../modals/fullScreenLoadingModal"
import { randomUUID } from "expo-crypto"
import useChatsQuery from "@/queries/useChatsQuery"
import alerts from "@/lib/alerts"
import { selectContacts } from "@/app/selectContacts"

export const Header = memo(({ setSearchTerm }: { setSearchTerm: React.Dispatch<React.SetStateAction<string>> }) => {
	const { colors } = useColorScheme()

	const chatsQuery = useChatsQuery({
		enabled: false
	})

	const createChat = useCallback(async () => {
		const selectContactsResponse = await selectContacts({
			type: "all",
			max: 9999
		})

		if (selectContactsResponse.cancelled) {
			return
		}

		if (selectContactsResponse.contacts.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("createChat", {
				uuid: randomUUID(),
				contacts: selectContactsResponse.contacts
			})

			await chatsQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [chatsQuery])

	return (
		<LargeTitleHeader
			title="Chats"
			backVisible={false}
			materialPreset="inline"
			searchBar={{
				contentTransparent: true,
				placeholder: "Search chats...",
				iosCancelButtonText: "Abort",
				iosHideWhenScrolling: true,
				onChangeText: setSearchTerm,
				persistBlur: true,
				materialBlurOnSubmit: false
			}}
			rightView={() => (
				<Button
					variant="plain"
					size="icon"
					onPress={createChat}
				>
					<Icon
						name="plus"
						size={24}
						color={colors.primary}
					/>
				</Button>
			)}
		/>
	)
})

Header.displayName = "Header"

export default Header
