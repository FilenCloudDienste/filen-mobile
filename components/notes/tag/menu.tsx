import { memo, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem } from "../../nativewindui/ContextMenu/types"
import alerts from "@/lib/alerts"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import { alertPrompt } from "../../prompts/alertPrompt"
import queryUtils from "@/queries/utils"
import { inputPrompt } from "../../prompts/inputPrompt"
import { Platform } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"

export const Menu = memo(({ tag, children }: { tag: NoteTag; children: React.ReactNode }) => {
	const { t } = useTranslation()
	const { colors } = useColorScheme()
	const { hasInternet } = useNetInfo()

	const menuItems = useMemo(() => {
		if (!hasInternet) {
			return []
		}

		const items: ContextItem[] = []

		items.push(
			createContextItem({
				actionKey: tag.favorite ? "unfavorite" : "favorite",
				title: t("notes.tags.menu.favorited"),
				state: {
					checked: tag.favorite
				},
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "heart"
						  }
						: {
								namingScheme: "material",
								name: "heart-outline"
						  }
			})
		)

		items.push(
			createContextItem({
				actionKey: "rename",
				title: t("notes.tags.menu.rename"),
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "pencil"
						  }
						: {
								namingScheme: "material",
								name: "pencil"
						  }
			})
		)

		items.push(
			createContextItem({
				actionKey: "delete",
				title: t("notes.tags.menu.delete"),
				destructive: true,
				icon:
					Platform.OS === "ios"
						? {
								namingScheme: "sfSymbol",
								name: "trash",
								color: colors.destructive
						  }
						: {
								namingScheme: "material",
								name: "trash-can-outline",
								color: colors.destructive
						  }
			})
		)

		return items
	}, [t, tag.favorite, colors.destructive, hasInternet])

	const deleteTag = useCallback(async () => {
		const alertPromptResponse = await alertPrompt({
			title: "delete",
			message: "Are u sure"
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteNoteTag", {
				uuid: tag.uuid
			})

			queryUtils.useNotesTagsQuerySet({
				updater: prev => prev.filter(t => t.uuid !== tag.uuid)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [tag.uuid])

	const favorite = useCallback(
		async (favorite: boolean) => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("favoriteNoteTag", {
					uuid: tag.uuid,
					favorite
				})

				queryUtils.useNotesTagsQuerySet({
					updater: prev =>
						prev.map(t =>
							t.uuid === tag.uuid
								? {
										...t,
										favorite
								  }
								: t
						)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		},
		[tag.uuid]
	)

	const rename = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: t("drive.header.rightView.actionSheet.create.directory"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: tag.name,
				placeholder: t("drive.header.rightView.actionSheet.directoryNamePlaceholder")
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const name = inputPromptResponse.text.trim()

		if (name.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("renameNoteTag", {
				uuid: tag.uuid,
				name
			})

			queryUtils.useNotesTagsQuerySet({
				updater: prev =>
					prev.map(t =>
						t.uuid === tag.uuid
							? {
									...t,
									name
							  }
							: t
					)
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [tag.uuid, t, tag.name])

	const onItemPress = useCallback(
		async (item: Omit<ContextItem, "icon">, _?: boolean) => {
			try {
				switch (item.actionKey) {
					case "delete":
						await deleteTag()

						break

					case "favorite":
						await favorite(true)

						break

					case "unfavorite":
						await favorite(false)

						break

					case "rename":
						await rename()

						break

					default:
						break
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[deleteTag, favorite, rename]
	)

	if (menuItems.length === 0) {
		return children
	}

	return (
		<ContextMenu
			items={menuItems}
			onItemPress={onItemPress}
		>
			{children}
		</ContextMenu>
	)
})

Menu.displayName = "Menu"

export default Menu
