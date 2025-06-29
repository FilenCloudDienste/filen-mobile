import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import { useTranslation } from "react-i18next"
import alerts from "@/lib/alerts"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import queryUtils from "@/queries/utils"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"
import useSDKConfig from "@/hooks/useSDKConfig"

export const Menu = memo(
	({
		note,
		type,
		children,
		participant
	}: {
		note: Note
		type: "context" | "dropdown"
		children: React.ReactNode
		participant: NoteParticipant
	}) => {
		const { t } = useTranslation()
		const [{ userId }] = useSDKConfig()
		const { colors } = useColorScheme()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (note.isOwner && participant.userId !== userId) {
				items.push(
					createContextItem({
						actionKey: participant.permissionsWrite ? "revokeWriteAccess" : "allowWriteAccess",
						title: t("notes.participants.menu.permissionsWrite"),
						state: {
							checked: participant.permissionsWrite
						},
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
						actionKey: "remove",
						title: t("notes.participants.menu.remove"),
						destructive: true,
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "delete.left",
										color: colors.destructive
								  }
								: {
										namingScheme: "material",
										name: "delete-off-outline",
										color: colors.destructive
								  }
					})
				)
			}

			return items
		}, [t, participant.permissionsWrite, participant.userId, note.isOwner, userId, colors.destructive])

		const remove = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.removeParticipant.title"),
				message: t("notes.prompts.removeParticipant.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("removeNoteParticipant", {
					uuid: note.uuid,
					userId: participant.userId
				})

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										participants: n.participants.filter(p => p.userId !== participant.userId)
								  }
								: n
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
		}, [note.uuid, participant.userId, t])

		const changePermissionsWrite = useCallback(
			async (permissionsWrite: boolean) => {
				fullScreenLoadingModal.show()

				try {
					await nodeWorker.proxy("changeNoteParticipantPermissions", {
						uuid: note.uuid,
						userId: participant.userId,
						permissionsWrite
					})

					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(n =>
								n.uuid === note.uuid
									? {
											...n,
											participants: n.participants.map(p =>
												p.userId === participant.userId
													? {
															...p,
															permissionsWrite
													  }
													: p
											)
									  }
									: n
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
			[note.uuid, participant.userId]
		)

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "revokeWriteAccess": {
							await changePermissionsWrite(false)

							break
						}

						case "allowWriteAccess": {
							await changePermissionsWrite(true)

							break
						}

						case "remove": {
							await remove()

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
			[remove, changePermissionsWrite]
		)

		if (menuItems.length === 0) {
			return children
		}

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
				>
					{children}
				</ContextMenu>
			)
		}

		return (
			<DropdownMenu
				items={menuItems}
				onItemPress={onItemPress}
			>
				{children}
			</DropdownMenu>
		)
	}
)

Menu.displayName = "Menu"

export default Menu
