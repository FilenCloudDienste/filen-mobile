import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Text } from "@/components/nativewindui/Text"
import { t, translateMemoized } from "@/lib/i18n"
import mmkvInstance from "@/lib/mmkv"
import { useColorScheme } from "@/lib/useColorScheme"
import { useNotesStore } from "@/stores/notes.store"
import { memo, useCallback, useMemo } from "react"
import { View } from "react-native"
import { useMMKVString } from "react-native-mmkv"
import { useShallow } from "zustand/shallow"
import { Button } from "../nativewindui/Button"
import HeaderDropdown from "./headerDropdown"
import GridViewIcon from "./icons/GridViewIcon"
import ListViewIcon from "./icons/ListViewIcon"

export type HeaderProps = {
	isGridView?: boolean
	setIsGridView?: (value: boolean) => void
}

export const Header = memo(({ isGridView, setIsGridView }: HeaderProps) => {
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const { colors } = useColorScheme()
	const [, setSearchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)

	const toggleView = useCallback(() => {
		setIsGridView?.(!isGridView)
	}, [isGridView, setIsGridView])

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
	}, [selectedNotesCount])

	const headerRightView = useCallback(() => {
		return (
			<View className="flex-row items-center">
				{setIsGridView && (
					<Button
						testID="notes.header.rightView.viewToggle"
						variant="plain"
						size="icon"
						onPress={toggleView}
					>
						{isGridView ? (
							<ListViewIcon
								size={22}
								color={colors.primary}
							/>
						) : (
							<GridViewIcon
								size={22}
								color={colors.primary}
							/>
						)}
					</Button>
				)}

				<HeaderDropdown />
			</View>
		)
	}, [colors.primary, isGridView, toggleView, setIsGridView])

	return (
		<LargeTitleHeader
			title={translateMemoized("notes.header.title")}
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
