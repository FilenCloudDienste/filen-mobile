import useSDKConfig from "@/hooks/useSDKConfig"
import { useColorScheme } from "@/lib/useColorScheme"
import Ionicons from "@expo/vector-icons/Ionicons"
import { type Note, type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { useMemo } from "react"

type Props = {
	note: Note
	iconSize: number
}

type NoteIconKey = NoteType | "trash" | "archive" | "canEdit" | "canView"

const ICON_PROPS: Record<
	NoteIconKey,
	{
		name:
			| "text-outline"
			| "logo-markdown"
			| "code-outline"
			| "document-text-outline"
			| "checkbox-outline"
			| "trash-outline"
			| "archive-outline"
			| "person-outline"
			| "eye-outline"
		color?: string
	}
> = {
	// Note types
	text: {
		name: "text-outline",
		color: "#3b82f6"
	},
	md: {
		name: "logo-markdown",
		color: "#6366f1"
	},
	code: {
		name: "code-outline",
		color: "#ef4444"
	},
	rich: {
		name: "document-text-outline",
		color: "#06b6d4"
	},
	checklist: {
		name: "checkbox-outline",
		color: "#a855f7"
	},
	// Additional states
	trash: {
		name: "trash-outline",
		color: "#ef4444"
	},
	archive: {
		name: "archive-outline",
		color: "#eab308"
	},
	// Shared notes
	canEdit: {
		name: "person-outline"
	},
	canView: {
		name: "eye-outline"
	}
}

//TODO: use the same icons in both list items and menu dropdowns. i.e use material and sfSymbols create a single source of truth for note type icons and colors
/**
 * Renders the corresponding icon for a note based on its type and state.
 */
export const NoteIcon = ({ note, iconSize }: Props) => {
	const [{ userId }] = useSDKConfig()
	const { colors } = useColorScheme()

	const noteIconKey = useMemo<NoteIconKey>(() => {
		if (!note.isOwner) {
			// Not owner but can edit or view
			return note.participants.some(participant => participant.userId === userId && participant.permissionsWrite)
				? "canEdit"
				: "canView"
		}
		if (note.trash) return "trash"
		if (note.archive) return "archive"
		return note.type
	}, [note.isOwner, note.trash, note.archive, note.type, note.participants, userId])

	const { color, ...iconProps } = ICON_PROPS[noteIconKey]

	return (
		<Ionicons
			{...iconProps}
			color={color ?? colors.foreground}
			size={iconSize}
		/>
	)
}
