import { memo, useEffect, useRef } from "react"
import useSocket from "@/hooks/useSocket"
import useNotesQuery from "@/queries/useNotesQuery"
import queryUtils from "@/queries/utils"
import { type Note, type NoteParticipant } from "@filen/sdk/dist/types/api/v3/notes"
import useChatsQuery from "@/queries/useChatsQuery"
import { type ChatConversation, type ChatConversationParticipant } from "@filen/sdk/dist/types/api/v3/chat/conversations"
import nodeWorker from "@/lib/nodeWorker"
import useLocationInfo from "@/hooks/useLocationInfo"
import { type ChatMessage } from "@filen/sdk/dist/types/api/v3/chat/messages"

export const SocketEvents = memo(() => {
	const { events } = useSocket()
	const { focusedChatUUID, insideMainChatsScreen } = useLocationInfo()
	const processedEventsRef = useRef<Record<string, boolean>>({})

	const notesQuery = useNotesQuery({
		enabled: false
	})

	const chatsQuery = useChatsQuery({
		enabled: false
	})

	useEffect(() => {
		const listener = events.subscribe("socketEvent", async socketEvent => {
			switch (socketEvent.type) {
				case "noteArchived": {
					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(note =>
								note.uuid === socketEvent.data.note
									? ({
											...note,
											archive: true
									  } satisfies Note)
									: note
							)
					})

					break
				}

				case "noteRestored": {
					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(note =>
								note.uuid === socketEvent.data.note
									? ({
											...note,
											archive: false,
											trash: false
									  } satisfies Note)
									: note
							)
					})

					break
				}

				case "noteDeleted": {
					queryUtils.useNotesQuerySet({
						updater: prev => prev.filter(note => note.uuid !== socketEvent.data.note)
					})

					break
				}

				case "noteTitleEdited":
				case "noteNew":
				case "noteContentEdited": {
					notesQuery.refetch().catch(console.error)

					break
				}

				case "noteParticipantNew": {
					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(note =>
								note.uuid === socketEvent.data.note
									? ({
											...note,
											participants: [
												...note.participants.filter(participant => participant.userId !== socketEvent.data.userId),
												{
													...socketEvent.data
												} satisfies NoteParticipant
											]
									  } satisfies Note)
									: note
							)
					})

					break
				}

				case "noteParticipantPermissions": {
					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(note =>
								note.uuid === socketEvent.data.note
									? ({
											...note,
											participants: note.participants.map(participant =>
												participant.userId === socketEvent.data.userId
													? ({
															...participant,
															permissionsWrite: socketEvent.data.permissionsWrite
													  } satisfies NoteParticipant)
													: participant
											)
									  } satisfies Note)
									: note
							)
					})

					break
				}

				case "noteParticipantRemoved": {
					queryUtils.useNotesQuerySet({
						updater: prev =>
							prev.map(note =>
								note.uuid === socketEvent.data.note
									? ({
											...note,
											participants: note.participants.filter(
												participant => participant.userId !== socketEvent.data.userId
											)
									  } satisfies Note)
									: note
							)
					})

					break
				}

				case "chatConversationDeleted": {
					queryUtils.useChatsQuerySet({
						updater: prev => prev.filter(chat => chat.uuid !== socketEvent.data.uuid)
					})

					break
				}

				case "chatConversationsNew":
				case "chatConversationNameEdited": {
					chatsQuery.refetch().catch(console.error)

					break
				}

				case "chatConversationParticipantLeft": {
					queryUtils.useChatsQuerySet({
						updater: prev =>
							prev.map(chat =>
								chat.uuid === socketEvent.data.uuid
									? ({
											...chat,
											participants: chat.participants.filter(
												participant => participant.userId !== socketEvent.data.userId
											)
									  } satisfies ChatConversation)
									: chat
							)
					})

					break
				}

				case "chatConversationParticipantNew": {
					queryUtils.useChatsQuerySet({
						updater: prev =>
							prev.map(chat =>
								chat.uuid === socketEvent.data.conversation
									? ({
											...chat,
											participants: [
												...chat.participants.filter(participant => participant.userId !== socketEvent.data.userId),
												{
													userId: socketEvent.data.userId,
													email: socketEvent.data.email,
													avatar: socketEvent.data.avatar ?? "",
													nickName: socketEvent.data.nickName ?? "",
													metadata: socketEvent.data.metadata,
													permissionsAdd: socketEvent.data.permissionsAdd,
													addedTimestamp: socketEvent.data.addedTimestamp
												} satisfies ChatConversationParticipant
											]
									  } satisfies ChatConversation)
									: chat
							)
					})

					break
				}

				case "chatMessageDelete": {
					if (!focusedChatUUID) {
						return
					}

					queryUtils.useChatMessagesQuerySet({
						uuid: focusedChatUUID,
						updater: prev => prev.filter(message => message.uuid !== socketEvent.data.uuid)
					})

					break
				}

				case "chatMessageEdited": {
					try {
						const decryptedMessage = await nodeWorker.proxy("decryptChatMessage", {
							conversation: socketEvent.data.conversation,
							message: socketEvent.data.message
						})

						queryUtils.useChatMessagesQuerySet({
							uuid: socketEvent.data.conversation,
							updater: prev =>
								prev.map(message =>
									message.uuid === socketEvent.data.uuid
										? ({
												...message,
												message: decryptedMessage,
												editedTimestamp: socketEvent.data.editedTimestamp,
												edited: true
										  } satisfies ChatMessage)
										: message
								)
						})
					} catch (e) {
						console.error(e)
					}

					break
				}

				case "chatMessageNew": {
					const eventKey = `${socketEvent.type}:${socketEvent.data.conversation}:${socketEvent.data.uuid}`

					if (processedEventsRef.current[eventKey]) {
						return
					}

					processedEventsRef.current[eventKey] = true

					if (!focusedChatUUID) {
						queryUtils.useChatUnreadQuerySet({
							updater: prev => prev + 1
						})
					}

					if (focusedChatUUID !== socketEvent.data.conversation) {
						queryUtils.useChatUnreadCountQuerySet({
							uuid: socketEvent.data.conversation,
							updater: prev => prev + 1
						})
					}

					try {
						const [decryptedMessage, decryptedReplyToMessage] = await Promise.all([
							nodeWorker.proxy("decryptChatMessage", {
								conversation: socketEvent.data.conversation,
								message: socketEvent.data.message
							}),
							socketEvent.data.replyTo && socketEvent.data.replyTo.uuid && socketEvent.data.replyTo.uuid.length > 0
								? nodeWorker.proxy("decryptChatMessage", {
										conversation: socketEvent.data.conversation,
										message: socketEvent.data.replyTo.message
								  })
								: Promise.resolve(null)
						])

						queryUtils.useChatMessagesQuerySet({
							uuid: socketEvent.data.conversation,
							updater: prev => [
								...prev.filter(message => message.uuid !== socketEvent.data.uuid),
								{
									conversation: socketEvent.data.conversation,
									uuid: socketEvent.data.uuid,
									senderId: socketEvent.data.senderId,
									senderEmail: socketEvent.data.senderEmail,
									senderAvatar: socketEvent.data.senderAvatar,
									senderNickName: socketEvent.data.senderNickName,
									message: decryptedMessage,
									replyTo: decryptedReplyToMessage
										? {
												...socketEvent.data.replyTo,
												message: decryptedReplyToMessage
										  }
										: socketEvent.data.replyTo,
									embedDisabled: socketEvent.data.embedDisabled,
									edited: socketEvent.data.edited,
									editedTimestamp: socketEvent.data.editedTimestamp,
									sentTimestamp: socketEvent.data.sentTimestamp
								} satisfies ChatMessage
							]
						})

						queryUtils.useChatsQuerySet({
							updater: prev =>
								prev.map(chat =>
									chat.uuid === socketEvent.data.conversation
										? ({
												...chat,
												lastMessage: decryptedMessage,
												lastMessageTimestamp: socketEvent.data.sentTimestamp,
												lastMessageSender: socketEvent.data.senderId,
												lastMessageUUID: socketEvent.data.uuid
										  } satisfies ChatConversation)
										: chat
								)
						})
					} catch (e) {
						console.error(e)
					}

					break
				}

				case "chatMessageEmbedDisabled": {
					if (!focusedChatUUID) {
						return
					}

					queryUtils.useChatMessagesQuerySet({
						uuid: focusedChatUUID,
						updater: prev =>
							prev.map(message =>
								message.uuid === socketEvent.data.uuid
									? ({
											...message,
											embedDisabled: true
									  } satisfies ChatMessage)
									: message
							)
					})

					break
				}
			}
		})

		return () => {
			listener.remove()
		}
	}, [events, notesQuery, chatsQuery, focusedChatUUID, insideMainChatsScreen])

	return null
})

SocketEvents.displayName = "SocketEvents"

export default SocketEvents
