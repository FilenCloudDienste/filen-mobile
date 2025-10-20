import { memo, useMemo, useCallback } from "react"
import { ContextMenu } from "@/components/nativewindui/ContextMenu"
import { createContextSubMenu, createContextItem } from "@/components/nativewindui/ContextMenu/utils"
import type { ContextItem, ContextSubMenu } from "@/components/nativewindui/ContextMenu/types"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"
import { translateMemoized } from "@/lib/i18n"
import { useRouter } from "expo-router"
import { View, Platform } from "react-native"
import Content from "../content"
import useDimensions from "@/hooks/useDimensions"
import alerts from "@/lib/alerts"
import useNotesTagsQuery from "@/queries/useNotesTags.query"
import { validate as validateUUID } from "uuid"
import { useColorScheme } from "@/lib/useColorScheme"
import useNetInfo from "@/hooks/useNetInfo"
import notesService from "@/services/notes.service"
import { useNotesStore } from "@/stores/notes.store"
import { useShallow } from "zustand/shallow"

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
		const router = useRouter()
		const { screen, isPortrait, isTablet } = useDimensions()
		const { colors } = useColorScheme()
		const { hasInternet } = useNetInfo()
		const isSelected = useNotesStore(useShallow(state => state.selectedNotes.some(n => n.uuid === note.uuid)))

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

		const isUndecryptable = useMemo(() => {
			const nameNormalized = note.title.toLowerCase().trim()

			return nameNormalized.startsWith("cannot_decrypt_") && nameNormalized.endsWith(`_${note.uuid}`)
		}, [note.title, note.uuid])

		const menuItems = useMemo(() => {
			const items: (ContextItem | ContextSubMenu)[] = []

			if (!insideNote && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "select",
						title: isSelected ? translateMemoized("notes.menu.deselect") : translateMemoized("notes.menu.select"),
						icon:
							Platform.OS === "ios"
								? {
										namingScheme: "sfSymbol",
										name: "checkmark.circle"
								  }
								: {
										namingScheme: "material",
										name: "check-circle-outline"
								  }
					})
				)
			}

			if (note.type === "md" && insideNote && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "preview",
						title: translateMemoized("notes.menu.preview"),
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

			if (note.isOwner && hasInternet && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "history",
						title: translateMemoized("notes.menu.history"),
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
						title: translateMemoized("notes.menu.participants"),
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
							title: translateMemoized("notes.menu.type"),
							iOSItemSize: "large"
						},
						[
							createContextItem({
								actionKey: "typeText",
								title: translateMemoized("notes.menu.types.text"),
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
								title: translateMemoized("notes.menu.types.rich"),
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
								title: translateMemoized("notes.menu.types.checklist"),
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
								title: translateMemoized("notes.menu.types.md"),
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
								title: translateMemoized("notes.menu.types.code"),
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

			if (hasInternet && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: note.pinned ? "unpin" : "pin",
						title: translateMemoized("notes.menu.pinned"),
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
						title: translateMemoized("notes.menu.favorited"),
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

			if (tags.length > 0 && hasInternet && !isUndecryptable) {
				items.push(
					createContextSubMenu(
						{
							title: translateMemoized("notes.menu.tags"),
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

			if (note.isOwner && hasInternet && !isUndecryptable) {
				items.push(
					createContextItem({
						actionKey: "rename",
						title: translateMemoized("notes.menu.rename"),
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
						title: translateMemoized("notes.menu.duplicate"),
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
				if (!isUndecryptable) {
					items.push(
						createContextItem({
							actionKey: "export",
							title: translateMemoized("notes.menu.export"),
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
				}

				if (note.isOwner) {
					if (!note.trash && !note.archive && !isUndecryptable) {
						items.push(
							createContextItem({
								actionKey: "archive",
								title: translateMemoized("notes.menu.archive"),
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

					if ((note.archive || note.trash) && !isUndecryptable) {
						items.push(
							createContextItem({
								actionKey: "restore",
								title: translateMemoized("notes.menu.restore"),
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
								title: translateMemoized("notes.menu.delete"),
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
								title: translateMemoized("notes.menu.trash"),
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
							title: translateMemoized("notes.menu.leave"),
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
		}, [note, tags, markdownPreview, insideNote, colors.destructive, hasInternet, isSelected, isUndecryptable])

		const select = useCallback(() => {
			const isSelected = useNotesStore.getState().selectedNotes.some(i => i.uuid === note.uuid)

			useNotesStore
				.getState()
				.setSelectedNotes(prev =>
					isSelected ? prev.filter(i => i.uuid !== note.uuid) : [...prev.filter(i => i.uuid !== note.uuid), note]
				)
		}, [note])

		const onItemPress = useCallback(
			async (item: Omit<ContextItem, "icon">, _?: boolean) => {
				try {
					switch (item.actionKey) {
						case "select": {
							select()

							break
						}

						case "preview": {
							if (note.type !== "md") {
								break
							}

							setMarkdownPreview(!markdownPreview)

							break
						}

						case "history": {
							router.push({
								pathname: "/noteHistory",
								params: {
									uuid: note.uuid
								}
							})

							break
						}

						case "participants": {
							router.push({
								pathname: "/noteParticipants",
								params: {
									uuid: note.uuid
								}
							})

							break
						}

						case "typeText": {
							await notesService.changeNoteType({
								note,
								newType: "text"
							})

							break
						}

						case "typeRich": {
							await notesService.changeNoteType({
								note,
								newType: "rich"
							})

							break
						}

						case "typeChecklist": {
							await notesService.changeNoteType({
								note,
								newType: "checklist"
							})

							break
						}

						case "typeMd": {
							await notesService.changeNoteType({
								note,
								newType: "md"
							})

							break
						}

						case "typeCode": {
							await notesService.changeNoteType({
								note,
								newType: "code"
							})

							break
						}

						case "pin": {
							await notesService.toggleNotePinned({
								note,
								pinned: true
							})

							break
						}

						case "unpin": {
							await notesService.toggleNotePinned({
								note,
								pinned: false
							})

							break
						}

						case "favorite": {
							await notesService.toggleNoteFavorite({
								note,
								favorite: true
							})

							break
						}

						case "unfavorite": {
							await notesService.toggleNoteFavorite({
								note,
								favorite: false
							})

							break
						}

						case "duplicate": {
							await notesService.duplicateNote({
								note
							})

							break
						}

						case "export": {
							await notesService.exportNote({
								note
							})

							break
						}

						case "copyId": {
							await notesService.copyNoteUUID({
								note
							})

							break
						}

						case "archive": {
							await notesService.archiveNote({
								note
							})

							break
						}

						case "restore": {
							await notesService.restoreNote({
								note
							})

							break
						}

						case "trash": {
							await notesService.trashNote({
								note
							})

							break
						}

						case "delete": {
							await notesService.deleteNote({
								note,
								insideNote
							})

							break
						}

						case "leave": {
							await notesService.leaveNote({
								note,
								insideNote
							})

							break
						}

						case "rename": {
							await notesService.renameNote({
								note
							})

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

								const currentNoteTags = note.tags.map(t => t.uuid)

								if (currentNoteTags.includes(tag.uuid)) {
									await notesService.untagNote({
										note,
										tag
									})
								} else {
									await notesService.tagNote({
										note,
										tag
									})
								}
							}

							console.error("Unknown action key", item.actionKey)

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
			[note, router, tags, markdownPreview, setMarkdownPreview, insideNote, select]
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
