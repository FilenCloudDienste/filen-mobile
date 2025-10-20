import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import type { ContextItem, ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import type { Note, NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import { translateMemoized } from "@/lib/i18n"
import alerts from "@/lib/alerts"
import nodeWorker from "@/lib/nodeWorker"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { useColorScheme } from "@/lib/useColorScheme"
import { Platform } from "react-native"
import useSDKConfig from "@/hooks/useSDKConfig"
import { notesQueryUpdate } from "@/queries/useNotes.query"

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
		const [{ userId }] = useSDKConfig()
		const { colors } = useColorScheme()

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (note.isOwner && participant.userId !== userId) {
				items.push(
					createContextItem({
						actionKey: participant.permissionsWrite ? "revokeWriteAccess" : "allowWriteAccess",
						title: translateMemoized("notes.participants.menu.permissionsWrite"),
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
						title: translateMemoized("notes.participants.menu.remove"),
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
		}, [participant.permissionsWrite, participant.userId, note.isOwner, userId, colors.destructive])

		const remove = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: translateMemoized("notes.prompts.removeParticipant.title"),
				message: translateMemoized("notes.prompts.removeParticipant.message")
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

				notesQueryUpdate({
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
		}, [note.uuid, participant.userId])

		const changePermissionsWrite = useCallback(
			async (permissionsWrite: boolean) => {
				fullScreenLoadingModal.show()

				try {
					await nodeWorker.proxy("changeNoteParticipantPermissions", {
						uuid: note.uuid,
						userId: participant.userId,
						permissionsWrite
					})

					notesQueryUpdate({
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
