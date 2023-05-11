import storage from "../../../storage"
import { apiRequest } from "../../../api"
import { logout } from "../../auth/logout"
import { getMasterKeys, getAPIKey } from "../../../helpers"
import { NavigationContainerRef } from "@react-navigation/native"
import { encryptMetadata, decryptMetadata } from "../../../crypto"

export const updateKeypair = async ({
	publicKey,
	privateKey,
	navigation
}: {
	publicKey: string
	privateKey: string
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}): Promise<void> => {
	const masterKeys: string[] = getMasterKeys()
	const apiKey: string = getAPIKey()

	if (!Array.isArray(masterKeys) || masterKeys.length === 0) {
		logout({ navigation })

		return
	}

	const encryptedPrivateKey = await encryptMetadata(privateKey, masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/keyPair/update",
		data: {
			publicKey,
			privateKey: encryptedPrivateKey
		},
		apiKey
	})

	if (!response.status) {
		if (response.message.toLowerCase().indexOf("api key not found") !== -1) {
			logout({ navigation })

			return
		}

		throw new Error(response.message + ": " + response.code)
	}
}

export const setKeypair = async ({
	publicKey,
	privateKey,
	navigation
}: {
	publicKey: string
	privateKey: string
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}): Promise<void> => {
	const masterKeys: string[] = getMasterKeys()
	const apiKey: string = getAPIKey()

	if (!Array.isArray(masterKeys) || masterKeys.length === 0) {
		logout({ navigation })

		return
	}

	const encryptedPrivateKey = await encryptMetadata(privateKey, masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/keyPair/set",
		data: {
			publicKey,
			privateKey: encryptedPrivateKey
		},
		apiKey
	})

	if (!response.status) {
		if (response.message.toLowerCase().indexOf("api key not found") !== -1) {
			logout({ navigation })

			return
		}

		throw new Error(response.message + ": " + response.code)
	}
}

export const updatePublicAndPrivateKey = async ({
	navigation
}: {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}): Promise<void> => {
	const masterKeys: string[] = getMasterKeys()
	const apiKey: string = getAPIKey()

	if (!Array.isArray(masterKeys) || masterKeys.length === 0) {
		logout({ navigation })

		return
	}

	const response = await apiRequest({
		method: "GET",
		endpoint: "/v3/user/keyPair/info",
		apiKey
	})

	if (!response.status) {
		if (response.message.toLowerCase().indexOf("api key not found") !== -1) {
			logout({ navigation })

			return
		}

		throw new Error(response.message + ": " + response.code)
	}

	if (response.data.publicKey.length > 16 && response.data.privateKey.length > 16) {
		let privateKey = ""

		for (let i = 0; i < masterKeys.length; i++) {
			try {
				const decrypted = await decryptMetadata(response.data.privateKey, masterKeys[i])

				if (typeof decrypted == "string") {
					if (decrypted.length > 16) {
						privateKey = decrypted
					}
				}
			} catch (e) {
				continue
			}
		}

		if (privateKey.length <= 16) {
			return
		}

		storage.set("publicKey", response.data.publicKey)
		storage.set("privateKey", privateKey)

		console.log("Public and private key updated.")

		await updateKeypair({ publicKey: response.data.publicKey, privateKey, navigation })

		console.log("User keypair updated.")
	} else {
		const generatedKeypair = await global.nodeThread.generateKeypair()
		const b64PubKey = generatedKeypair.publicKey
		const b64PrivKey = generatedKeypair.privateKey

		if (b64PubKey.length <= 16 || b64PrivKey.length <= 16) {
			throw new Error("Key lengths invalid")
		}

		await setKeypair({ publicKey: b64PubKey, privateKey: b64PrivKey, navigation })

		storage.set("publicKey", b64PubKey)
		storage.set("privateKey", b64PrivKey)

		console.log("User keypair generated and updated.")
	}
}

export const updateKeys = async ({ navigation }: { navigation: NavigationContainerRef<ReactNavigation.RootParamList> }): Promise<void> => {
	const masterKeys: string[] = getMasterKeys()
	const apiKey: string = getAPIKey()

	if (!Array.isArray(masterKeys) || masterKeys.length === 0) {
		logout({ navigation })

		return
	}

	const encryptedMasterKeys = await encryptMetadata(masterKeys.join("|"), masterKeys[masterKeys.length - 1])
	const response = await apiRequest({
		method: "POST",
		endpoint: "/v3/user/masterKeys",
		data: {
			masterKeys: encryptedMasterKeys
		},
		apiKey
	})

	if (!response.status) {
		throw new Error(response.message + ": " + response.code)
	}

	let newMasterKeys: any = ""

	for (let i = 0; i < masterKeys.length; i++) {
		try {
			let decrypted = await decryptMetadata(response.data.keys, masterKeys[i])

			if (typeof decrypted == "string") {
				if (decrypted.length > 16) {
					newMasterKeys = decrypted
				}
			}
		} catch (e) {
			continue
		}
	}

	if (newMasterKeys.length > 16) {
		newMasterKeys = newMasterKeys.split("|")

		storage.set("masterKeys", JSON.stringify(newMasterKeys))

		console.log("Master keys updated")
	}

	await updatePublicAndPrivateKey({ navigation })
}
