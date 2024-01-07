import { getAPIServer, getAPIKey, getMasterKeys, Semaphore, convertTimestampToMs, SemaphoreInterface } from "../helpers"
import {
	decryptFolderLinkKey,
	encryptMetadata,
	decryptFileMetadata,
	decryptFolderName,
	decryptFolderNamePrivateKey,
	decryptFolderNameLink,
	decryptFileMetadataPrivateKey,
	decryptFileMetadataLink
} from "../crypto"
import storage from "../storage"
import { i18n } from "../../i18n"
import { DeviceEventEmitter, Platform } from "react-native"
import { logout } from "../services/auth/logout"
import { useStore } from "../state"
import { isOnline } from "../services/isOnline"
import { Item, ICFG } from "../../types"
import axios from "axios"
import * as db from "../db"
import memoryCache from "../memoryCache"

const fetchFolderSizeSemaphores: Record<string, SemaphoreInterface> = {}

const endpointsToCache: string[] = [
	"/v3/dir/content",
	"/v3/user/baseFolder",
	"/v3/shared/in",
	"/v3/shared/out",
	"/v3/user/keyPair/info",
	"/v3/user/keyPair/update",
	"/v3/user/keyPair/set",
	"/v3/dir/size",
	"/v3/dir/size/link",
	"/v3/user/masterKeys",
	"/v3/user/account",
	"/v3/dir/present",
	"/v3/file/exists",
	"/v3/dir/exists"
]

export const getCfg = async (): Promise<ICFG> => {
	if (!(await isOnline())) {
		await new Promise<void>(resolve => {
			const wait = setInterval(async () => {
				if (await isOnline()) {
					clearInterval(wait)

					return resolve()
				}
			}, 1000)
		})
	}

	const response = await axios.get("https://cdn.filen.io/cfg.json?noCache=" + Date.now())

	if (response.status !== 200) {
		throw new Error("Could not load CFG from CDN")
	}

	return response.data
}

export const apiRequest = ({
	method,
	endpoint,
	data,
	apiKey
}: {
	method: string
	endpoint: string
	data?: any
	apiKey?: string
}): Promise<any> => {
	return new Promise(async (resolve, reject) => {
		const dbAPIKey = typeof apiKey === "string" && apiKey.length === 64 ? apiKey : getAPIKey()
		const cacheKey = "apiCache:" + method.toUpperCase() + ":" + endpoint + ":" + JSON.stringify(data)
		let maxTries = 32
		let tries = 0
		const retryTimeout = 1000

		if (endpointsToCache.includes(endpoint)) {
			maxTries = 3
		}

		if (!(await isOnline())) {
			try {
				if (await db.dbFs.has(cacheKey)) {
					resolve(await db.dbFs.get(cacheKey))

					return
				}
			} catch (e) {
				console.error(e)
			}

			reject(i18n(storage.getString("lang"), "deviceOffline"))

			return
		}

		nodeThread
			.createHashHexFromString({ name: "sha512", data: JSON.stringify(typeof data !== "undefined" ? data : {}) })
			.then(checksum => {
				const request = async () => {
					if (tries >= maxTries) {
						try {
							if (await db.dbFs.has(cacheKey)) {
								resolve(await db.dbFs.get(cacheKey))

								return
							}
						} catch (e) {
							console.error(e)
						}

						reject(i18n(storage.getString("lang"), "deviceOffline"))

						return
					}

					tries += 1

					axios({
						method: method.toLowerCase(),
						url: getAPIServer() + endpoint,
						timeout: 900000,
						data,
						headers: {
							Authorization: "Bearer " + dbAPIKey,
							Checksum: checksum
						}
					})
						.then(response => {
							if (response.status !== 200) {
								reject(new Error(response.statusText))

								return
							}

							if (typeof response.data.code === "string") {
								if (response.data.code === "api_key_not_found") {
									const navigation = useStore.getState().navigation

									if (typeof navigation !== "undefined") {
										logout({ navigation })

										return
									}
								}

								if (response.data.code === "internal_error") {
									console.error(new Error(response.data.message))

									setTimeout(request, retryTimeout)

									return
								}
							}

							if (endpointsToCache.includes(endpoint)) {
								db.dbFs.set(cacheKey, response.data).catch(console.error)
							}

							resolve(response.data)
						})
						.catch(err => {
							console.error(err)

							setTimeout(request, retryTimeout)
						})
				}

				request()
			})
			.catch(reject)
	})
}

export const fileExists = async ({ name, parent }: { name: string; parent: string }): Promise<{ exists: boolean; existsUUID: string }> => {
	const nameHashed = await global.nodeThread.hashFn({ string: name.toLowerCase() })

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/exists",
		data: {
			parent,
			nameHashed
		}
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	return {
		exists: response.data.exists,
		existsUUID: response.data.uuid
	}
}

export const folderExists = async ({
	name,
	parent
}: {
	name: string
	parent: string
}): Promise<{ exists: boolean; existsUUID: string }> => {
	const nameHashed = await global.nodeThread.hashFn({ string: name.toLowerCase() })

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/exists",
		data: {
			parent,
			nameHashed
		}
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	return {
		exists: response.data.exists,
		existsUUID: response.data.uuid
	}
}

export const markUploadAsDone = async (data: {
	uuid: string
	name: string
	nameHashed: string
	size: string
	chunks: number
	mime: string
	rm: string
	metadata: string
	version: number
	uploadKey: string
}): Promise<{ chunks: number; size: number }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/upload/done",
		data
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	return response.data
}

export const getFolderContents = async ({
	uuid,
	type = "normal",
	linkUUID = undefined,
	linkHasPassword = undefined,
	linkPassword = undefined,
	linkSalt = undefined
}: {
	uuid: string
	type?: "normal" | "shared" | "linked"
	linkUUID?: string | undefined
	linkHasPassword?: boolean | undefined
	linkPassword?: string | undefined
	linkSalt?: string | undefined
}): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: type == "shared" ? "/v3/dir/download/shared" : type == "linked" ? "/v3/dir/download/link" : "/v3/dir/download",
		data:
			type == "shared"
				? {
						uuid
				  }
				: type == "linked"
				? {
						uuid: linkUUID,
						parent: uuid,
						password:
							linkHasPassword && linkSalt && linkPassword
								? linkSalt.length == 32
									? ((await global.nodeThread.deriveKeyFromPassword({
											password: linkPassword,
											salt: linkSalt,
											iterations: 200000,
											hash: "SHA-512",
											bitLength: 512,
											returnHex: true
									  })) as string)
									: await global.nodeThread.hashFn({
											string: linkPassword.length == 0 ? "empty" : linkPassword
									  })
								: await global.nodeThread.hashFn({ string: "empty" })
				  }
				: {
						uuid
				  }
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	return response.data
}

export const isSharingFolder = async (uuid: string): Promise<{ sharing: boolean; users: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/shared",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		sharing: response.data.sharing,
		users: response.data.users
	}
}

export const isPublicLinkingFolder = async (uuid: string): Promise<{ linking: boolean; links: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/linked",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		linking: response.data.link,
		links: response.data.links
	}
}

export const addItemToPublicLink = async (data: {
	uuid: string
	parent: string
	linkUUID: string
	type: string
	metadata: string
	key: string
	expiration: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/add",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const shareItem = async (data: { uuid: string; parent: string; email: string; type: string; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/share",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const isSharingItem = async (uuid: string): Promise<{ sharing: boolean; users: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		sharing: response.data.sharing,
		users: response.data.users
	}
}

export const isItemInPublicLink = async (uuid: string): Promise<{ linking: boolean; links: any }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/linked",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		linking: response.data.link,
		links: response.data.links
	}
}

export const renameItemInPublicLink = async (data: { uuid: string; linkUUID: string; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/linked/rename",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const renameSharedItem = async (data: { uuid: string; receiverId: number; metadata: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/rename",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const checkIfItemParentIsShared = ({
	type,
	parent,
	metaData
}: {
	type: string
	parent: string
	metaData: any
}): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let shareCheckDone: boolean = false
		let linkCheckDone: boolean = false
		let resolved: boolean = false
		let doneInterval: any = undefined
		const masterKeys: string[] = getMasterKeys()

		const done = () => {
			if (shareCheckDone && linkCheckDone) {
				clearInterval(doneInterval)

				if (!resolved) {
					resolved = true

					resolve(true)
				}

				return true
			}

			return false
		}

		doneInterval = setInterval(done, 100)

		isSharingFolder(parent)
			.then(data => {
				if (!data.sharing) {
					shareCheckDone = true

					return done()
				}

				const totalUsers = data.users.length

				if (type == "file") {
					let doneUsers = 0

					const doneSharing = () => {
						doneUsers += 1

						if (doneUsers >= totalUsers) {
							shareCheckDone = true

							done()
						}

						return true
					}

					for (let i = 0; i < totalUsers; i++) {
						const user = data.users[i]
						const itemMetadata = JSON.stringify({
							name: metaData.name,
							size: metaData.size,
							mime: metaData.mime,
							key: metaData.key,
							lastModified: metaData.lastModified
						})

						global.nodeThread
							.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey })
							.then(encrypted => {
								shareItem({
									uuid: metaData.uuid,
									parent,
									email: user.email,
									type,
									metadata: encrypted
								})
									.then(() => {
										return doneSharing()
									})
									.catch(err => {
										console.log(err)

										return doneSharing()
									})
							})
							.catch(err => {
								console.log(err)

								return doneSharing()
							})
					}
				} else {
					getFolderContents({ uuid: metaData.uuid })
						.then(async contents => {
							const itemsToShare = []

							itemsToShare.push({
								uuid: metaData.uuid,
								parent,
								metadata: metaData.name,
								type: "folder"
							})

							const files = contents.files
							const folders = contents.folders

							for (let i = 0; i < files.length; i++) {
								const decrypted = await decryptFileMetadata(masterKeys, files[i].metadata)

								if (typeof decrypted == "object") {
									if (typeof decrypted.name == "string") {
										if (decrypted.name.length > 0) {
											itemsToShare.push({
												uuid: files[i].uuid,
												parent: files[i].parent,
												metadata: {
													name: decrypted.name,
													size: decrypted.size,
													mime: decrypted.mime,
													key: decrypted.key,
													lastModified: decrypted.lastModified
												},
												type: "file"
											})
										}
									}
								}
							}

							for (let i = 0; i < folders.length; i++) {
								const decrypted = await decryptFolderName(masterKeys, folders[i].name)

								if (typeof decrypted == "string") {
									if (decrypted.length > 0) {
										if (folders[i].uuid !== metaData.uuid && folders[i].parent !== "base") {
											itemsToShare.push({
												uuid: folders[i].uuid,
												parent: i == 0 ? "none" : folders[i].parent,
												metadata: decrypted,
												type: "folder"
											})
										}
									}
								}
							}

							let itemsShared = 0

							const doneSharingItem = () => {
								itemsShared += 1

								if (itemsShared >= itemsToShare.length * totalUsers) {
									shareCheckDone = true

									done()
								}

								return true
							}

							for (let i = 0; i < itemsToShare.length; i++) {
								const itemToShare = itemsToShare[i]

								for (let x = 0; x < totalUsers; x++) {
									const user = data.users[x]
									let itemMetadata = ""

									if (itemToShare.type == "file") {
										itemMetadata = JSON.stringify({
											name: itemToShare.metadata.name,
											size: itemToShare.metadata.size,
											mime: itemToShare.metadata.mime,
											key: itemToShare.metadata.key,
											lastModified: itemToShare.metadata.lastModified
										})
									} else {
										itemMetadata = JSON.stringify({
											name: itemToShare.metadata
										})
									}

									global.nodeThread
										.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey })
										.then(encrypted => {
											shareItem({
												uuid: itemToShare.uuid,
												parent: itemToShare.parent,
												email: user.email,
												type: itemToShare.type,
												metadata: encrypted
											})
												.then(() => {
													return doneSharingItem()
												})
												.catch(err => {
													console.log(err)

													return doneSharingItem()
												})
										})
										.catch(err => {
											console.log(err)

											return doneSharingItem()
										})
								}
							}
						})
						.catch(err => {
							console.log(err)

							shareCheckDone = true

							return done()
						})
				}
			})
			.catch(err => {
				console.log(err)

				shareCheckDone = true

				return done()
			})

		isPublicLinkingFolder(parent)
			.then(async data => {
				if (!data.linking) {
					linkCheckDone = true

					return done()
				}

				const totalLinks = data.links.length

				if (type == "file") {
					let linksDone = 0

					const doneLinking = () => {
						linksDone += 1

						if (linksDone >= totalLinks) {
							linkCheckDone = true

							done()
						}

						return true
					}

					for (let i = 0; i < totalLinks; i++) {
						const link = data.links[i]
						const key = await decryptFolderLinkKey(masterKeys, link.linkKey)

						if (typeof key == "string") {
							if (key.length > 0) {
								try {
									var encrypted = await encryptMetadata(
										JSON.stringify({
											name: metaData.name,
											size: metaData.size,
											mime: metaData.mime,
											key: metaData.key,
											lastModified: metaData.lastModified
										}),
										key
									)
								} catch (e) {
									//console.log(e)
								}

								if (typeof encrypted == "string") {
									if (encrypted.length > 0) {
										addItemToPublicLink({
											uuid: metaData.uuid,
											parent,
											linkUUID: link.linkUUID,
											type,
											metadata: encrypted,
											key: link.linkKey,
											expiration: "never"
										})
											.then(() => {
												return doneLinking()
											})
											.catch(err => {
												console.log(err)

												return doneLinking()
											})
									} else {
										doneLinking()
									}
								} else {
									doneLinking()
								}
							} else {
								doneLinking()
							}
						} else {
							doneLinking()
						}
					}
				} else {
					getFolderContents({ uuid: metaData.uuid })
						.then(async contents => {
							const itemsToLink = []

							itemsToLink.push({
								uuid: metaData.uuid,
								parent,
								metadata: metaData.name,
								type: "folder"
							})

							const files = contents.files
							const folders = contents.folders

							for (let i = 0; i < files.length; i++) {
								const decrypted = await decryptFileMetadata(masterKeys, files[i].metadata)

								if (typeof decrypted == "object") {
									if (typeof decrypted.name == "string") {
										if (decrypted.name.length > 0) {
											itemsToLink.push({
												uuid: files[i].uuid,
												parent: files[i].parent,
												metadata: {
													name: decrypted.name,
													size: decrypted.size,
													mime: decrypted.mime,
													key: decrypted.key,
													lastModified: decrypted.lastModified
												},
												type: "file"
											})
										}
									}
								}
							}

							for (let i = 0; i < folders.length; i++) {
								const decrypted = await decryptFolderName(masterKeys, folders[i].name)

								if (typeof decrypted == "string") {
									if (decrypted.length > 0) {
										if (folders[i].uuid !== metaData.uuid && folders[i].parent !== "base") {
											itemsToLink.push({
												uuid: folders[i].uuid,
												parent: i == 0 ? "none" : folders[i].parent,
												metadata: decrypted,
												type: "folder"
											})
										}
									}
								}
							}

							let itemsLinked = 0

							const itemLinked = () => {
								itemsLinked += 1

								if (itemsLinked >= itemsToLink.length * totalLinks) {
									linkCheckDone = true

									done()
								}

								return true
							}

							for (let i = 0; i < itemsToLink.length; i++) {
								const itemToLink = itemsToLink[i]

								for (let x = 0; x < totalLinks; x++) {
									const link = data.links[x]
									const key = await decryptFolderLinkKey(masterKeys, link.linkKey)

									if (typeof key == "string") {
										if (key.length > 0) {
											let itemMetadata = ""

											if (itemToLink.type == "file") {
												itemMetadata = JSON.stringify({
													name: itemToLink.metadata.name,
													size: itemToLink.metadata.size,
													mime: itemToLink.metadata.mime,
													key: itemToLink.metadata.key,
													lastModified: itemToLink.metadata.lastModified
												})
											} else {
												itemMetadata = JSON.stringify({
													name: itemToLink.metadata
												})
											}

											try {
												var encrypted = await encryptMetadata(itemMetadata, key)
											} catch (e) {
												//console.log(e)
											}

											if (typeof encrypted == "string") {
												if (encrypted.length > 0) {
													addItemToPublicLink({
														uuid: itemToLink.uuid,
														parent: itemToLink.parent,
														linkUUID: link.linkUUID,
														type: itemToLink.type,
														metadata: encrypted,
														key: link.linkKey,
														expiration: "never"
													})
														.then(() => {
															return itemLinked()
														})
														.catch(err => {
															console.log(err)

															return itemLinked()
														})
												} else {
													itemLinked()
												}
											} else {
												itemLinked()
											}
										} else {
											itemLinked()
										}
									} else {
										itemLinked()
									}
								}
							}
						})
						.catch(err => {
							console.log(err)

							linkCheckDone = true

							return done()
						})
				}
			})
			.catch(err => {
				console.log(err)

				linkCheckDone = true

				return done()
			})
	})
}

export const checkIfItemIsSharedForRename = ({ type, uuid, metaData }: { type: string; uuid: string; metaData: any }): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		let shareCheckDone: boolean = false
		let linkCheckDone: boolean = false
		let resolved: boolean = false
		let doneInterval: any = undefined
		const apiKey: string = getAPIKey()
		const masterKeys: string[] = getMasterKeys()

		const done = () => {
			if (shareCheckDone && linkCheckDone) {
				clearInterval(doneInterval)

				if (!resolved) {
					resolved = true

					resolve(true)
				}

				return true
			}

			return false
		}

		doneInterval = setInterval(done, 100)

		isSharingItem(uuid)
			.then(data => {
				if (!data.sharing) {
					shareCheckDone = true

					return done()
				}

				const totalUsers = data.users.length
				let doneUsers = 0

				const doneSharing = () => {
					doneUsers += 1

					if (doneUsers >= totalUsers) {
						shareCheckDone = true

						done()
					}

					return true
				}

				for (let i = 0; i < totalUsers; i++) {
					const user = data.users[i]
					let itemMetadata = ""

					if (type == "file") {
						itemMetadata = JSON.stringify({
							name: metaData.name,
							size: metaData.size,
							mime: metaData.mime,
							key: metaData.key,
							lastModified: metaData.lastModified
						})
					} else {
						itemMetadata = JSON.stringify({
							name: metaData.name
						})
					}

					global.nodeThread
						.encryptMetadataPublicKey({ data: itemMetadata, publicKey: user.publicKey })
						.then(encrypted => {
							renameSharedItem({
								uuid,
								receiverId: user.id,
								metadata: encrypted
							})
								.then(() => {
									return doneSharing()
								})
								.catch(err => {
									console.log(err)

									return doneSharing()
								})
						})
						.catch(err => {
							console.log(err)

							return doneSharing()
						})
				}
			})
			.catch(err => {
				console.log(err)

				shareCheckDone = true

				return done()
			})

		isItemInPublicLink(uuid)
			.then(data => {
				if (!data.linking) {
					linkCheckDone = true

					return done()
				}

				const totalLinks = data.links.length
				let linksDone = 0

				const doneLinking = () => {
					linksDone += 1

					if (linksDone >= totalLinks) {
						linkCheckDone = true

						done()
					}

					return true
				}

				for (let i = 0; i < totalLinks; i++) {
					const link = data.links[i]

					decryptFolderLinkKey(masterKeys, link.linkKey)
						.then(key => {
							let itemMetadata = ""

							if (type == "file") {
								itemMetadata = JSON.stringify({
									name: metaData.name,
									size: metaData.size,
									mime: metaData.mime,
									key: metaData.key,
									lastModified: metaData.lastModified
								})
							} else {
								itemMetadata = JSON.stringify({
									name: metaData.name
								})
							}

							encryptMetadata(itemMetadata, key)
								.then(encrypted => {
									renameItemInPublicLink({
										uuid,
										linkUUID: link.linkUUID,
										metadata: encrypted
									})
										.then(() => {
											return doneLinking()
										})
										.catch(err => {
											console.log(err)

											return doneLinking()
										})
								})
								.catch(err => {
									console.log(err)

									return doneLinking()
								})
						})
						.catch(err => {
							console.log(err)

							return doneLinking()
						})
				}
			})
			.catch(err => {
				console.log(err)

				linkCheckDone = true

				return done()
			})
	})
}

export const renameFile = async (file: Item, name: string): Promise<void> => {
	const masterKeys = getMasterKeys()
	const [encrypted, encryptedName, nameHashed] = await Promise.all([
		encryptMetadata(
			JSON.stringify({
				name,
				size: file.size,
				mime: file.mime,
				key: file.key,
				lastModified: file.lastModified
			}),
			masterKeys[masterKeys.length - 1]
		),
		encryptMetadata(name, file.key),
		global.nodeThread.hashFn({ string: name.toLowerCase() })
	])

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/rename",
		data: {
			uuid: file.uuid,
			name: encryptedName,
			nameHashed,
			metadata: encrypted
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemIsSharedForRename({
		type: "file",
		uuid: file.uuid,
		metaData: {
			name,
			size: file.size,
			mime: file.mime,
			key: file.key,
			lastModified: file.lastModified
		}
	})
}

export const renameFolder = async (folder: Item, name: string): Promise<void> => {
	const masterKeys = getMasterKeys()
	const [nameHashed, encrypted] = await Promise.all([
		global.nodeThread.hashFn({ string: name.toLowerCase() }),
		encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1])
	])

	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/rename",
		data: {
			uuid: folder.uuid,
			name: encrypted,
			nameHashed
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemIsSharedForRename({
		type: "folder",
		uuid: folder.uuid,
		metaData: {
			name
		}
	})

	const folderCache = await db.get("itemCache:folder:" + folder.uuid)

	if (folderCache && typeof folderCache.name === "string") {
		await db.set("itemCache:folder:" + folder.uuid, {
			...folderCache,
			name
		})

		memoryCache.set("itemCache:folder:" + folder.uuid, {
			...folderCache,
			name
		})
	}
}

export const createFolder = async (name: string, parent: string, passedUUID?: string): Promise<string> => {
	const [nameHashed, uuid] = await Promise.all([
		global.nodeThread.hashFn({ string: name.toLowerCase() }),
		passedUUID ? Promise.resolve(passedUUID) : global.nodeThread.uuidv4()
	])
	const masterKeys = getMasterKeys()
	const encrypted = await encryptMetadata(JSON.stringify({ name }), masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/create",
		data: {
			uuid,
			name: encrypted,
			nameHashed,
			parent
		}
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	await checkIfItemParentIsShared({
		type: "folder",
		parent,
		metaData: {
			uuid,
			name
		}
	})

	return uuid
}

export const moveFile = async ({ file, parent }: { file: Item; parent: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/move",
		data: {
			uuid: file.uuid,
			to: parent
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemParentIsShared({
		type: "file",
		parent,
		metaData: {
			uuid: file.uuid,
			name: file.name,
			size: file.size,
			mime: file.mime,
			key: file.key,
			lastModified: file.lastModified
		}
	})
}

export const moveFolder = async ({ folder, parent }: { folder: Item; parent: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/move",
		data: {
			uuid: folder.uuid,
			to: parent
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	await checkIfItemParentIsShared({
		type: "folder",
		parent,
		metaData: {
			name: folder.name,
			uuid: folder.uuid
		}
	})
}

export const changeFolderColor = async (uuid: string, color: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/color",
		data: {
			uuid,
			color
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const favoriteItem = async (type: "file" | "folder", uuid: string, value: 0 | 1): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/favorite",
		data: {
			uuid,
			type,
			value
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	DeviceEventEmitter.emit("event", {
		type: "mark-item-favorite",
		data: {
			uuid,
			value: value == 1 ? true : false
		}
	})
}

export const itemPublicLinkInfo = async (item: Item): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: item.type == "file" ? "/v3/file/link/status" : "/v3/dir/link/status",
		data:
			item.type == "file"
				? {
						uuid: item.uuid
				  }
				: {
						uuid: item.uuid
				  }
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const enableItemPublicLink = (item: Item, progressCallback?: (current: number, total: number) => any): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		if (item.type == "file") {
			const linkUUID: string = await global.nodeThread.uuidv4()

			apiRequest({
				method: "POST",
				endpoint: "/v3/file/link/edit",
				data: {
					uuid: linkUUID,
					fileUUID: item.uuid,
					expiration: "never",
					password: "empty",
					passwordHashed: await global.nodeThread.hashFn({ string: "empty" }),
					salt: await global.nodeThread.generateRandomString({ charLength: 32 }),
					downloadBtn: true,
					type: "enable"
				}
			})
				.then(response => {
					if (typeof progressCallback == "function") {
						progressCallback(1, 1)
					}

					if (!response.status) {
						return reject(response.message)
					}

					return resolve(true)
				})
				.catch(reject)
		} else {
			createFolderPublicLink(item, progressCallback)
				.then(() => {
					return resolve(true)
				})
				.catch(reject)
		}
	})
}

export const disableItemPublicLink = (item: Item, linkUUID: string): Promise<void> => {
	return new Promise(async (resolve, reject) => {
		if (item.type == "file") {
			if (typeof linkUUID !== "string") {
				return reject(new Error("Invalid linkUUID"))
			}

			if (linkUUID.length < 32) {
				return reject(new Error("Invalid linkUUID"))
			}

			apiRequest({
				method: "POST",
				endpoint: "/v3/file/link/edit",
				data: {
					uuid: linkUUID,
					fileUUID: item.uuid,
					expiration: "never",
					password: "empty",
					passwordHashed: await global.nodeThread.hashFn({ string: "empty" }),
					salt: await global.nodeThread.generateRandomString({ charLength: 32 }),
					downloadBtn: true,
					type: "disable"
				}
			})
				.then(response => {
					if (!response.status) {
						return reject(response.message)
					}

					return resolve()
				})
				.catch(reject)
		} else {
			apiRequest({
				method: "POST",
				endpoint: "/v3/dir/link/remove",
				data: {
					uuid: item.uuid
				}
			})
				.then(response => {
					if (!response.status) {
						return reject(response.message)
					}

					return resolve()
				})
				.catch(reject)
		}
	})
}

export const addItemToFolderPublicLink = async (data: {
	uuid: string
	parent: string
	linkUUID: string
	type: string
	metadata: string
	key: string
	expiration: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/link/add",
		data
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface GetDirectoryTreeResult {
	path: string
	item: Item
}

export const getDirectoryTree = (
	uuid: string,
	type: "normal" | "shared" | "linked" = "normal",
	linkUUID: string | undefined = undefined,
	linkHasPassword: boolean | undefined = undefined,
	linkPassword: string | undefined = undefined,
	linkSalt: string | undefined = undefined,
	linkKey: string | undefined = undefined
): Promise<GetDirectoryTreeResult[]> => {
	return new Promise((resolve, reject) => {
		getFolderContents({ uuid, type, linkUUID, linkHasPassword, linkPassword, linkSalt })
			.then(async content => {
				const treeItems = []
				const baseFolderUUID = content.folders[0].uuid
				const baseFolderMetadata = content.folders[0].name
				const baseFolderParent = content.folders[0].parent
				const masterKeys = getMasterKeys()
				const privateKey = storage.getString("privateKey") || ""
				const baseFolderName =
					type == "normal"
						? await decryptFolderName(masterKeys, baseFolderMetadata)
						: type == "shared"
						? await decryptFolderNamePrivateKey(privateKey, baseFolderMetadata)
						: await decryptFolderNameLink(baseFolderMetadata, linkKey as string)

				if (baseFolderParent !== "base") {
					return reject(new Error("Invalid base folder parent"))
				}

				if (baseFolderName.length <= 0) {
					return reject(new Error("Could not decrypt base folder name"))
				}

				treeItems.push({
					uuid: baseFolderUUID,
					name: baseFolderName,
					parent: "base",
					type: "folder"
				})

				const addedFolders: any = {}
				const addedFiles: any = {}

				for (let i = 0; i < content.folders.length; i++) {
					const { uuid, name: metadata, parent } = content.folders[i]

					if (uuid == baseFolderUUID) {
						continue
					}

					const name =
						type == "normal"
							? await decryptFolderName(masterKeys, metadata)
							: type == "shared"
							? await decryptFolderNamePrivateKey(privateKey, metadata)
							: await decryptFolderNameLink(metadata, linkKey as string)

					if (name.length > 0 && !addedFolders[parent + ":" + name]) {
						addedFolders[parent + ":" + name] = true

						treeItems.push({
							uuid,
							name,
							parent,
							type: "folder"
						})
					}
				}

				for (let i = 0; i < content.files.length; i++) {
					const { uuid, bucket, region, chunks, parent, metadata, version } = content.files[i]
					const decrypted =
						type == "normal"
							? await decryptFileMetadata(masterKeys, metadata)
							: type == "shared"
							? await decryptFileMetadataPrivateKey(metadata, privateKey)
							: await decryptFileMetadataLink(metadata, linkKey as string)

					if (typeof decrypted.lastModified == "number") {
						if (decrypted.lastModified <= 0) {
							decrypted.lastModified = Date.now()
						}
					} else {
						decrypted.lastModified = Date.now()
					}

					decrypted.lastModified = convertTimestampToMs(decrypted.lastModified)

					if (decrypted.name.length > 0 && !addedFiles[parent + ":" + decrypted.name]) {
						addedFiles[parent + ":" + decrypted.name] = true

						treeItems.push({
							uuid,
							region,
							bucket,
							chunks,
							parent,
							metadata: decrypted,
							version,
							type: "file"
						})
					}
				}

				const nest = (items: any, uuid: string = "base", currentPath: string = "", link: string = "parent"): any => {
					return items
						.filter((item: any) => item[link] == uuid)
						.map((item: any) => ({
							...item,
							path: item.type == "folder" ? currentPath + "/" + item.name : currentPath + "/" + item.metadata.name,
							children: nest(
								items,
								item.uuid,
								item.type == "folder" ? currentPath + "/" + item.name : currentPath + "/" + item.metadata.name,
								link
							)
						}))
				}

				const tree = nest(treeItems)
				let reading: number = 0
				const folders: any = {}
				const files: any = {}

				const iterateTree = (parent: any, callback: Function) => {
					if (parent.type == "folder") {
						folders[parent.path] = parent
					} else {
						files[parent.path] = parent
					}

					if (parent.children.length > 0) {
						for (let i = 0; i < parent.children.length; i++) {
							reading += 1

							iterateTree(parent.children[i], callback)
						}
					}

					reading -= 1

					if (reading == 0) {
						return callback()
					}
				}

				reading += 1

				iterateTree(tree[0], async () => {
					const result: GetDirectoryTreeResult[] = []

					for (const prop in folders) {
						result.push({
							path: prop.slice(1),
							item: {
								id: folders[prop].uuid,
								type: "folder",
								uuid: folders[prop].uuid,
								name: folders[prop].name,
								date: "",
								timestamp: 0,
								lastModified: 0,
								lastModifiedSort: 0,
								parent: folders[prop].parent,
								receiverId: 0,
								receiverEmail: "",
								sharerId: 0,
								sharerEmail: "",
								color: "default",
								favorited: false,
								isBase: false,
								isSync: false,
								isDefault: false,
								size: 0,
								selected: false,
								mime: "",
								key: "",
								offline: false,
								bucket: "",
								region: "",
								rm: "",
								chunks: 0,
								thumbnail: undefined,
								version: 0,
								hash: ""
							}
						})
					}

					for (const prop in files) {
						result.push({
							path: prop.slice(1),
							item: {
								id: files[prop].uuid,
								type: "file",
								uuid: files[prop].uuid,
								name: files[prop].metadata.name,
								date: "",
								timestamp: parseInt(files[prop].metadata.lastModified.toString()),
								lastModified: parseInt(files[prop].metadata.lastModified.toString()),
								lastModifiedSort: parseInt(files[prop].metadata.lastModified.toString()),
								parent: files[prop].parent,
								receiverId: 0,
								receiverEmail: "",
								sharerId: 0,
								sharerEmail: "",
								color: "default",
								favorited: false,
								isBase: false,
								isSync: false,
								isDefault: false,
								size: parseInt(files[prop].metadata.size.toString()),
								selected: false,
								mime: files[prop].metadata.mime,
								key: files[prop].metadata.key,
								offline: false,
								bucket: files[prop].bucket,
								region: files[prop].region,
								rm: "",
								chunks: files[prop].chunks,
								thumbnail: undefined,
								version: files[prop].version,
								hash: ""
							}
						})
					}

					return resolve(result)
				})
			})
			.catch(reject)
	})
}

export const editItemPublicLink = (
	item: Item,
	linkUUID: string,
	expiration: string = "30d",
	password: string = "",
	downloadBtn: "enable" | "disable" = "enable"
): Promise<void> => {
	return new Promise(async (resolve, reject) => {
		if (password == null) {
			password = ""
		}

		if (typeof downloadBtn !== "string") {
			downloadBtn = "enable"
		}

		const pass: string = password.length > 0 ? "notempty" : "empty"
		const passH: string = password.length > 0 ? password : "empty"
		const salt: string = await global.nodeThread.generateRandomString({ charLength: 32 })

		if (item.type == "file") {
			if (typeof linkUUID !== "string") {
				return reject(new Error("Invalid linkUUID"))
			}

			if (linkUUID.length < 32) {
				return reject(new Error("Invalid linkUUID"))
			}

			apiRequest({
				method: "POST",
				endpoint: "/v3/file/link/edit",
				data: {
					uuid: linkUUID,
					fileUUID: item.uuid,
					expiration,
					password: pass,
					passwordHashed: await global.nodeThread.deriveKeyFromPassword({
						password: passH,
						salt,
						iterations: 200000,
						hash: "SHA-512",
						bitLength: 512,
						returnHex: true
					}),
					salt,
					downloadBtn: downloadBtn === "enable" ? true : false,
					type: "enable"
				}
			})
				.then(response => {
					if (!response.status) {
						return reject(response.message)
					}

					return resolve()
				})
				.catch(reject)
		} else {
			apiRequest({
				method: "POST",
				endpoint: "/v3/dir/link/edit",
				data: {
					uuid: item.uuid,
					expiration,
					password: pass,
					passwordHashed: await global.nodeThread.deriveKeyFromPassword({
						password: passH,
						salt,
						iterations: 200000,
						hash: "SHA-512",
						bitLength: 512,
						returnHex: true
					}),
					salt,
					downloadBtn: downloadBtn === "enable" ? true : false
				}
			})
				.then(response => {
					if (!response.status) {
						return reject(response.message)
					}

					return resolve()
				})
				.catch(reject)
		}
	})
}

export const createFolderPublicLink = (item: Item, progressCallback?: (current: number, total: number) => any): Promise<any> => {
	return new Promise((resolve, reject) => {
		if (item.type !== "folder") {
			return reject(new Error("Invalid item type"))
		}

		getDirectoryTree(item.uuid)
			.then(async content => {
				if (content.length == 0) {
					return resolve(true)
				}

				try {
					var masterKeys = getMasterKeys()
					var key = await global.nodeThread.generateRandomString({ charLength: 32 })
					var [encryptedKey, linkUUID, emptyHashed] = await Promise.all([
						encryptMetadata(key, masterKeys[masterKeys.length - 1]),
						global.nodeThread.uuidv4(),
						global.nodeThread.hashFn({ string: "empty" })
					])
				} catch (e) {
					return reject(e)
				}

				const sorted = content.sort((a, b) => b.item.parent.length - a.item.parent.length)
				let done: number = 0
				const promises = []

				for (let i = 0; i < sorted.length; i++) {
					promises.push(
						new Promise(async (resolve, reject) => {
							const metadata = JSON.stringify(
								sorted[i].item.type == "file"
									? {
											name: sorted[i].item.name,
											mime: sorted[i].item.mime,
											key: sorted[i].item.key,
											size: sorted[i].item.size,
											lastModified: sorted[i].item.lastModified
									  }
									: {
											name: sorted[i].item.name
									  }
							)

							encryptMetadata(metadata, key)
								.then(encrypted => {
									addItemToFolderPublicLink({
										uuid: sorted[i].item.uuid,
										parent: sorted[i].item.parent,
										linkUUID,
										type: sorted[i].item.type,
										metadata: encrypted,
										key: encryptedKey,
										expiration: "never"
									})
										.then(() => {
											done += 1

											if (typeof progressCallback == "function") {
												progressCallback(done, sorted.length)
											}

											return resolve(true)
										})
										.catch(err => {
											return reject(err)
										})
								})
								.catch(err => {
									return reject(err)
								})
						})
					)
				}

				Promise.all(promises)
					.then(() => {
						return resolve(true)
					})
					.catch(reject)
			})
			.catch(reject)
	})
}

export const getPublicKeyFromEmail = async (email: string): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/publicKey",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.publicKey
}

export const shareItemToUser = ({
	item,
	email,
	publicKey,
	progressCallback
}: {
	item: any
	email: string
	publicKey: string
	progressCallback?: (doneItems: number, totalItems: number) => void
}): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		const apiKey = getAPIKey()

		if (item.type == "file") {
			global.nodeThread
				.encryptMetadataPublicKey({
					data: JSON.stringify({
						name: item.name,
						size: item.size,
						mime: item.mime,
						key: item.key,
						lastModified: item.lastModified
					}),
					publicKey
				})
				.then(encrypted => {
					shareItem({
						uuid: item.uuid,
						parent: "none",
						email,
						type: "file",
						metadata: encrypted
					})
						.then(() => {
							return resolve(true)
						})
						.catch(reject)
				})
				.catch(reject)
		} else {
			getFolderContents({ uuid: item.uuid })
				.then(contents => {
					const masterKeys = getMasterKeys()
					const folders = contents.folders
					const files = contents.files
					const totalItems = folders.length + files.length
					let doneItems = 0

					const itemShared = () => {
						doneItems += 1

						if (typeof progressCallback == "function") {
							progressCallback(doneItems, totalItems)
						}

						if (doneItems >= totalItems) {
							resolve(true)
						}

						return true
					}

					const shareItemRequest = (
						itemType: string,
						itemToShare: {
							name?: string
							mime?: string
							key?: string
							size?: number
							lastModified?: number
							uuid?: string
							parent?: string
						}
					) => {
						let itemMetadata = ""

						if (itemType == "file") {
							itemMetadata = JSON.stringify({
								name: itemToShare.name,
								mime: itemToShare.mime,
								key: itemToShare.key,
								size: itemToShare.size,
								lastModified: itemToShare.lastModified
							})
						} else {
							itemMetadata = JSON.stringify({
								name: itemToShare.name
							})
						}

						global.nodeThread
							.encryptMetadataPublicKey({
								data: itemMetadata,
								publicKey
							})
							.then(encrypted => {
								shareItem({
									uuid: itemToShare.uuid,
									parent: itemToShare.parent,
									email,
									type: itemType,
									metadata: encrypted
								})
									.then(() => {
										itemShared()
									})
									.catch(err => {
										console.log(err)

										itemShared()
									})
							})
							.catch(err => {
								console.log(err)

								itemShared()
							})
					}

					for (let i = 0; i < folders.length; i++) {
						const folder = folders[i]
						const index = i

						decryptFolderName(masterKeys, folder.name)
							.then(decrypted => {
								shareItemRequest("folder", {
									uuid: folder.uuid,
									parent: index == 0 ? "none" : folder.parent,
									name: decrypted
								})
							})
							.catch(err => {
								console.log(err)

								itemShared()
							})
					}

					for (let i = 0; i < files.length; i++) {
						const file = files[i]

						decryptFileMetadata(masterKeys, file.metadata)
							.then(decrypted => {
								shareItemRequest("file", {
									uuid: file.uuid,
									parent: file.parent,
									name: decrypted.name,
									mime: decrypted.mime,
									key: decrypted.key,
									size: decrypted.size,
									lastModified: decrypted.lastModified
								})
							})
							.catch(err => {
								console.log(err)

								itemShared()
							})
					}
				})
				.catch(reject)
		}
	})
}

export const trashItem = async (type: "file" | "folder", uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: type == "folder" ? "/v3/dir/trash" : "/v3/file/trash",
		data: {
			uuid
		}
	})

	if (!response.status) {
		if (["folder_not_found", "file_not_found"].includes(response.code)) {
			DeviceEventEmitter.emit("event", {
				type: "remove-item",
				data: {
					uuid
				}
			})

			return
		}

		throw new Error(response.message)
	}

	DeviceEventEmitter.emit("event", {
		type: "remove-item",
		data: {
			uuid
		}
	})
}

export const restoreItem = async (type: "file" | "folder", uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: type == "folder" ? "/v3/dir/restore" : "/v3/file/restore",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteItemPermanently = async (type: "file" | "folder", uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: type == "folder" ? "/v3/dir/delete/permanent" : "/v3/file/delete/permanent",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	DeviceEventEmitter.emit("event", {
		type: "remove-item",
		data: {
			uuid
		}
	})
}

export const stopSharingItem = async (uuid: string, receiverId: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/out/remove",
		data: {
			uuid,
			receiverId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	DeviceEventEmitter.emit("event", {
		type: "remove-item",
		data: {
			uuid
		}
	})
}

export const removeSharedInItem = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/item/shared/in/remove",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	DeviceEventEmitter.emit("event", {
		type: "remove-item",
		data: {
			uuid
		}
	})
}

export const fetchFileVersionData = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/versions",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.versions
}

export const restoreArchivedFile = async ({ uuid, currentUUID }: { uuid: string; currentUUID: string }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/version/restore",
		data: {
			uuid,
			current: currentUUID
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const fetchOfflineFilesInfo = async (files: string[]): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/mobile/offline/files",
		data: {
			apiKey: getAPIKey(),
			files: JSON.stringify(files)
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.info
}

export const fetchEvents = async (lastTimestamp: number = Math.floor(Date.now() / 1000) + 60, filter: string = "all"): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/events",
		data: {
			filter,
			timestamp: lastTimestamp
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const fetchEventInfo = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/event",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const fetchFolderSize = async (item: Item, routeURL: string): Promise<number> => {
	if (!fetchFolderSizeSemaphores[item.uuid]) {
		fetchFolderSizeSemaphores[item.uuid] = new Semaphore(1)
	}

	await fetchFolderSizeSemaphores[item.uuid].acquire()

	try {
		let payload: {
			apiKey?: string
			uuid?: string
			sharerId?: number
			receiverId?: number
			trash?: number
			linkUUID?: string
		} = {}

		if (routeURL.indexOf("shared-out") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: item.sharerId || 0,
				receiverId: item.receiverId || 0,
				trash: 0
			}
		} else if (routeURL.indexOf("shared-in") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: item.sharerId || 0,
				receiverId: item.receiverId || 0,
				trash: 0
			}
		} else if (routeURL.indexOf("trash") !== -1) {
			payload = {
				uuid: item.uuid,
				sharerId: 0,
				receiverId: 0,
				trash: 1
			}
		} else if (routeURL.indexOf("/f/") !== -1) {
			payload = {
				linkUUID: routeURL.split("/f/")[1].split("#")[0],
				uuid: item.uuid
			}
		} else {
			payload = {
				uuid: item.uuid,
				sharerId: 0,
				receiverId: 0,
				trash: 0
			}
		}

		const response = await apiRequest({
			method: "POST",
			endpoint: "/v3/dir/size" + (routeURL.indexOf("/f/") !== -1 ? "/link" : ""),
			data: payload
		})

		fetchFolderSizeSemaphores[item.uuid].release()

		if (!response.status) {
			throw new Error(response.message)
		}

		return response.data.size
	} catch (e) {
		fetchFolderSizeSemaphores[item.uuid].release()

		throw e
	}
}

export const deleteAllFilesAndFolders = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete/all",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteAllVersionedFiles = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete/versions",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteAccount = async (twoFactorKey: string = "XXXXXX"): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/delete",
		data: {
			twoFactorKey
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const fetchGDPRInfo = async (): Promise<any> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/gdpr"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface UserGetSettings {
	email: string
	storageUsed: number
	twoFactorEnabled: 0 | 1
	twoFactorKey: string
	unfinishedFiles: number
	unfinishedStorage: number
	versionedFiles: number
	versionedStorage: number
	versioningEnabled: boolean
	loginAlertsEnabled: boolean
}

export interface UserGetAccountPlan {
	cost: number
	endTimestamp: number
	id: number
	lengthType: string
	name: string
	storage: number
}

export interface UserGetSubsInvoices {
	gateway: string
	id: string
	planCost: number
	planName: string
	subId: string
	timestamp: number
}

export interface UserGetAccountSubs {
	id: string
	planId: number
	planName: string
	planCost: number
	gateway: string
	storage: number
	activated: number
	cancelled: number
	startTimestamp: number
	cancelTimestamp: number
}

export interface UserGetAccount {
	affBalance: number
	affCount: number
	affEarnings: number
	affId: string
	affRate: number
	avatarURL: string
	email: string
	invoices: any
	isPremium: 0 | 1
	maxStorage: number
	personal: {
		city: string | null
		companyName: string | null
		country: string | null
		firstName: string | null
		lastName: string | null
		postalCode: string | null
		street: string | null
		streetNumber: string | null
		vatId: string | null
	}
	plans: UserGetAccountPlan[]
	refId: string
	refLimit: number
	refStorage: number
	referCount: number
	referStorage: number
	storage: number
	nickName: string
	displayName: string
	appearOffline: boolean
	subs: UserGetAccountSubs[]
	subsInvoices: UserGetSubsInvoices[]
}

export const getAccount = async (): Promise<any> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/account"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const getSettings = async (): Promise<any> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/settings"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const enable2FA = async (code: string): Promise<string> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/2fa/enable",
		data: {
			code
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.recoveryKeys
}

export const disable2FA = async (code: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/2fa/disable",
		data: {
			code
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const getAuthInfo = async (email: string): Promise<{ authVersion: number; salt: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/auth/info",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return {
		authVersion: response.data.authVersion,
		salt: response.data.salt
	}
}

export const changeEmail = async (email: string, password: string, authVersion: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/settings/email/change",
		data: {
			email,
			password,
			authVersion
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const changePassword = async ({
	password,
	currentPassword,
	authVersion,
	salt,
	masterKeys
}: {
	password: string
	currentPassword: string
	authVersion: number
	salt: string
	masterKeys: string
}): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/settings/password/change",
		data: {
			password,
			currentPassword,
			authVersion,
			salt,
			masterKeys
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const fetchUserInfo = async (apiKey: string | undefined = undefined): Promise<any> => {
	if (typeof apiKey == "undefined") {
		apiKey = storage.getString("apiKey") || ""
	}

	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/info",
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const fetchUserUsage = async (): Promise<any> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/info"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.storageUsed
}

export const bulkMove = ({ items, parent }: { items: any; parent: string }): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]

			if (item.type == "file") {
				try {
					let res = await fileExists({
						name: item.name,
						parent
					})

					if (!res.exists) {
						await moveFile({
							file: item,
							parent
						})
					}
				} catch (e) {
					console.log(e)
				}
			} else {
				try {
					let res = await folderExists({
						name: item.name,
						parent
					})

					if (!res.exists) {
						await moveFolder({
							folder: item,
							parent
						})
					}
				} catch (e) {
					console.log(e)
				}
			}
		}

		return resolve(true)
	})
}

export const bulkFavorite = async (value: 0 | 1, items: Item[]): Promise<void> => {
	const promises: Promise<void>[] = []

	for (const item of items) {
		promises.push(favoriteItem(item.type, item.uuid, value))
	}

	await Promise.all(promises)
}

export const bulkTrash = async (items: Item[]): Promise<void> => {
	const promises: Promise<void>[] = []

	for (const item of items) {
		promises.push(trashItem(item.type, item.uuid))
	}

	await Promise.all(promises)
}

export const bulkShare = (email: string, items: Item[]): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		getPublicKeyFromEmail(email)
			.then(async publicKey => {
				if (typeof publicKey !== "string") {
					return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
				}

				if (publicKey.length < 16) {
					return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
				}

				for (let i = 0; i < items.length; i++) {
					const item = items[i]

					try {
						await shareItemToUser({
							item,
							publicKey,
							email
						})
					} catch (e) {
						console.log(e)
					}
				}

				return resolve(true)
			})
			.catch(err => {
				console.log(err)

				return reject(i18n(storage.getString("lang"), "shareUserNotFound"))
			})
	})
}

export const bulkDeletePermanently = async (items: Item[]): Promise<void> => {
	const promises: Promise<void>[] = []

	for (const item of items) {
		promises.push(deleteItemPermanently(item.type, item.uuid))
	}

	await Promise.all(promises)
}

export const bulkRestore = (items: Item[]): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]

			if (item.type == "file") {
				try {
					let res = await fileExists({
						name: item.name,
						parent: item.parent
					})

					if (!res.exists) {
						await restoreItem(item.type, item.uuid)

						DeviceEventEmitter.emit("event", {
							type: "remove-item",
							data: {
								uuid: item.uuid
							}
						})
					}
				} catch (e) {
					console.log(e)
				}
			} else {
				try {
					let res = await folderExists({
						name: item.name,
						parent: item.parent
					})

					if (!res.exists) {
						await restoreItem(item.type, item.uuid)

						DeviceEventEmitter.emit("event", {
							type: "remove-item",
							data: {
								uuid: item.uuid
							}
						})
					}
				} catch (e) {
					console.log(e)
				}
			}
		}

		return resolve(true)
	})
}

export const bulkStopSharing = (items: Item[]): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]

			try {
				await stopSharingItem(item.uuid, item.receiverId)

				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: item.uuid
					}
				})
			} catch (e) {
				console.log(e)
			}
		}

		return resolve(true)
	})
}

export const bulkRemoveSharedIn = (items: Item[]): Promise<boolean> => {
	return new Promise(async (resolve, reject) => {
		for (let i = 0; i < items.length; i++) {
			const item = items[i]

			try {
				await removeSharedInItem(item.uuid)

				DeviceEventEmitter.emit("event", {
					type: "remove-item",
					data: {
						uuid: item.uuid
					}
				})
			} catch (e) {
				console.log(e)
			}
		}

		return resolve(true)
	})
}

export const folderPresent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/dir/present",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const filePresent = async (uuid: string): Promise<any> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/file/present",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const emptyTrash = async (): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/trash/empty",
		data: {}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const versioning = async (enable: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/versioning",
		data: {
			enabled: enable ? 1 : 0
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const loginAlerts = async (enable: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/loginAlerts",
		data: {
			enabled: enable ? 1 : 0
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface ChatConversationParticipant {
	userId: number
	email: string
	avatar: string | null
	nickName: string
	metadata: string
	permissionsAdd: boolean
	addedTimestamp: number
}

export interface ChatConversation {
	uuid: string
	lastMessageSender: number
	lastMessage: string | null
	lastMessageTimestamp: number
	lastMessageUUID: string | null
	ownerId: number
	name: string | null
	participants: ChatConversationParticipant[]
	createdTimestamp: number
}

export const chatConversations = async (): Promise<ChatConversation[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/chat/conversations"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface ChatMessage {
	conversation: string
	uuid: string
	senderId: number
	senderEmail: string
	senderAvatar: string | null
	senderNickName: string
	message: string
	replyTo: {
		uuid: string
		senderId: number
		senderEmail: string
		senderAvatar: string
		senderNickName: string
		message: string
	}
	embedDisabled: boolean
	edited: boolean
	editedTimestamp: number
	sentTimestamp: number
}

export const chatMessages = async (conversation: string, timestamp: number): Promise<ChatMessage[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/messages",
		data: {
			conversation,
			timestamp
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const chatConversationNameEdit = async (uuid: string, name: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/name/edit",
		data: {
			uuid,
			name
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const sendChatMessage = async (conversation: string, uuid: string, message: string, replyTo: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/send",
		data: {
			conversation,
			uuid,
			message,
			replyTo
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const editChatMessage = async (conversation: string, uuid: string, message: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/edit",
		data: {
			conversation,
			uuid,
			message
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsCreate = async (uuid: string, metadata: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/create",
		data: {
			uuid,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsParticipantsAdd = async (uuid: string, contactUUID: string, metadata: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/participants/add",
		data: {
			uuid,
			contactUUID,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export type TypingType = "up" | "down"

export const chatSendTyping = async (conversation: string, type: TypingType): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/typing",
		data: {
			conversation,
			type
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsRead = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/read",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsUnread = async (uuid: string): Promise<number> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/unread",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.unread
}

export const chatUnread = async (): Promise<number> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/chat/unread"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data.unread
}

export interface ChatConversationsOnline {
	userId: number
	lastActive: number
	appearOffline: boolean
}

export const chatConversationsOnline = async (conversation: string): Promise<ChatConversationsOnline[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/online",
		data: {
			conversation
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const chatDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export type NoteType = "text" | "md" | "code" | "rich" | "checklist"

export interface NoteParticipant {
	userId: number
	isOwner: boolean
	email: string
	avatar: string | null
	nickName: string
	metadata: string
	permissionsWrite: boolean
	addedTimestamp: number
}

export interface Note {
	uuid: string
	ownerId: number
	isOwner: boolean
	favorite: boolean
	pinned: boolean
	tags: NoteTag[]
	type: NoteType
	metadata: string
	title: string
	preview: string
	trash: boolean
	archive: boolean
	createdTimestamp: number
	editedTimestamp: number
	participants: NoteParticipant[]
}

export const notes = async (): Promise<Note[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/notes"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface NoteContent {
	preview: string
	content: string
	editedTimestamp: number
	editorId: number
	type: NoteType
}

export const noteContent = async (uuid: string): Promise<NoteContent> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/content",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface CreateNote {
	uuid: string
	title: string
	metadata: string
}

export const createNote = async ({ uuid, title, metadata }: CreateNote): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/create",
		data: {
			uuid,
			title,
			metadata
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const editNoteContent = async ({
	uuid,
	preview,
	content,
	type
}: {
	uuid: string
	preview: string
	content: string
	type: NoteType
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/content/edit",
		data: {
			uuid,
			preview,
			content,
			type
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const editNoteTitle = async (uuid: string, title: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/title/edit",
		data: {
			uuid,
			title
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const deleteNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const trashNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/trash",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const archiveNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/archive",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const restoreNote = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/restore",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteChangeType = async ({
	uuid,
	type,
	preview,
	content
}: {
	uuid: string
	type: NoteType
	preview: string
	content: string
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/type/change",
		data: {
			uuid,
			type,
			preview,
			content
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notePinned = async (uuid: string, pinned: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/pinned",
		data: {
			uuid,
			pinned
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteFavorite = async (uuid: string, favorite: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/favorite",
		data: {
			uuid,
			favorite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface NoteHistory {
	id: number
	preview: string
	content: string
	editedTimestamp: number
	editorId: number
	type: NoteType
}

export const noteHistory = async (uuid: string): Promise<NoteHistory[]> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/history",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const noteHistoryRestore = async (uuid: string, id: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/history/restore",
		data: {
			uuid,
			id
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsAdd = async ({
	uuid,
	contactUUID,
	metadata,
	permissionsWrite
}: {
	uuid: string
	contactUUID: string
	metadata: string
	permissionsWrite: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/add",
		data: {
			uuid,
			contactUUID,
			metadata,
			permissionsWrite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsRemove = async ({ uuid, userId }: { uuid: string; userId: number }): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/remove",
		data: {
			uuid,
			userId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const noteParticipantsPermissions = async ({
	uuid,
	userId,
	permissionsWrite
}: {
	uuid: string
	userId: number
	permissionsWrite: boolean
}): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/participants/permissions",
		data: {
			uuid,
			userId,
			permissionsWrite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface Contact {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	lastActive: number
	timestamp: number
}

export const contacts = async (): Promise<Contact[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface ContactRequest {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	timestamp: number
}

export const contactsRequestsIn = async (): Promise<ContactRequest[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/requests/in"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsInCount = async (): Promise<number> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/requests/in/count"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsOut = async (): Promise<ContactRequest[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/requests/out"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsOutDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/out/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsRequestsSend = async (email: string): Promise<{ uuid: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/send",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsAccept = async (uuid: string): Promise<{ uuid: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/accept",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsRequestsDeny = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/requests/deny",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const userNickname = async (nickname: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/nickname",
		data: {
			nickname
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const userAppearOffline = async (appearOffline: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/appearOffline",
		data: {
			appearOffline
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface BlockedContact {
	uuid: string
	userId: number
	email: string
	avatar: string | null
	nickName: string
	timestamp: number
}

export const contactsBlocked = async (): Promise<BlockedContact[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/contacts/blocked"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const contactsBlockedAdd = async (email: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/blocked/add",
		data: {
			email
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const contactsBlockedDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/contacts/blocked/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface NoteTag {
	uuid: string
	name: string
	favorite: boolean
	editedTimestamp: number
	createdTimestamp: number
}

export const notesTags = async (): Promise<NoteTag[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/notes/tags"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const notesTagsCreate = async (name: string): Promise<{ uuid: string }> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/tags/create",
		data: {
			name
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const notesTagsRename = async (uuid: string, name: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/tags/rename",
		data: {
			uuid,
			name
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notesTagsDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/tags/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notesTagsFavorite = async (uuid: string, favorite: boolean): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/tags/favorite",
		data: {
			uuid,
			favorite
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notesTag = async (uuid: string, tag: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/tag",
		data: {
			uuid,
			tag
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const notesUntag = async (uuid: string, tag: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/notes/untag",
		data: {
			uuid,
			tag
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const messageEmbedDisable = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/message/embed/disable",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsParticipantsRemove = async (uuid: string, userId: number): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/participants/remove",
		data: {
			uuid,
			userId
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsLeave = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/leave",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const chatConversationsDelete = async (uuid: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/conversations/delete",
		data: {
			uuid
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export interface ChatLastFocus {
	uuid: string
	lastFocus: number
}

export const updateChatLastFocus = async (conversations: ChatLastFocus[]): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/chat/lastFocus",
		data: {
			conversations
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}

export const getChatLastFocus = async (): Promise<ChatLastFocus[]> => {
	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/chat/lastFocus"
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export interface UserProfile {
	id: number
	email: string
	publicKey: string
	avatar: string
	appearOffline: boolean
	lastActive: number
	nickName: string
	createdAt: number
}

export const getUserProfile = async (id: number): Promise<UserProfile> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/profile",
		data: {
			id
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}

	return response.data
}

export const registerPushToken = async (token: string): Promise<void> => {
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/pushToken",
		data: {
			token,
			platform: Platform.OS
		}
	})

	if (!response.status) {
		throw new Error(response.message)
	}
}
