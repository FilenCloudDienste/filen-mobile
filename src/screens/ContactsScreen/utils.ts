import { Contact, ContactRequest, BlockedContact, contacts, contactsRequestsIn, contactsRequestsOut, contactsBlocked } from "../../lib/api"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import { dbFs } from "../../lib/db"

export interface FetchContactsResult {
	cache: boolean
	contacts: Contact[]
	requestsOut: ContactRequest[]
	requestsIn: ContactRequest[]
	blocked: BlockedContact[]
}

export const fetchContacts = async (skipCache: boolean = false): Promise<FetchContactsResult> => {
	const refresh = async (): Promise<FetchContactsResult> => {
		const result = await Promise.all([contacts(), contactsRequestsOut(), contactsRequestsIn(), contactsBlocked()])
		const obj = {
			contacts: result[0],
			requestsOut: result[1],
			requestsIn: result[2],
			blocked: result[3]
		}

		await dbFs.set("contacts", obj).catch(console.error)

		return {
			...obj,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await dbFs.get<FetchContactsResult>("contacts")

	if (cache) {
		return {
			cache: true,
			...cache
		}
	}

	return await refresh()
}

export const sortContacts = (contacts: Contact[], search: string = ""): Contact[] => {
	return contacts
		.sort((a, b) => {
			const isOnlineA = a.lastActive > Date.now() - ONLINE_TIMEOUT
			const isOnlineB = b.lastActive > Date.now() - ONLINE_TIMEOUT

			if (isOnlineA > isOnlineB) {
				return -1
			} else if (isOnlineA < isOnlineB) {
				return 1
			} else {
				return a.email.localeCompare(b.email)
			}
		})
		.filter(contact => {
			if (search.length === 0) {
				return true
			}

			if (
				contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
				contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
			) {
				return true
			}

			return false
		})
}

export const sortOnlineContacts = (contacts: Contact[]): Contact[] => {
	return contacts.filter(contact => contact.lastActive > Date.now() - ONLINE_TIMEOUT)
}

export const sortOfflineContacts = (contacts: Contact[]): Contact[] => {
	return contacts.filter(contact => contact.lastActive < Date.now() - ONLINE_TIMEOUT)
}

export const sortIncomingRequests = (requests: ContactRequest[], search: string = ""): ContactRequest[] => {
	return requests
		.sort((a, b) => a.email.localeCompare(b.email))
		.filter(contact => {
			if (search.length === 0) {
				return true
			}

			if (
				contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
				contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
			) {
				return true
			}

			return false
		})
}

export const sortOutgoingRequests = (requests: ContactRequest[], search: string = ""): ContactRequest[] => {
	return requests
		.sort((a, b) => a.email.localeCompare(b.email))
		.filter(contact => {
			if (search.length === 0) {
				return true
			}

			if (
				contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
				contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
			) {
				return true
			}

			return false
		})
}
