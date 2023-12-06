import { SOCKET } from "../../constants"
// @ts-ignore
import io from "socket.io-client"
import eventListener from "../../eventListener"
import { ChatMessage, TypingType, NoteType, NoteParticipant } from "../../api"
import memoryCache from "../../memoryCache"
import storage from "../../../lib/storage"
import { getAPIKey } from "../../../lib/helpers"

export interface SocketNewEvent {
	uuid: string
	type: string
	timestamp: number
	info: {
		ip: string
		metadata: string
		userAgent: string
		uuid: string
	}
}

export interface SocketFileRename {
	uuid: string
	metadata: string
}

export interface SocketFileArchiveRestored {
	currentUUID: string
	parent: string
	uuid: string
	metadata: string
	rm: string
	timestamp: number
	chunks: number
	bucket: string
	region: string
	version: number
	favorited: 0 | 1
}

export interface SocketFileNew {
	parent: string
	uuid: string
	metadata: string
	rm: string
	timestamp: number
	chunks: number
	bucket: string
	region: string
	version: number
	favorited: 0 | 1
}

export interface SocketFileRestore {
	parent: string
	uuid: string
	metadata: string
	rm: string
	timestamp: number
	chunks: number
	bucket: string
	region: string
	version: number
	favorited: 0 | 1
}

export interface SocketFileMove {
	parent: string
	uuid: string
	metadata: string
	rm: string
	timestamp: number
	chunks: number
	bucket: string
	region: string
	version: number
	favorited: 0 | 1
}

export interface SocketFileTrash {
	uuid: string
}

export interface SocketFileArchived {
	uuid: string
}

export interface SocketFolderRename {
	name: string
	uuid: string
}

export interface SocketFolderTrash {
	parent: string
	uuid: string
}

export interface SocketFolderMove {
	name: string
	uuid: string
	parent: string
	timestamp: number
	favorited: 0 | 1
}

export interface SocketFolderSubCreated {
	name: string
	uuid: string
	parent: string
	timestamp: number
	favorited: 0 | 1
}

export interface SocketFolderRestore {
	name: string
	uuid: string
	parent: string
	timestamp: number
	favorited: 0 | 1
}

export type FolderColors = string

export interface SocketFolderColorChanged {
	uuid: string
	color: FolderColors
}

export interface SocketChatMessageNew extends ChatMessage {
	conversation: string
}

export interface SocketChatTyping {
	conversation: string
	senderAvatar: string | null
	senderEmail: string
	senderNickName: string
	senderId: number
	timestamp: number
	type: TypingType
}

export interface SocketChatConversationsNew {
	uuid: string
	metadata: string
	addedTimestamp: number
}

export interface SocketChatMessageDelete {
	uuid: string
}

export interface SocketNoteContentEdited {
	note: string
	content: string
	type: NoteType
	editorId: number
	editedTimestamp: number
}

export interface SocketNoteArchived {
	note: string
}

export interface SocketNoteDeleted {
	note: string
}

export interface SocketNoteTitleEdited {
	note: string
	title: string
}

export interface SocketNoteParticipantPermissions {
	note: string
	userId: number
	permissionsWrite: boolean
}

export interface SocketNoteRestored {
	note: string
}

export interface SocketNoteParticipantRemoved {
	note: string
	userId: number
}

export interface SocketNoteParticipantNew extends NoteParticipant {
	note: string
}

export interface SocketNoteNew {
	note: string
}

export interface SocketChatMessageEmbedDisabled {
	uuid: string
}

export interface SocketChatConversationParticipantLeft {
	uuid: string
	userId: number
}

export interface SocketChatConversationDeleted {
	uuid: string
}

export interface SocketChatMessageEdited {
	conversation: string
	uuid: string
	message: string
	editedTimestamp: number
}

export interface SocketChatConversationNameEdited {
	uuid: string
	name: string
}

export type SocketEvent =
	| {
			type: "newEvent"
			data: SocketNewEvent
	  }
	| {
			type: "fileRename"
			data: SocketFileRename
	  }
	| {
			type: "fileArchiveRestored"
			data: SocketFileArchiveRestored
	  }
	| {
			type: "fileNew"
			data: SocketFileNew
	  }
	| {
			type: "fileRestore"
			data: SocketFileRestore
	  }
	| {
			type: "fileMove"
			data: SocketFileMove
	  }
	| {
			type: "fileTrash"
			data: SocketFileTrash
	  }
	| {
			type: "fileArchived"
			data: SocketFileArchived
	  }
	| {
			type: "folderRename"
			data: SocketFolderRename
	  }
	| {
			type: "folderTrash"
			data: SocketFolderTrash
	  }
	| {
			type: "folderMove"
			data: SocketFolderMove
	  }
	| {
			type: "folderSubCreated"
			data: SocketFolderSubCreated
	  }
	| {
			type: "folderRestore"
			data: SocketFolderRestore
	  }
	| {
			type: "folderColorChanged"
			data: SocketFolderColorChanged
	  }
	| {
			type: "trashEmpty"
	  }
	| {
			type: "chatMessageNew"
			data: SocketChatMessageNew
	  }
	| {
			type: "chatTyping"
			data: SocketChatTyping
	  }
	| {
			type: "chatConversationsNew"
			data: SocketChatConversationsNew
	  }
	| {
			type: "chatMessageDelete"
			data: SocketChatMessageDelete
	  }
	| {
			type: "noteContentEdited"
			data: SocketNoteContentEdited
	  }
	| {
			type: "noteArchived"
			data: SocketNoteArchived
	  }
	| {
			type: "noteDeleted"
			data: SocketNoteDeleted
	  }
	| {
			type: "noteTitleEdited"
			data: SocketNoteTitleEdited
	  }
	| {
			type: "noteParticipantPermissions"
			data: SocketNoteParticipantPermissions
	  }
	| {
			type: "noteRestored"
			data: SocketNoteRestored
	  }
	| {
			type: "noteParticipantRemoved"
			data: SocketNoteParticipantRemoved
	  }
	| {
			type: "noteParticipantNew"
			data: SocketNoteParticipantNew
	  }
	| {
			type: "noteNew"
			data: SocketNoteNew
	  }
	| {
			type: "chatMessageEmbedDisabled"
			data: SocketChatMessageEmbedDisabled
	  }
	| {
			type: "chatConversationParticipantLeft"
			data: SocketChatConversationParticipantLeft
	  }
	| {
			type: "chatConversationDeleted"
			data: SocketChatConversationDeleted
	  }
	| {
			type: "chatMessageEdited"
			data: SocketChatMessageEdited
	  }
	| {
			type: "chatConversationNameEdited"
			data: SocketChatConversationNameEdited
	  }

const waitForLogin = () => {
	return new Promise<void>(resolve => {
		const wait = setInterval(() => {
			const loggedIn = storage.getBoolean("isLoggedIn")
			const apiKey = getAPIKey()

			if (loggedIn && typeof apiKey === "string" && apiKey.length > 0) {
				clearInterval(wait)

				resolve()
			}
		}, 1000)
	})
}

export const connect = () => {
	let PING_INTERVAL: ReturnType<typeof setInterval>
	let emitSocketAuthed: boolean = false

	const SOCKET_HANDLE = io(SOCKET, {
		path: "",
		reconnect: true,
		reconnection: true,
		transports: ["websocket"],
		upgrade: false
	})

	SOCKET_HANDLE.on("connect", async () => {
		console.log("Connected to socket")

		SOCKET_HANDLE.emit("authed", Date.now())

		PING_INTERVAL = setInterval(() => {
			SOCKET_HANDLE.emit("authed", Date.now())
		}, 15000)
	})

	SOCKET_HANDLE.on("authFailed", () => {
		console.log("Socket auth failed")
	})

	SOCKET_HANDLE.on("authed", async (authed: boolean) => {
		if (!authed) {
			await waitForLogin()

			SOCKET_HANDLE.emit("auth", {
				apiKey: getAPIKey()
			})

			emitSocketAuthed = true
		} else {
			if (emitSocketAuthed) {
				emitSocketAuthed = false

				eventListener.emit("socketAuthed")
			}
		}
	})

	SOCKET_HANDLE.on("disconnect", () => {
		clearInterval(PING_INTERVAL)

		console.log("Disconnected from socket")
	})

	SOCKET_HANDLE.on("new-event", (data: SocketNewEvent) => {
		eventListener.emit("socketEvent", {
			type: "newEvent",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-rename", (data: SocketFileRename) => {
		eventListener.emit("socketEvent", {
			type: "fileRename",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-archive-restored", (data: SocketFileArchiveRestored) => {
		eventListener.emit("socketEvent", {
			type: "fileArchiveRestored",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-new", (data: SocketFileNew) => {
		if (memoryCache.has("suppressFileNewSocketEvent:" + data.uuid)) {
			return
		}

		eventListener.emit("socketEvent", {
			type: "fileNew",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-new", (data: SocketFileNew) => {
		eventListener.emit("socketEvent", {
			type: "fileNew",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-move", (data: SocketFileMove) => {
		eventListener.emit("socketEvent", {
			type: "fileMove",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-trash", (data: SocketFileTrash) => {
		eventListener.emit("socketEvent", {
			type: "fileTrash",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("file-archived", (data: SocketFileArchived) => {
		eventListener.emit("socketEvent", {
			type: "fileArchived",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-rename", (data: SocketFolderRename) => {
		eventListener.emit("socketEvent", {
			type: "folderRename",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-trash", (data: SocketFolderTrash) => {
		eventListener.emit("socketEvent", {
			type: "folderTrash",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-move", (data: SocketFolderMove) => {
		eventListener.emit("socketEvent", {
			type: "folderMove",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-sub-created", (data: SocketFolderSubCreated) => {
		eventListener.emit("socketEvent", {
			type: "folderSubCreated",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-restore", (data: SocketFolderRestore) => {
		eventListener.emit("socketEvent", {
			type: "folderRestore",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("folder-color-changed", (data: SocketFolderColorChanged) => {
		eventListener.emit("socketEvent", {
			type: "folderColorChanged",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("trash-empty", () => {
		eventListener.emit("socketEvent", {
			type: "trashEmpty"
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatMessageNew", (data: SocketChatMessageNew) => {
		eventListener.emit("socketEvent", {
			type: "chatMessageNew",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatTyping", (data: SocketChatTyping) => {
		eventListener.emit("socketEvent", {
			type: "chatTyping",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatMessageDelete", (data: SocketChatMessageDelete) => {
		eventListener.emit("socketEvent", {
			type: "chatMessageDelete",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatMessageEmbedDisabled", (data: SocketChatMessageEmbedDisabled) => {
		eventListener.emit("socketEvent", {
			type: "chatMessageEmbedDisabled",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteContentEdited", (data: SocketNoteContentEdited) => {
		eventListener.emit("socketEvent", {
			type: "noteContentEdited",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteArchived", (data: SocketNoteArchived) => {
		eventListener.emit("socketEvent", {
			type: "noteArchived",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteDeleted", (data: SocketNoteDeleted) => {
		eventListener.emit("socketEvent", {
			type: "noteDeleted",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteTitleEdited", (data: SocketNoteTitleEdited) => {
		eventListener.emit("socketEvent", {
			type: "noteTitleEdited",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteParticipantPermissions", (data: SocketNoteParticipantPermissions) => {
		eventListener.emit("socketEvent", {
			type: "noteParticipantPermissions",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteRestored", (data: SocketNoteRestored) => {
		eventListener.emit("socketEvent", {
			type: "noteRestored",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteParticipantRemoved", (data: SocketNoteParticipantRemoved) => {
		eventListener.emit("socketEvent", {
			type: "noteParticipantRemoved",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteParticipantNew", (data: SocketNoteParticipantNew) => {
		eventListener.emit("socketEvent", {
			type: "noteParticipantNew",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("noteNew", (data: SocketNoteNew) => {
		eventListener.emit("socketEvent", {
			type: "noteNew",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatMessageEdited", (data: SocketChatMessageEdited) => {
		eventListener.emit("socketEvent", {
			type: "chatMessageEdited",
			data
		} as SocketEvent)
	})

	SOCKET_HANDLE.on("chatConversationNameEdited", (data: SocketChatConversationNameEdited) => {
		eventListener.emit("socketEvent", {
			type: "chatConversationNameEdited",
			data
		} as SocketEvent)
	})
}

connect()
