import { memo, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import alerts from "@/lib/alerts"
import chatsService from "@/services/chats.service"
import useNetInfo from "@/hooks/useNetInfo"
import { translateMemoized } from "@/lib/i18n"

export const Header = memo(({ setSearchTerm }: { setSearchTerm: React.Dispatch<React.SetStateAction<string>> }) => {
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()

	const createChat = useCallback(async () => {
		try {
			await chatsService.createChat({})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const headerSearchBar = useMemo(() => {
		return {
			contentTransparent: true,
			placeholder: translateMemoized("chats.header.search"),
			iosHideWhenScrolling: false,
			onChangeText: setSearchTerm,
			persistBlur: true,
			materialBlurOnSubmit: false
		}
	}, [setSearchTerm])

	const headerRightView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
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
		)
	}, [hasInternet, createChat, colors.primary])

	return (
		<LargeTitleHeader
			title={translateMemoized("chats.header.title")}
			backVisible={false}
			materialPreset="inline"
			searchBar={headerSearchBar}
			rightView={headerRightView}
		/>
	)
})

Header.displayName = "Header"

export default Header
