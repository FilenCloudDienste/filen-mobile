import { useLocalSearchParams, Redirect } from "expo-router"
import { useMemo } from "react"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import useNotesQuery from "@/queries/useNotesQuery"
import { validate as validateUUID } from "uuid"
import HistoryComponent from "@/components/notes/history"
import RequireInternet from "@/components/requireInternet"

export type ListItemInfo = {
	title: string
	subTitle: string
	id: string
	participant: NoteParticipant
	name: string
}

export default function History() {
	const { uuid } = useLocalSearchParams()

	const noteUUIDParsed = useMemo((): string | null => {
		try {
			return typeof uuid === "string" && validateUUID(uuid) ? uuid : null
		} catch {
			return null
		}
	}, [uuid])

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const note = useMemo((): Note | null => {
		if (!noteUUIDParsed || notesQuery.status !== "success") {
			return null
		}

		const note = notesQuery.data.find(n => n.uuid === noteUUIDParsed)

		if (!note) {
			return null
		}

		return note
	}, [notesQuery.data, noteUUIDParsed, notesQuery.status])

	if (!note) {
		return <Redirect href="/notes" />
	}

	return (
		<RequireInternet>
			<HistoryComponent note={note} />
		</RequireInternet>
	)
}
