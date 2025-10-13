import type { Note, NoteType, NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import nodeWorker from "@/lib/nodeWorker"
import authService from "./auth.service"
import alerts from "@/lib/alerts"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import striptags from "striptags"
import { sanitizeFileName } from "@/lib/utils"
import paths from "@/lib/paths"
import * as FileSystemLegacy from "expo-file-system/legacy"
import { t } from "@/lib/i18n"
import * as Clipboard from "expo-clipboard"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import { router } from "expo-router"
import { randomUUID } from "expo-crypto"
import pathModule from "path"
import { noteContentQueryUpdate } from "@/queries/useNoteContent.query"
import { notesQueryUpdate } from "@/queries/useNotes.query"

export class NotesService {
	public async changeNoteType({
		note,
		disableLoader,
		newType
	}: {
		note: Note
		disableLoader?: boolean
		newType: NoteType
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("changeNoteType", {
				uuid: note.uuid,
				newType
			})

			notesQueryUpdate({
				updater: prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									type: newType,
									editedTimestamp: Date.now()
							  }
							: n
					)
			})

			noteContentQueryUpdate({
				params: {
					uuid: note.uuid
				},
				updater: prev => ({
					...prev,
					type: newType,
					editedTimestamp: Date.now(),
					editorId: authService.getSDKConfig().userId
				})
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleNotePinned({
		note,
		pinned,
		disableLoader
	}: {
		note: Note
		pinned: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("pinNote", {
				uuid: note.uuid,
				pin: pinned
			})

			notesQueryUpdate({
				updater: prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									pinned: pinned,
									editedTimestamp: Date.now()
							  }
							: n
					)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleNoteFavorite({
		note,
		favorite,
		disableLoader
	}: {
		note: Note
		favorite: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("favoriteNote", {
				uuid: note.uuid,
				favorite
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async duplicateNote({ note, disableLoader }: { note: Note; disableLoader?: boolean }): Promise<string | null> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const newUUID = await nodeWorker.proxy("duplicateNote", {
				uuid: note.uuid
			})

			notesQueryUpdate({
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
						ownerId: authService.getSDKConfig().userId,
						isOwner: true,
						createdTimestamp: Date.now(),
						uuid: newUUID
					}
				]
			})

			return newUUID
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}

		return null
	}

	public async exportNote({
		note,
		disableLoader,
		returnFilePath
	}: {
		returnFilePath?: boolean
		note: Note
		disableLoader?: boolean
	}): Promise<string | null> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

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
				return null
			}

			const fileName = `${sanitizeFileName(note.title)}.txt`
			const tmpFile = new FileSystem.File(pathModule.posix.join(paths.exports(), fileName))

			try {
				if (tmpFile.exists) {
					tmpFile.delete()
				}

				tmpFile.write(content, {
					encoding: "utf8"
				})

				if (returnFilePath) {
					return tmpFile.uri
				}

				if (!disableLoader) {
					fullScreenLoadingModal.hide()
				}

				await new Promise<void>(resolve => setTimeout(resolve, 30))

				await Sharing.shareAsync(tmpFile.uri, {
					mimeType: "text/plain",
					dialogTitle: fileName
				})
			} finally {
				if (!returnFilePath && tmpFile.exists) {
					tmpFile.delete()
				}
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}

		return null
	}

	public async copyNoteUUID({
		note,
		disableLoader,
		disableAlert
	}: {
		note: Note
		disableLoader?: boolean
		disableAlert?: boolean
	}): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await Clipboard.setStringAsync(note.uuid)

			if (!disableAlert) {
				alerts.normal(t("copiedToClipboard"))
			}
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async archiveNote({ note, disableLoader }: { note: Note; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("archiveNote", {
				uuid: note.uuid
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async trashNote({
		note,
		disableLoader,
		disableAlertPrompt
	}: {
		note: Note
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.trashNote.title"),
				message: t("notes.prompts.trashNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("trashNote", {
				uuid: note.uuid
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async restoreNote({ note, disableLoader }: { note: Note; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("restoreNote", {
				uuid: note.uuid
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async renameNote({ note, newTitle, disableLoader }: { note: Note; newTitle?: string; disableLoader?: boolean }): Promise<void> {
		if (!newTitle) {
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

			newTitle = title
		}

		if (newTitle === note.title) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("renameNote", {
				uuid: note.uuid,
				title: newTitle
			})

			notesQueryUpdate({
				updater: prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									title: newTitle,
									editedTimestamp: Date.now()
							  }
							: n
					)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteNote({
		note,
		disableLoader,
		disableAlertPrompt,
		insideNote
	}: {
		note: Note
		disableLoader?: boolean
		disableAlertPrompt?: boolean
		insideNote?: boolean
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.deleteNote.title"),
				message: t("notes.prompts.deleteNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("deleteNote", {
				uuid: note.uuid
			})

			notesQueryUpdate({
				updater: prev => prev.filter(n => n.uuid !== note.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			if (insideNote && router.canGoBack()) {
				router.back()
			}
		}
	}

	public async leaveNote({
		note,
		disableLoader,
		insideNote,
		disableAlertPrompt,
		userId
	}: {
		note: Note
		disableLoader?: boolean
		insideNote?: boolean
		disableAlertPrompt?: boolean
		userId?: number
	}): Promise<void> {
		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.leaveNote.title"),
				message: t("notes.prompts.leaveNote.message")
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await nodeWorker.proxy("removeNoteParticipant", {
				uuid: note.uuid,
				userId: userId ?? authService.getSDKConfig().userId
			})

			notesQueryUpdate({
				updater: prev => prev.filter(n => n.uuid !== note.uuid)
			})
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}

			if (insideNote && router.canGoBack()) {
				router.back()
			}
		}
	}

	public async tagNote({ note, tag, disableLoader }: { note: Note; tag: NoteTag; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const currentTags = note.tags.map(t => t.uuid)

			if (currentTags.includes(tag.uuid)) {
				return
			}

			await nodeWorker.proxy("tagNote", {
				uuid: note.uuid,
				tag: tag.uuid
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async untagNote({ note, tag, disableLoader }: { note: Note; tag: NoteTag; disableLoader?: boolean }): Promise<void> {
		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const currentTags = note.tags.map(t => t.uuid)

			if (!currentTags.includes(tag.uuid)) {
				return
			}

			await nodeWorker.proxy("untagNote", {
				uuid: note.uuid,
				tag: tag.uuid
			})

			notesQueryUpdate({
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
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async createNote({
		title,
		disableLoader,
		disableNavigation,
		type
	}: {
		title?: string
		disableLoader?: boolean
		disableNavigation?: boolean
		type?: NoteType
	}): Promise<Note | null> {
		if (!title) {
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
				return null
			}

			title = inputPromptResponse.text.trim()
		}

		if (title.length === 0) {
			return null
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			const uuid = randomUUID()

			await nodeWorker.proxy("createNote", {
				uuid,
				title
			})

			if (type) {
				await nodeWorker.proxy("changeNoteType", {
					uuid,
					newType: type
				})
			}

			const notes = await nodeWorker.proxy("fetchNotes", undefined)

			notesQueryUpdate({
				updater: () => notes
			})

			if (!disableNavigation) {
				router.push({
					pathname: "/notes/[uuid]",
					params: {
						uuid
					}
				})
			}

			return notes.find(n => n.uuid === uuid) ?? null
		} finally {
			fullScreenLoadingModal.hide()
		}
	}
}

export const notesService = new NotesService()

export default notesService
