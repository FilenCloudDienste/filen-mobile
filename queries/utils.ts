import queryClient from "./client"
import alerts from "@/lib/alerts"
import { type UseFileOfflineStatusQuery } from "./useFileOfflineStatusQuery"
import { type FileVersionsResponse } from "@filen/sdk/dist/types/api/v3/file/versions"
import { type Note, type NoteTag, type NoteType } from "@filen/sdk/dist/types/api/v3/notes"
import { type ChatConversation } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"
import { type ChatLastFocusValues } from "@filen/sdk/dist/types/api/v3/chat/lastFocusUpdate"
import { type Playlist } from "./usePlaylistsQuery"
import { type Contact } from "@filen/sdk/dist/types/api/v3/contacts"
import { type ContactRequest } from "@filen/sdk/dist/types/api/v3/contacts/requests/in"

export type NoteContentResult = {
	content: string
	type: NoteType
	editedTimestamp: number
	editorId: number
	preview: string
}

export class QueryUtils {
	public get<T>(queryKey: unknown[]): T | undefined {
		return queryClient.getQueryData(queryKey)
	}

	public set<T>(queryKey: unknown[], updater: T | ((prev: T) => T)) {
		try {
			return queryClient.setQueryData(
				queryKey,
				(oldData: T | undefined) => {
					if (typeof updater === "function") {
						return (updater as (prev: T | undefined) => T)(oldData)
					}

					return updater
				},
				{
					updatedAt: Date.now()
				}
			)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}

	public useCloudItemsQuerySet({
		parent,
		of,
		updater,
		receiverId
	}: FetchCloudItemsParams & {
		updater: DriveCloudItem[] | ((prev: DriveCloudItem[]) => DriveCloudItem[])
	}): void {
		this.set<DriveCloudItem[]>(["useCloudItemsQuery", parent, of, receiverId], prev => {
			const currentData = prev ?? ([] satisfies DriveCloudItem[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useFileOfflineStatusQuerySet({
		uuid,
		updater
	}: { uuid: string } & {
		updater: UseFileOfflineStatusQuery | ((prev: UseFileOfflineStatusQuery) => UseFileOfflineStatusQuery)
	}): void {
		this.set<UseFileOfflineStatusQuery>(["useFileOfflineStatusQuery", uuid], prev => {
			const currentData =
				prev ??
				({
					exists: false
				} satisfies UseFileOfflineStatusQuery)

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useFileVersionsQuerySet({
		uuid,
		updater
	}: { uuid: string } & {
		updater: FileVersionsResponse | ((prev: FileVersionsResponse) => FileVersionsResponse)
	}): void {
		this.set<FileVersionsResponse>(["useFileVersionsQuery", uuid], prev => {
			const currentData =
				prev ??
				({
					versions: []
				} satisfies FileVersionsResponse)

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useNoteContentQuerySet({
		uuid,
		updater
	}: { uuid: string } & {
		updater: NoteContentResult | ((prev: NoteContentResult) => NoteContentResult)
	}): void {
		this.set<NoteContentResult>(["useNoteContentQuery", uuid], prev => {
			const currentData =
				prev ??
				({
					content: "",
					type: "text",
					editedTimestamp: 0,
					editorId: 0,
					preview: ""
				} satisfies NoteContentResult)

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useNoteContentQueryGet({ uuid }: { uuid: string }): NoteContentResult | undefined {
		return this.get<NoteContentResult>(["useNoteContentQuery", uuid])
	}

	public useNotesQuerySet({ updater }: { updater: Note[] | ((prev: Note[]) => Note[]) }): void {
		this.set<Note[]>(["useNotesQuery"], prev => {
			const currentData = prev ?? ([] satisfies Note[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useNotesTagsQuerySet({ updater }: { updater: NoteTag[] | ((prev: NoteTag[]) => NoteTag[]) }): void {
		this.set<NoteTag[]>(["useNotesTagsQuery"], prev => {
			const currentData = prev ?? ([] satisfies NoteTag[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useChatsQuerySet({ updater }: { updater: ChatConversation[] | ((prev: ChatConversation[]) => ChatConversation[]) }): void {
		this.set<ChatConversation[]>(["useChatsQuery"], prev => {
			const currentData = prev ?? ([] satisfies ChatConversation[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useChatMessagesQuerySet({
		uuid,
		updater
	}: {
		uuid: string
		updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
	}): void {
		this.set<ChatMessage[]>(["useChatMessagesQuery", uuid], prev => {
			const currentData = prev ?? ([] satisfies ChatMessage[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useChatMessagesQueryGet({ uuid }: { uuid: string }): ChatMessage[] | undefined {
		return this.get<ChatMessage[]>(["useChatMessagesQuery", uuid])
	}

	public useChatUnreadCountQuerySet({ uuid, updater }: { uuid: string; updater: number | ((prev: number) => number) }): void {
		this.set<number>(["useChatUnreadCountQuery", uuid], prev => {
			const currentData = prev ?? 0

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useChatUnreadQuerySet({ updater }: { updater: number | ((prev: number) => number) }): void {
		this.set<number>(["useChatUnreadQuery"], prev => {
			const currentData = prev ?? 0

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useChatsLastFocusQuerySet({
		updater
	}: {
		updater: ChatLastFocusValues[] | ((prev: ChatLastFocusValues[]) => ChatLastFocusValues[])
	}): void {
		this.set<ChatLastFocusValues[]>(["useChatsLastFocusQuery"], prev => {
			const currentData = prev ?? ([] satisfies ChatLastFocusValues[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public usePlaylistsQuerySet({ updater }: { updater: Playlist[] | ((prev: Playlist[]) => Playlist[]) }): void {
		this.set<Playlist[]>(["usePlaylistsQuery"], prev => {
			const currentData = prev ?? ([] satisfies Playlist[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useContactsQuerySet({
		type,
		updater
	}: {
		type: "all" | "blocked"
		updater: Contact[] | ((prev: Contact[]) => Contact[])
	}): void {
		this.set<Contact[]>(["useContactsQuery", type], prev => {
			const currentData = prev ?? ([] satisfies Contact[])

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}

	public useContactsRequestsQuerySet({
		updater
	}: {
		updater:
			| {
					incoming: ContactRequest[]
					outgoing: ContactRequest[]
			  }
			| ((prev: { incoming: ContactRequest[]; outgoing: ContactRequest[] }) => {
					incoming: ContactRequest[]
					outgoing: ContactRequest[]
			  })
	}): void {
		this.set<{
			incoming: ContactRequest[]
			outgoing: ContactRequest[]
		}>(["useContactsRequestsQuery"], prev => {
			const currentData =
				prev ??
				({
					incoming: [],
					outgoing: []
				} satisfies {
					incoming: ContactRequest[]
					outgoing: ContactRequest[]
				})

			return typeof updater === "function" ? updater(currentData) : updater
		})
	}
}

export const queryUtils = new QueryUtils()

export default queryUtils
