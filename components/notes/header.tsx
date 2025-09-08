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
import { View, Platform } from "react-native"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "../nativewindui/DropdownMenu/utils"
import { type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { type DropdownItem } from "@/components/nativewindui/DropdownMenu/types"

export const Header = memo(() => {
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const { colors } = useColorScheme()
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()
	const [, setSearchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)

	const createNote = useCallback(async (type: NoteType) => {
		try {
			await notesService.createNote({
				type
			})
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

	const createNoteDropdownItems = useMemo(() => {
		return [
			createDropdownItem({
				actionKey: "createNote_text",
				title: t("notes.header.dropdown.types.text"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "note.text"
						  }
						: {
								namingScheme: "material",
								name: "note-text-outline"
						  }
			}),
			createDropdownItem({
				actionKey: "createNote_checklist",
				title: t("notes.header.dropdown.types.checklist"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "checklist"
						  }
						: {
								namingScheme: "material",
								name: "format-list-checks"
						  }
			}),
			createDropdownItem({
				actionKey: "createNote_markdown",
				title: t("notes.header.dropdown.types.markdown"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "note.text"
						  }
						: {
								namingScheme: "material",
								name: "note-text-outline"
						  }
			}),
			createDropdownItem({
				actionKey: "createNote_code",
				title: t("notes.header.dropdown.types.code"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "note.text"
						  }
						: {
								namingScheme: "material",
								name: "note-text-outline"
						  }
			}),
			createDropdownItem({
				actionKey: "createNote_rich",
				title: t("notes.header.dropdown.types.rich"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "doc"
						  }
						: {
								namingScheme: "material",
								name: "file-document-outline"
						  }
			})
		]
	}, [t])

	const onCreateNoteDropdownPress = useCallback(
		async (item: Omit<DropdownItem, "icon">) => {
			try {
				switch (item.actionKey) {
					case "createNote_markdown": {
						await createNote("md")

						break
					}

					case "createNote_checklist": {
						await createNote("checklist")

						break
					}

					case "createNote_text": {
						await createNote("text")

						break
					}

					case "createNote_code": {
						await createNote("code")

						break
					}

					case "createNote_rich": {
						await createNote("rich")

						break
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[createNote]
	)

	const headerRightView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<View className="flex-row items-center">
				<DropdownMenu
					items={createNoteDropdownItems}
					onItemPress={onCreateNoteDropdownPress}
				>
					<Button
						variant="plain"
						size="icon"
					>
						<Icon
							name="plus"
							size={24}
							color={colors.primary}
						/>
					</Button>
				</DropdownMenu>

				<HeaderDropdown />
			</View>
		)
	}, [colors.primary, hasInternet, createNoteDropdownItems, onCreateNoteDropdownPress])

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
