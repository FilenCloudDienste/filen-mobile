import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextSubMenu, createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import { type ContextItem, type ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { type Note, type NoteType, type NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import { useTranslation } from "react-i18next"
import { useRouter } from "expo-router"
import { View, Platform } from "react-native"
import Content from "../content"
import useDimensions from "@/hooks/useDimensions"
import queryUtils from "@/queries/utils"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import useSDKConfig from "@/hooks/useSDKConfig"
import * as FileSystemLegacy from "expo-file-system"
import * as Sharing from "expo-sharing"
import paths from "@/lib/paths"
import * as FileSystem from "expo-file-system/next"
import * as Clipboard from "expo-clipboard"
import useNotesTagsQuery from "@/queries/useNotesTagsQuery"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { validate as validateUUID } from "uuid"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { sanitizeFileName } from "@/lib/utils"
import striptags from "striptags"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"

export const Menu = memo(
	({
		note,
		type,
		children,
		insideNote,
		markdownPreview,
		setMarkdownPreview
	}: {
		note: Note
		type: "context" | "dropdown"
		children: React.ReactNode
		insideNote: boolean
		markdownPreview: boolean
		setMarkdownPreview: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const { t } = useTranslation()
		const router = useRouter()
		const { screen, isPortrait, isTablet } = useDimensions()
		const [{ userId }] = useSDKConfig()
		const { colors } = useColorScheme()
		const { hasInternet } = useNetInfo()

		const notesTagsQuery = useNotesTagsQuery({
			enabled: false
		})

		const tags = useMemo(() => {
			if (notesTagsQuery.status !== "success") {
				return []
			}

			return notesTagsQuery.data.sort((a, b) =>
				a.name.localeCompare(b.name, "en", {
					numeric: true
				})
			)
		}, [notesTagsQuery.data, notesTagsQuery.status])

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (note.type === "md" && insideNote) {
				items.push(
					createContextItem({
						actionKey: "preview",
						title: t("notes.menu.preview"),
						state: {
							checked: markdownPreview
						},
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "eye"
								  }
								: {
										namingScheme: "material",
										name: "eye-outline"
								  }
					})
				)
			}

			if (note.isOwner && hasInternet) {
				items.push(
					createContextItem({
						actionKey: "history",
						title: t("notes.menu.history"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "clock"
								  }
								: {
										namingScheme: "material",
										name: "clock-outline"
								  }
					})
				)

				items.push(
					createContextItem({
						actionKey: "participants",
						title: t("notes.menu.participants"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "person.2"
								  }
								: {
										namingScheme: "material",
										name: "account-multiple-outline"
								  }
					})
				)

				items.push(
					createContextSubMenu(
						{
							title: t("notes.menu.type"),
							iOSItemSize: "large"
						},
						[
							createContextItem({
								actionKey: "typeText",
								title: t("notes.menu.types.text"),
								state: {
									checked: note.type === "text"
								},
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
							createContextItem({
								actionKey: "typeRich",
								title: t("notes.menu.types.rich"),
								state: {
									checked: note.type === "rich"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "doc.richtext"
										  }
										: {
												namingScheme: "material",
												name: "file-document"
										  }
							}),
							createContextItem({
								actionKey: "typeChecklist",
								title: t("notes.menu.types.checklist"),
								state: {
									checked: note.type === "checklist"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "list.bullet"
										  }
										: {
												namingScheme: "material",
												name: "format-list-checks"
										  }
							}),
							createContextItem({
								actionKey: "typeMd",
								title: t("notes.menu.types.md"),
								state: {
									checked: note.type === "md"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "doc"
										  }
										: {
												namingScheme: "material",
												name: "file-document"
										  }
							}),
							createContextItem({
								actionKey: "typeCode",
								title: t("notes.menu.types.code"),
								state: {
									checked: note.type === "code"
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "parentheses"
										  }
										: {
												namingScheme: "material",
												name: "code-json"
										  }
							})
						]
					)
				)
			}

			if (hasInternet) {
				items.push(
					createContextItem({
						actionKey: note.pinned ? "unpin" : "pin",
						title: t("notes.menu.pinned"),
						state: {
							checked: note.pinned
						},
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "pin"
								  }
								: {
										namingScheme: "material",
										name: "pin-outline"
								  }
					})
				)

				items.push(
					createContextItem({
						actionKey: note.favorite ? "unfavorite" : "favorite",
						title: t("notes.menu.favorited"),
						state: {
							checked: note.favorite
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
			}

			if (tags.length > 0 && hasInternet) {
				items.push(
					createContextSubMenu(
						{
							title: t("notes.menu.tags"),
							iOSItemSize: "large"
						},
						tags.map(tag =>
							createContextItem({
								actionKey: `tag_${tag.uuid}`,
								title: tag.name,
								state: {
									checked: note.tags.some(t => t.uuid === tag.uuid)
								},
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "tag"
										  }
										: {
												namingScheme: "material",
												name: "tag-outline"
										  }
							})
						)
					)
				)
			}

			if (note.isOwner && hasInternet) {
				items.push(
					createContextItem({
						actionKey: "rename",
						title: t("notes.menu.rename"),
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
						actionKey: "duplicate",
						title: t("notes.menu.duplicate"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "plus.app"
								  }
								: {
										namingScheme: "material",
										name: "plus-box-outline"
								  }
					})
				)
			}

			if (hasInternet) {
				items.push(
					createContextItem({
						actionKey: "export",
						title: t("notes.menu.export"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "square.and.arrow.up"
								  }
								: {
										namingScheme: "material",
										name: "send-outline"
								  }
					})
				)

				if (note.isOwner) {
					if (!note.trash && !note.archive) {
						items.push(
							createContextItem({
								actionKey: "archive",
								title: t("notes.menu.archive"),
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "archivebox"
										  }
										: {
												namingScheme: "material",
												name: "archive-outline"
										  }
							})
						)
					}

					if (note.archive || note.trash) {
						items.push(
							createContextItem({
								actionKey: "restore",
								title: t("notes.menu.restore"),
								icon:
									Platform.OS === "ios"
										? {
												namingScheme: "sfSymbol",
												name: "repeat"
										  }
										: {
												namingScheme: "material",
												name: "repeat"
										  }
							})
						)
					}

					if (note.trash) {
						items.push(
							createContextItem({
								actionKey: "delete",
								title: t("notes.menu.delete"),
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
					} else if (!note.archive) {
						items.push(
							createContextItem({
								actionKey: "trash",
								title: t("notes.menu.trash"),
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
					}
				} else {
					items.push(
						createContextItem({
							actionKey: "leave",
							title: t("notes.menu.leave"),
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
			}

			return items
		}, [note, t, tags, markdownPreview, insideNote, colors.destructive, hasInternet])

		const changeNoteType = useCallback(
			async (type: NoteType) => {
				fullScreenLoadingModal.show()

				try {
					await nodeWorker.proxy("changeNoteType", {
						uuid: note.uuid,
						newType: type
					})

					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(n =>
								n.uuid === note.uuid
									? {
											...n,
											type,
											editedTimestamp: Date.now()
									  }
									: n
							)
					})

					queryUtils.useNoteContentQuerySet({
						uuid: note.uuid,
						updater: prev => ({
							...prev,
							type,
							editedTimestamp: Date.now(),
							editorId: userId
						})
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
			[note.uuid, userId]
		)

		const pin = useCallback(
			async (pin: boolean) => {
				fullScreenLoadingModal.show()

				try {
					await nodeWorker.proxy("pinNote", {
						uuid: note.uuid,
						pin
					})

					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(n =>
								n.uuid === note.uuid
									? {
											...n,
											pinned: pin,
											editedTimestamp: Date.now()
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
			[note.uuid]
		)

		const favorite = useCallback(
			async (favorite: boolean) => {
				fullScreenLoadingModal.show()

				try {
					await nodeWorker.proxy("favoriteNote", {
						uuid: note.uuid,
						favorite
					})

					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(n =>
								n.uuid === note.uuid
									? {
											...n,
											favorite
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
			[note.uuid]
		)

		const duplicate = useCallback(async () => {
			fullScreenLoadingModal.show()

			try {
				const newUUID = await nodeWorker.proxy("duplicateNote", {
					uuid: note.uuid
				})

				queryUtils.useNotesQuerySet({
					updater: prev => [
						...prev.filter(n => n.uuid !== newUUID),
						{
							...note,
							editedTimestamp: Date.now(),
							favorite: false,
							pinned: false,
							trash: false,
							archive: false,
							participants: [],
							tags: [],
							ownerId: userId,
							isOwner: true,
							createdTimestamp: Date.now(),
							uuid: newUUID
						}
					]
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [note, userId])

		const exportNote = useCallback(async () => {
			fullScreenLoadingModal.show()

			try {
				let { content } = await nodeWorker.proxy("fetchNoteContent", {
					uuid: note.uuid
				})

				if (note.type === "rich") {
					content = striptags(content.split("<p><br></p>").join("\n"))
				}

				if (note.type === "checklist") {
					const list: string[] = []
					const ex = content
						// eslint-disable-next-line quotes
						.split('<ul data-checked="false">')
						.join("")
						// eslint-disable-next-line quotes
						.split('<ul data-checked="true">')
						.join("")
						.split("\n")
						.join("")
						.split("<li>")

					for (const listPoint of ex) {
						const listPointEx = listPoint.split("</li>")

						if (listPointEx[0] && listPointEx[0].trim().length > 0) {
							list.push(listPointEx[0].trim())
						}
					}

					content = list.join("\n")
				}

				const freeDiskSpace = await FileSystemLegacy.getFreeDiskStorageAsync()

				if (freeDiskSpace <= content.length + 1024 * 1024) {
					throw new Error(t("errors.notEnoughDiskSpace"))
				}

				const fileName = `${sanitizeFileName(note.title)}.txt`
				const tmpFile = new FileSystem.File(FileSystem.Paths.join(paths.exports(), fileName))

				try {
					if (tmpFile.exists) {
						tmpFile.delete()
					}

					tmpFile.write(content)

					await new Promise<void>(resolve => setTimeout(resolve, 250))

					fullScreenLoadingModal.hide()

					await Sharing.shareAsync(tmpFile.uri, {
						mimeType: "text/plain",
						dialogTitle: fileName
					})
				} finally {
					if (tmpFile.exists) {
						tmpFile.delete()
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()
			}
		}, [note.uuid, note.title, note.type, t])

		const copyId = useCallback(async () => {
			try {
				await Clipboard.setStringAsync(note.uuid)

				alerts.normal(t("copiedToClipboard"))
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		}, [note.uuid, t])

		const archive = useCallback(async () => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("archiveNote", {
					uuid: note.uuid
				})

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										archive: true,
										trash: false
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
		}, [note.uuid])

		const trash = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.trashNote.title"),
				message: t("notes.prompts.trashNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("trashNote", {
					uuid: note.uuid
				})

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										archive: false,
										trash: true,
										editedTimestamp: Date.now()
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
		}, [note.uuid, t])

		const restore = useCallback(async () => {
			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("restoreNote", {
					uuid: note.uuid
				})

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										archive: false,
										trash: false,
										editedTimestamp: Date.now()
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
		}, [note.uuid])

		const rename = useCallback(async () => {
			const inputPromptResponse = await inputPrompt({
				title: t("notes.prompts.renameNote.title"),
				materialIcon: {
					name: "pencil"
				},
				prompt: {
					type: "plain-text",
					keyboardType: "default",
					defaultValue: note.title,
					placeholder: t("notes.prompts.renameNote.placeholder")
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
				await nodeWorker.proxy("renameNote", {
					uuid: note.uuid,
					title
				})

				queryUtils.useNotesQuerySet({
					updater: prev =>
						prev.map(n =>
							n.uuid === note.uuid
								? {
										...n,
										title,
										editedTimestamp: Date.now()
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
		}, [note.uuid, t, note.title])

		const deleteNote = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.deleteNote.title"),
				message: t("notes.prompts.deleteNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("deleteNote", {
					uuid: note.uuid
				})

				queryUtils.useNotesQuerySet({
					updater: prev => prev.filter(n => n.uuid !== note.uuid)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()

				if (insideNote && router.canGoBack()) {
					router.back()
				}
			}
		}, [note.uuid, insideNote, router, t])

		const leave = useCallback(async () => {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.leaveNote.title"),
				message: t("notes.prompts.leaveNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}

			fullScreenLoadingModal.show()

			try {
				await nodeWorker.proxy("removeNoteParticipant", {
					uuid: note.uuid,
					userId: userId
				})

				queryUtils.useNotesQuerySet({
					updater: prev => prev.filter(n => n.uuid !== note.uuid)
				})
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			} finally {
				fullScreenLoadingModal.hide()

				if (insideNote && router.canGoBack()) {
					router.back()
				}
			}
		}, [note.uuid, insideNote, router, userId, t])

		const tagNote = useCallback(
			async (tag: NoteTag) => {
				fullScreenLoadingModal.show()

				try {
					const currentTags = note.tags.map(t => t.uuid)

					if (currentTags.includes(tag.uuid)) {
						await nodeWorker.proxy("untagNote", {
							uuid: note.uuid,
							tag: tag.uuid
						})

						queryUtils.useNotesQuerySet({
							updater: prev =>
								prev.map(n =>
									n.uuid === note.uuid
										? {
												...n,
												tags: n.tags.filter(t => t.uuid !== tag.uuid)
										  }
										: n
								)
						})

						return
					}

					await nodeWorker.proxy("tagNote", {
						uuid: note.uuid,
						tag: tag.uuid
					})

					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(n =>
								n.uuid === note.uuid
									? {
											...n,
											tags: [...n.tags.filter(t => t.uuid !== tag.uuid), tag]
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
			[note.uuid, note.tags]
		)

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "preview": {
							if (note.type !== "md") {
								break
							}

							setMarkdownPreview(!markdownPreview)

							break
						}

						case "history": {
							router.push({
								pathname: "/notes/history",
								params: {
									uuid: note.uuid
								}
							})

							break
						}

						case "participants": {
							router.push({
								pathname: "/notes/participants",
								params: {
									uuid: note.uuid
								}
							})

							break
						}

						case "typeText": {
							await changeNoteType("text")

							break
						}

						case "typeRich": {
							await changeNoteType("rich")

							break
						}

						case "typeChecklist": {
							await changeNoteType("checklist")

							break
						}

						case "typeMd": {
							await changeNoteType("md")

							break
						}

						case "typeCode": {
							await changeNoteType("code")

							break
						}

						case "pin": {
							await pin(true)

							break
						}

						case "unpin": {
							await pin(false)

							break
						}

						case "favorite": {
							await favorite(true)

							break
						}

						case "unfavorite": {
							await favorite(false)

							break
						}

						case "duplicate": {
							await duplicate()

							break
						}

						case "export": {
							await exportNote()

							break
						}

						case "copyId": {
							await copyId()

							break
						}

						case "archive": {
							await archive()

							break
						}

						case "restore": {
							await restore()

							break
						}

						case "trash": {
							await trash()

							break
						}

						case "delete": {
							await deleteNote()

							break
						}

						case "leave": {
							await leave()

							break
						}

						case "rename": {
							await rename()

							break
						}

						default: {
							if (item.actionKey.startsWith("tag_")) {
								const tagUUID = item.actionKey.split("_")[1]

								if (!tagUUID || !validateUUID(tagUUID)) {
									break
								}

								const tag = tags.find(t => t.uuid === tagUUID)

								if (!tag) {
									break
								}

								await tagNote(tag)
							}

							console.log("Unknown action key", item.actionKey)

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
			[
				note,
				router,
				changeNoteType,
				pin,
				favorite,
				duplicate,
				exportNote,
				copyId,
				archive,
				restore,
				trash,
				deleteNote,
				tagNote,
				tags,
				leave,
				markdownPreview,
				setMarkdownPreview,
				rename
			]
		)

		const noop = useCallback(() => {}, [])

		const iosRenderPreview = useCallback(() => {
			return (
				<View
					className="flex-row items-center justify-center bg-background"
					style={{
						width: Math.floor(screen.width - 32),
						height: Math.floor(screen.height / 2.5)
					}}
				>
					<Content
						note={note}
						setSyncing={noop}
						isPreview={true}
						markdownPreview={true}
					/>
				</View>
			)
		}, [note, screen, noop])

		const renderPreview = useMemo(() => {
			return hasInternet && (isPortrait || isTablet) ? iosRenderPreview : undefined
		}, [hasInternet, isPortrait, isTablet, iosRenderPreview])

		const contextKey = useMemo(() => {
			return !hasInternet ? undefined : `${isPortrait}:${isTablet}`
		}, [hasInternet, isPortrait, isTablet])

		if (menuItems.length === 0) {
			return children
		}

		if (type === "context") {
			return (
				<ContextMenu
					items={menuItems}
					onItemPress={onItemPress}
					key={contextKey}
					iosRenderPreview={renderPreview}
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
