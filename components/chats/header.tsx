import { memo, Fragment, useCallback } from "react"
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { inputPrompt } from "../prompts/inputPrompt"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "../modals/fullScreenLoadingModal"
import { useTranslation } from "react-i18next"
import { randomUUID } from "expo-crypto"
import useChatsQuery from "@/queries/useChatsQuery"
import alerts from "@/lib/alerts"

export const Header = memo(({ setSearchTerm }: { setSearchTerm: React.Dispatch<React.SetStateAction<string>> }) => {
	const { colors } = useColorScheme()
	const { t } = useTranslation()

	const chatsQuery = useChatsQuery({
		enabled: false
	})

	const createChat = useCallback(async () => {
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

			await chatsQuery.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [t, chatsQuery])

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
				onChangeText: text => setSearchTerm(text),
				persistBlur: true,
				materialBlurOnSubmit: false
			}}
			rightView={() => (
				<Fragment>
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
				</Fragment>
			)}
		/>
	)
})

Header.displayName = "Header"

export default Header
