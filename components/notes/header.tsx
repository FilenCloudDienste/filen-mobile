import { memo, Fragment, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownSubMenu, createDropdownItem } from "@/components/nativewindui/DropdownMenu/utils"
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

export const Header = memo(({ setSearchTerm }: { setSearchTerm: React.Dispatch<React.SetStateAction<string>> }) => {
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const createNote = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
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

	return (
		<LargeTitleHeader
			title="Notes"
			backVisible={false}
			materialPreset="inline"
			searchBar={{
				placeholder: "Search notes...",
				iosCancelButtonText: "Abort",
				iosHideWhenScrolling: true,
				onChangeText: text => setSearchTerm(text),
				materialBlurOnSubmit: false,
				persistBlur: true,
				contentTransparent: true
			}}
			leftView={selectedNotesCount > 0 ? () => <Text>{selectedNotesCount} selected</Text> : undefined}
			rightView={() => (
				<Fragment>
					{selectedNotesCount > 0 ? (
						<DropdownMenu
							items={[
								createDropdownItem({
									actionKey: "settings",
									title: "Settings"
								}),
								createDropdownSubMenu(
									{
										title: "Submenu 1",
										iOSItemSize: "large"
									},
									[
										createDropdownItem({
											actionKey: "sub-first",
											title: "Sub Item 1"
										}),
										createDropdownItem({
											actionKey: "sub-second",
											title: "Sub Item 2"
										})
									]
								)
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
			)}
		/>
	)
})

Header.displayName = "Header"

export default Header
