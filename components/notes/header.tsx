import { memo, Fragment, useCallback, useMemo } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
import { Text } from "@/components/nativewindui/Text"
import { useNotesStore } from "@/stores/notes.store"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "../prompts/inputPrompt"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "../modals/fullScreenLoadingModal"
import { useTranslation } from "react-i18next"
import { randomUUID } from "expo-crypto"
import useNotesQuery from "@/queries/useNotesQuery"
import alerts from "@/lib/alerts"
import { useShallow } from "zustand/shallow"
import useNetInfo from "@/hooks/useNetInfo"

export const Header = memo(({ setSearchTerm }: { setSearchTerm: React.Dispatch<React.SetStateAction<string>> }) => {
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const { colors } = useColorScheme()
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const createNote = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("notes.prompts.createNote.title"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("notes.prompts.createNote.placeholder")
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const title = inputPromptResponse.text.trim()

		if (title.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			const uuid = randomUUID()

			await nodeWorker.proxy("createNote", {
				uuid,
				title
			})

			await notesQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [t, notesQuery])

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
		return selectedNotesCount > 0 ? () => <Text>{selectedNotesCount} selected</Text> : undefined
	}, [selectedNotesCount])

	const headerRightView = useCallback(() => {
		if (!hasInternet) {
			return undefined
		}

		return (
			<Fragment>
				{selectedNotesCount > 0 ? (
					<DropdownMenu
						items={[
							createDropdownItem({
								actionKey: "settings",
								title: "Settings"
							})
						]}
						onItemPress={item => {
							console.log(item)
						}}
					>
						<Button
							variant="plain"
							size="icon"
						>
							<Icon
								size={24}
								namingScheme="sfSymbol"
								name="ellipsis.circle"
								color={colors.foreground}
							/>
						</Button>
					</DropdownMenu>
				) : (
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
				)}
			</Fragment>
		)
	}, [createNote, colors.foreground, colors.primary, hasInternet, selectedNotesCount])

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
