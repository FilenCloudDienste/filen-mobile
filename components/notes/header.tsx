import { memo, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Text } from "@/components/nativewindui/Text"
import { useNotesStore } from "@/stores/notes.store"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"
import notesService from "@/services/notes.service"
import HeaderDropdown from "./headerDropdown"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { View } from "react-native"

export const Header = memo(() => {
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const { colors } = useColorScheme()
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()
	const [, setSearchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)

	const createNote = useCallback(async () => {
		try {
			await notesService.createNote({})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	const headerSearchBar = useMemo(() => {
		return {
			iosHideWhenScrolling: false,
			onChangeText: setSearchTerm,
			materialBlurOnSubmit: false,
			persistBlur: true,
			contentTransparent: true
		}
	}, [setSearchTerm])

	const headerLeftView = useMemo(() => {
		return selectedNotesCount > 0
			? () => (
					<Text className="text-primary">
						{t("notes.header.selected", {
							count: selectedNotesCount
						})}
					</Text>
			  )
			: undefined
	}, [selectedNotesCount, t])

	const headerRightView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<View className="flex-row items-center">
				<Button
					variant="plain"
					size="icon"
					onPress={createNote}
				>
					<Icon
						name="plus"
						size={24}
						color={colors.primary}
					/>
				</Button>
				<HeaderDropdown />
			</View>
		)
	}, [createNote, colors.primary, hasInternet])

	return (
		<LargeTitleHeader
			title={t("notes.header.title")}
			backVisible={false}
			materialPreset="inline"
			searchBar={headerSearchBar}
			leftView={headerLeftView}
			rightView={headerRightView}
		/>
	)
})

Header.displayName = "Header"

export default Header
