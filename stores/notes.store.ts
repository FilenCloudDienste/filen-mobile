import { create } from "zustand"
import type { Note } from "@filen/sdk/dist/types/api/v3/notes"

export type NotesStore = {
	selectedNotes: Note[]
	notes: Note[]
	setSelectedNotes: (fn: Note[] | ((prev: Note[]) => Note[])) => void
	setNotes: (fn: Note[] | ((prev: Note[]) => Note[])) => void
}

export const useNotesStore = create<NotesStore>(set => ({
	selectedNotes: [],
	notes: [],
	setSelectedNotes(fn) {
		set(state => ({
			selectedNotes: typeof fn === "function" ? fn(state.selectedNotes) : fn
		}))
	},
	setNotes(fn) {
		set(state => ({
			notes: typeof fn === "function" ? fn(state.notes) : fn
		}))
	}
}))
