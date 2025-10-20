import { memo, useMemo, useCallback } from "react"
import { DropdownMenu } from "@/components/nativewindui/DropdownMenu"
import { createDropdownItem, createDropdownSubMenu } from "@/components/nativewindui/DropdownMenu/utils"
import type { DropdownItem, DropdownSubMenu } from "../nativewindui/DropdownMenu/types"
import { Button } from "../nativewindui/Button"
import { Icon } from "@roninoss/icons"
import { useColorScheme } from "@/lib/useColorScheme"
import { translateMemoized } from "@/lib/i18n"
import alerts from "@/lib/alerts"
import useNotesQuery from "@/queries/useNotes.query"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { validate as validateUUID } from "uuid"
import { useNotesStore } from "@/stores/notes.store"
import { useShallow } from "zustand/shallow"
import { Platform } from "react-native"
import notesBulkService from "@/services/notesBulk.service"
import useNotesTagsQuery from "@/queries/useNotesTags.query"
import { sortAndFilterNotes } from "@/lib/utils"

export const HeaderDropdown = memo(() => {
	const { colors } = useColorScheme()
	const [selectedTag] = useMMKVString("notesSelectedTag", mmkvInstance)
	const [searchTerm] = useMMKVString("notesSearchTerm", mmkvInstance)
	const selectedNotesCount = useNotesStore(useShallow(state => state.selectedNotes.length))
	const selectedNotesIncludesPinnedNote = useNotesStore(useShallow(state => state.selectedNotes.some(note => note.pinned)))
	const selectedNotesIncludesFavoritedNote = useNotesStore(useShallow(state => state.selectedNotes.some(note => note.favorite)))
	const everySelectedNoteIsOwnedByUser = useNotesStore(useShallow(state => state.selectedNotes.every(note => note.isOwner)))
	const selectedNotesIncludesArchivedNote = useNotesStore(useShallow(state => state.selectedNotes.some(note => note.archive)))
	const selectedNotesIncludesTrashedNoted = useNotesStore(useShallow(state => state.selectedNotes.some(note => note.trash)))
	const everySelectedNoteIsTrashed = useNotesStore(useShallow(state => state.selectedNotes.every(note => note.trash)))
	const everySelectedNoteIsArchived = useNotesStore(useShallow(state => state.selectedNotes.every(note => note.archive)))

	const notesQuery = useNotesQuery({
		enabled: false
	})

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

	const notes = useMemo(() => {
		if (notesQuery.status !== "success") {
			return []
		}

		return sortAndFilterNotes({
			notes: notesQuery.data,
			searchTerm: searchTerm ?? "",
			selectedTag: selectedTag ?? "all"
		})
	}, [notesQuery.data, notesQuery.status, searchTerm, selectedTag])

	const dropdownItems = useMemo(() => {
		const items: (DropdownItem | DropdownSubMenu)[] = []

		if (selectedNotesCount < notes.length) {
			items.push(
				createDropdownItem({
					actionKey: "selectAll",
					title: translateMemoized("notes.header.dropdown.items.selectAll"),
					icon: {
						name: "check-circle-outline"
					}
				})
			)
		}

		if (selectedNotesCount > 0) {
			items.push(
				createDropdownItem({
					actionKey: "deselectAll",
					title: translateMemoized("notes.header.dropdown.items.deselectAll"),
					icon: {
						name: "check-circle-outline"
					}
				})
			)
		}

		if (selectedNotesCount > 0) {
			items.push(
				createDropdownSubMenu(
					{
						title: translateMemoized("notes.menu.type"),
						iOSItemSize: "large"
					},
					[
						createDropdownItem({
							actionKey: "bulkTypeText",
							title: translateMemoized("notes.menu.types.text"),
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
							actionKey: "bulkTypeRich",
							title: translateMemoized("notes.menu.types.rich"),
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
						createDropdownItem({
							actionKey: "bulkTypeChecklist",
							title: translateMemoized("notes.menu.types.checklist"),
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
						createDropdownItem({
							actionKey: "bulkTypeMd",
							title: translateMemoized("notes.menu.types.md"),
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
						createDropdownItem({
							actionKey: "bulkTypeCode",
							title: translateMemoized("notes.menu.types.code"),
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

			items.push(
				createDropdownItem({
					actionKey: selectedNotesIncludesPinnedNote ? "bulkUnpin" : "bulkPin",
					title: selectedNotesIncludesPinnedNote ? translateMemoized("notes.menu.unpin") : translateMemoized("notes.menu.pin"),
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
				createDropdownItem({
					actionKey: selectedNotesIncludesFavoritedNote ? "bulkUnfavorite" : "bulkFavorite",
					title: selectedNotesIncludesFavoritedNote
						? translateMemoized("notes.menu.unfavorite")
						: translateMemoized("notes.menu.favorite"),
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

			if (tags.length > 0) {
				items.push(
					createDropdownSubMenu(
						{
							title: translateMemoized("notes.menu.tags"),
							iOSItemSize: "large"
						},
						tags.map(tag =>
							createDropdownItem({
								actionKey: `bulkTag_${tag.uuid}`,
								title: tag.name,
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

			if (everySelectedNoteIsOwnedByUser) {
				items.push(
					createDropdownItem({
						actionKey: "bulkDuplicate",
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

			if (everySelectedNoteIsOwnedByUser) {
				if (!selectedNotesIncludesArchivedNote && !selectedNotesIncludesTrashedNoted) {
					items.push(
						createDropdownItem({
							actionKey: "bulkArchive",
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

				if (everySelectedNoteIsArchived || everySelectedNoteIsTrashed) {
					items.push(
						createDropdownItem({
							actionKey: "bulkRestore",
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

				if (everySelectedNoteIsTrashed) {
					items.push(
						createDropdownItem({
							actionKey: "bulkDelete",
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
				} else if (!everySelectedNoteIsArchived) {
					items.push(
						createDropdownItem({
							actionKey: "bulkTrash",
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
					createDropdownItem({
						actionKey: "bulkLeave",
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
	}, [
		notes.length,
		everySelectedNoteIsOwnedByUser,
		selectedNotesCount,
		selectedNotesIncludesFavoritedNote,
		selectedNotesIncludesPinnedNote,
		tags,
		selectedNotesIncludesArchivedNote,
		selectedNotesIncludesTrashedNoted,
		colors.destructive,
		everySelectedNoteIsTrashed,
		everySelectedNoteIsArchived
	])

	const onItemPress = useCallback(
		async (item: Omit<DropdownItem, "icon">, _?: boolean) => {
			if (item.actionKey === "selectAll") {
				useNotesStore.getState().setSelectedNotes(notes)

				return
			}

			if (item.actionKey === "deselectAll") {
				useNotesStore.getState().setSelectedNotes([])

				return
			}

			const selectedNotes = useNotesStore.getState().selectedNotes

			if (selectedNotes.length === 0) {
				return
			}

			useNotesStore.getState().setSelectedNotes([])

			try {
				switch (item.actionKey) {
					case "bulkTypeText": {
						await notesBulkService.changeNoteTypes({
							notes: selectedNotes,
							type: "text"
						})

						break
					}

					case "bulkTypeRich": {
						await notesBulkService.changeNoteTypes({
							notes: selectedNotes,
							type: "rich"
						})

						break
					}

					case "bulkTypeChecklist": {
						await notesBulkService.changeNoteTypes({
							notes: selectedNotes,
							type: "checklist"
						})

						break
					}

					case "bulkTypeCode": {
						await notesBulkService.changeNoteTypes({
							notes: selectedNotes,
							type: "code"
						})

						break
					}

					case "bulkTypeMd": {
						await notesBulkService.changeNoteTypes({
							notes: selectedNotes,
							type: "md"
						})

						break
					}

					case "bulkPin": {
						await notesBulkService.toggleNotesPinned({
							notes: selectedNotes,
							pinned: true
						})

						break
					}

					case "bulkUnpin": {
						await notesBulkService.toggleNotesPinned({
							notes: selectedNotes,
							pinned: false
						})

						break
					}

					case "bulkFavorite": {
						await notesBulkService.toggleNotesFavorite({
							notes: selectedNotes,
							favorite: true
						})

						break
					}

					case "bulkUnfavorite": {
						await notesBulkService.toggleNotesFavorite({
							notes: selectedNotes,
							favorite: false
						})

						break
					}

					case "bulkDuplicate": {
						await notesBulkService.duplicateNotes({
							notes: selectedNotes
						})

						break
					}

					case "bulkArchive": {
						await notesBulkService.archiveNotes({
							notes: selectedNotes
						})

						break
					}

					case "bulkLeave": {
						await notesBulkService.leaveNotes({
							notes: selectedNotes
						})

						break
					}

					case "bulkRestore": {
						await notesBulkService.restoreNotes({
							notes: selectedNotes
						})

						break
					}

					case "bulkDelete": {
						await notesBulkService.deleteNotes({
							notes: selectedNotes
						})

						break
					}

					case "bulkTrash": {
						await notesBulkService.trashNotes({
							notes: selectedNotes
						})

						break
					}

					default: {
						if (item.actionKey.startsWith("bulkTag_")) {
							const tagUUID = item.actionKey.split("_")[1]

							if (!tagUUID || !validateUUID(tagUUID)) {
								break
							}

							const tag = tags.find(t => t.uuid === tagUUID)

							if (!tag) {
								break
							}

							await notesBulkService.tagNotes({
								notes: selectedNotes,
								tag
							})

							break
						}
					}
				}
			} catch (e) {
				console.error(e)

				if (e instanceof Error) {
					alerts.error(e.message)
				}
			}
		},
		[notes, tags]
	)

	return (
		<DropdownMenu
			items={dropdownItems}
			onItemPress={onItemPress}
		>
			<Button
				variant="plain"
				size="icon"
			>
				<Icon
					size={24}
					namingScheme="sfSymbol"
					name="ellipsis"
					ios={{
						name: "ellipsis.circle"
					}}
					color={colors.primary}
				/>
			</Button>
		</DropdownMenu>
	)
})

HeaderDropdown.displayName = "HeaderDropdown"

export default HeaderDropdown
