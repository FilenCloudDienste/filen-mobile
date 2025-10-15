import notesService from "./notes.service"
import type { NoteType, Note, NoteTag } from "@filen/sdk/dist/types/api/v3/notes"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { promiseAllChunked } from "@/lib/utils"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import { t } from "@/lib/i18n"

export class NotesBulkService {
	public async changeNoteTypes({
		notes,
		type,
		disableLoader
	}: {
		notes: Note[]
		type: NoteType
		disableLoader?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.changeNoteType({
						note,
						disableLoader: true,
						newType: type
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleNotesPinned({
		notes,
		pinned,
		disableLoader
	}: {
		notes: Note[]
		pinned: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.toggleNotePinned({
						note,
						disableLoader: true,
						pinned
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async toggleNotesFavorite({
		notes,
		favorite,
		disableLoader
	}: {
		notes: Note[]
		favorite: boolean
		disableLoader?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.toggleNoteFavorite({
						note,
						disableLoader: true,
						favorite
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async duplicateNotes({ notes, disableLoader }: { notes: Note[]; disableLoader?: boolean }): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.duplicateNote({
						note,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async exportNotes({ notes, disableLoader }: { notes: Note[]; disableLoader?: boolean }): Promise<string[]> {
		if (notes.length === 0) {
			return []
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			return (
				await promiseAllChunked(
					notes.map(note =>
						notesService.exportNote({
							note,
							disableLoader: true,
							returnFilePath: true
						})
					)
				)
			).filter(file => file !== null)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async archiveNotes({ notes, disableLoader }: { notes: Note[]; disableLoader?: boolean }): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.archiveNote({
						note,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async trashNotes({
		notes,
		disableLoader,
		disableAlertPrompt
	}: {
		notes: Note[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.trashNotes.title"),
				message: t("notes.prompts.trashNotes.message", {
					count: notes.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.trashNote({
						note,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async restoreNotes({ notes, disableLoader }: { notes: Note[]; disableLoader?: boolean }): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.restoreNote({
						note,
						disableLoader: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async deleteNotes({
		notes,
		disableLoader,
		disableAlertPrompt
	}: {
		notes: Note[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.deleteNotes.title"),
				message: t("notes.prompts.deleteNotes.message", {
					count: notes.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.deleteNote({
						note,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async leaveNotes({
		notes,
		disableLoader,
		disableAlertPrompt
	}: {
		notes: Note[]
		disableLoader?: boolean
		disableAlertPrompt?: boolean
	}): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableAlertPrompt) {
			const alertPromptResponse = await alertPrompt({
				title: t("notes.prompts.leaveNotes.title"),
				message: t("notes.prompts.leaveNotes.message", {
					count: notes.length
				})
			})

			if (alertPromptResponse.cancelled) {
				return
			}
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.leaveNote({
						note,
						disableLoader: true,
						disableAlertPrompt: true
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async tagNotes({ notes, disableLoader, tag }: { notes: Note[]; disableLoader?: boolean; tag: NoteTag }): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.tagNote({
						note,
						disableLoader: true,
						tag
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}

	public async untagNotes({ notes, disableLoader, tag }: { notes: Note[]; disableLoader?: boolean; tag: NoteTag }): Promise<void> {
		if (notes.length === 0) {
			return
		}

		if (!disableLoader) {
			fullScreenLoadingModal.show()
		}

		try {
			await promiseAllChunked(
				notes.map(note =>
					notesService.untagNote({
						note,
						disableLoader: true,
						tag
					})
				)
			)
		} finally {
			if (!disableLoader) {
				fullScreenLoadingModal.hide()
			}
		}
	}
}

export const notesBulkService = new NotesBulkService()

export default notesBulkService
