delete process.env["http_proxy"]
delete process.env["HTTP_PROXY"]
delete process.env["https_proxy"]
delete process.env["HTTPS_PROXY"]

process.env.NODE_ENV = "production"

process.on("uncaughtException", err => {
	try {
		rn_bridge.channel.send({
			nodeError: true,
			err: err.toString()
		})
	} catch (e) {
		console.error(e)
	}
})

process.on("unhandledRejection", err => {
	try {
		rn_bridge.channel.send({
			nodeError: true,
			err: err.toString()
		})
	} catch (e) {
		console.error(e)
	}
})

const rn_bridge = require("rn-bridge")
const crypto = require("crypto")
const CryptoJS = require("crypto-js")
const axios = require("axios")
const util = require("util")
const keyutil = require("js-crypto-key-utils")
const CryptoApi = require("crypto-api-v1")
const { uuid: uuidv4 } = require("uuidv4")
const https = require("https")
const http = require("http")
const fs = require("fs")
const pathModule = require("path")
const { Readable } = require("stream")
const heicConvert = require("heic-convert")
const progress = require("progress-stream")

const axiosClient = axios.create({
	timeout: 3600000,
	maxContentLength: 1024 * 1024 * 1024 * 1024,
	maxBodyLength: 1024 * 1024 * 1024 * 1024,
	httpsAgent: new https.Agent({
		keepAlive: true
	}),
	httpAgent: new http.Agent({
		keepAlive: true
	}),
	proxy: false,
	headers: {
		"User-Agent": "filen-mobile",
		Connection: "keep-alive"
	}
})

const httpsAPIAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 16
})

const httpsUploadAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 32
})

const httpsDownloadAgent = new https.Agent({
	keepAlive: true,
	maxSockets: 128
})

const Semaphore = function (max) {
	var counter = 0
	var waiting = []
	var maxCount = max || 1

	var take = function () {
		if (waiting.length > 0 && counter < maxCount) {
			counter++

			let promise = waiting.shift()

			promise.resolve()
		}
	}

	this.acquire = function () {
		if (counter < maxCount) {
			counter++

			return new Promise(resolve => {
				resolve(true)
			})
		} else {
			return new Promise((resolve, err) => {
				waiting.push({ resolve: resolve, err: err })
			})
		}
	}

	this.release = function () {
		counter--

		take()
	}

	this.count = function () {
		return counter
	}

	this.setMax = function (newMax) {
		maxCount = newMax
	}

	this.purge = function () {
		let unresolved = waiting.length

		for (let i = 0; i < unresolved; i++) {
			waiting[i].err("Task has been purged.")
		}

		counter = 0
		waiting = []

		return unresolved
	}
}

const cachedDerivedKeys = {}
const cachedPemKeys = {}
let tasksRunning = 0
const convertHeicSemaphore = new Semaphore(1)
const maxDownloadThreads = 30
const downloadThreadsSemaphore = new Semaphore(maxDownloadThreads)
const downloadWriteThreadsSemaphore = new Semaphore(256)
const uploadSemaphore = new Semaphore(3)
const downloadSemaphore = new Semaphore(3)
const maxUploadThreads = 10
const uploadThreadsSemaphore = new Semaphore(maxUploadThreads)
const currentUploads = {}
const currentDownloads = {}
let bytesSent = 0
let allBytes = 0
let progressStarted = -1
const stoppedTransfers = {}
const pausedTransfers = {}
let finishedTransfers = []
const failedTransfers = {}
const showDownloadProgress = {}
const showUploadProgress = {}
let transfersProgress = 0
let nextTransfersUpdate = 0
const transfersUpdateTimeout = 500

const buildTransfers = () => {
	try {
		const transfers = []
		const exists = {}

		for (const uuid in currentDownloads) {
			transfers.push({
				uuid,
				progress: currentDownloads[uuid].percent,
				timeLeft: currentDownloads[uuid].timeLeft,
				lastBps: currentDownloads[uuid].lastBps,
				name: currentDownloads[uuid].name,
				type: "download",
				done: currentDownloads[uuid].percent >= 100,
				failed: failedTransfers[uuid] ? true : false,
				stopped: stoppedTransfers[uuid] ? true : false,
				paused: pausedTransfers[uuid] ? true : false,
				failedReason: failedTransfers[uuid] && failedTransfers[uuid].reason ? failedTransfers[uuid].reason : null,
				size: currentDownloads[uuid].size,
				bytes: currentDownloads[uuid].bytes
			})
		}

		for (const uuid in currentUploads) {
			transfers.push({
				uuid,
				progress: currentUploads[uuid].percent,
				timeLeft: currentUploads[uuid].timeLeft,
				lastBps: currentUploads[uuid].lastBps,
				name: currentUploads[uuid].name,
				type: "upload",
				done: currentUploads[uuid].percent >= 100,
				failed: failedTransfers[uuid] ? true : false,
				stopped: stoppedTransfers[uuid] ? true : false,
				paused: pausedTransfers[uuid] ? true : false,
				failedReason: failedTransfers[uuid] && failedTransfers[uuid].reason ? failedTransfers[uuid].reason : null,
				size: currentUploads[uuid].size,
				bytes: currentUploads[uuid].bytes
			})
		}

		for (const uuid in failedTransfers) {
			if (exists[uuid]) {
				continue
			}

			exists[uuid] = true

			transfers.push({
				uuid,
				progress: 0,
				timeLeft: 0,
				lastBps: 0,
				name: failedTransfers[uuid].name,
				type: failedTransfers[uuid].transferType,
				done: false,
				failed: true,
				stopped: false,
				paused: false,
				failedReason: failedTransfers[uuid] && failedTransfers[uuid].reason ? failedTransfers[uuid].reason : null,
				size: 0,
				bytes: 0
			})
		}

		for (const transfer of finishedTransfers.reverse()) {
			if (typeof transfer.uuid !== "string" || exists[transfer.uuid]) {
				continue
			}

			exists[transfer.uuid] = true

			transfers.push({
				uuid: transfer.uuid,
				progress: 100,
				timeLeft: 0,
				lastBps: 0,
				name: transfer.name,
				type: transfer.transferType,
				done: true,
				failed: false,
				stopped: false,
				paused: false,
				failedReason: null,
				size: 0,
				bytes: 0
			})
		}

		return transfers
	} catch {
		return []
	}
}

const transfersUpdate = (retryCounter = 0) => {
	const now = Date.now()

	if (nextTransfersUpdate > now) {
		if (retryCounter >= 16) {
			return
		}

		setTimeout(() => transfersUpdate(retryCounter + 1), transfersUpdateTimeout + 100)

		return
	}

	nextTransfersUpdate = now + transfersUpdateTimeout

	rn_bridge.channel.send({
		type: "transfersUpdate",
		data: {
			transfers: buildTransfers(),
			currentDownloadsCount: Object.keys(currentDownloads).length,
			currentUploadsCount: Object.keys(currentUploads).length,
			progress: transfersProgress
		}
	})
}

const updateTransfersProgress = () => {
	try {
		if (bytesSent <= 0 || isNaN(bytesSent)) {
			bytesSent = 0
		}

		if (allBytes <= 0 || isNaN(allBytes)) {
			allBytes = 0
		}

		if (Object.keys(currentUploads).length + Object.keys(currentDownloads).length > 0) {
			let prog = (bytesSent / allBytes) * 100

			if (isNaN(prog) || typeof prog !== "number") {
				prog = 0
			}

			transfersProgress = prog >= 100 ? 100 : prog <= 0 ? 0 : prog
		} else {
			progressStarted = -1
			transfersProgress = 0
			allBytes = 0
			bytesSent = 0
		}
	} catch (e) {
		console.error(e)
	}

	transfersUpdate()
}

const convertArrayBufferToUtf8String = buffer => {
	return Buffer.from(buffer).toString("utf8")
}

const utf8StringToArrayBuffer = string => {
	return Buffer.from(string, "utf8")
}

const arrayBufferToBase64 = buffer => {
	return Buffer.from(buffer).toString("base64")
}

const base64ToArrayBuffer = base64 => {
	return Buffer.from(base64, "base64")
}

const arrayBufferConcat = (buffer1, buffer2) => {
	return Buffer.concat([buffer1, buffer2])
}

const calcSpeed = (now, started, bytes) => {
	now = Date.now() - 1000

	const secondsDiff = (now - started) / 1000
	const bps = Math.floor((bytes / secondsDiff) * 1)

	return bps > 0 ? bps : 0
}

const calcTimeLeft = (loadedBytes, totalBytes, started) => {
	const elapsed = Date.now() - started
	const speed = loadedBytes / (elapsed / 1000)
	const remaining = (totalBytes - loadedBytes) / speed

	return remaining > 0 ? remaining : 0
}

const convertWordArrayToArrayBuffer = wordArray => {
	let arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : []
	let length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4
	let uInt8Array = new Uint8Array(length),
		index = 0,
		word,
		i

	for (i = 0; i < length; i++) {
		word = arrayOfWords[i]

		uInt8Array[index++] = word >> 24
		uInt8Array[index++] = (word >> 16) & 0xff
		uInt8Array[index++] = (word >> 8) & 0xff
		uInt8Array[index++] = word & 0xff
	}

	return uInt8Array
}

const convertUint8ArrayToBinaryString = u8Array => {
	let i,
		len = u8Array.length,
		b_str = ""

	for (i = 0; i < len; i++) {
		b_str += String.fromCharCode(u8Array[i])
	}

	return b_str
}

const randomString = length => {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const charsLength = chars.length
	const randomBytes = crypto.randomBytes(length)
	let result = new Array(length)
	let cursor = 0

	for (let i = 0; i < length; i++) {
		cursor += randomBytes[i]
		result[i] = chars[cursor % charsLength]
	}

	return result.join("")
}

const encryptData = (data, key, convertToBase64 = true, isBase64 = true) => {
	return new Promise((resolve, reject) => {
		try {
			let buffer = data

			if (isBase64) {
				buffer = base64ToArrayBuffer(data)
			}

			const iv = randomString(12)
			const cipher = crypto.createCipheriv("aes-256-gcm", utf8StringToArrayBuffer(key), utf8StringToArrayBuffer(iv))
			const encrypted = arrayBufferConcat(cipher.update(buffer), cipher.final())
			const authTag = cipher.getAuthTag()
			const ciphertext = arrayBufferConcat(encrypted, authTag)

			if (!convertToBase64) {
				return resolve(arrayBufferConcat(utf8StringToArrayBuffer(iv), ciphertext))
			}

			return resolve(arrayBufferToBase64(arrayBufferConcat(utf8StringToArrayBuffer(iv), ciphertext)))
		} catch (e) {
			return reject(e)
		}
	})
}

const decryptData = (data, key, version, returnBase64 = true, isBase64 = true) => {
	return new Promise((resolve, reject) => {
		try {
			let encrypted = data

			if (isBase64) {
				encrypted = base64ToArrayBuffer(data)
			}

			if (version == 1) {
				//old & deprecated, not in use anymore, just here for backwards compatibility
				const sliced =
					convertArrayBufferToUtf8String(new Uint8Array(encrypted).slice(0, 16)) +
					"_" +
					arrayBufferToBase64(new Uint8Array(encrypted).slice(0, 16))

				if (sliced.indexOf("Salted") !== -1) {
					if (returnBase64) {
						return resolve(arrayBufferToBase64(convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(encrypted, key))))
					} else {
						return resolve(convertWordArrayToArrayBuffer(CryptoJS.AES.decrypt(encrypted, key)))
					}
				} else if (sliced.indexOf("U2FsdGVk") !== -1) {
					if (returnBase64) {
						return resolve(
							arrayBufferToBase64(
								convertWordArrayToArrayBuffer(
									CryptoJS.AES.decrypt(convertArrayBufferToUtf8String(new Uint8Array(encrypted)), key)
								)
							)
						)
					} else {
						return resolve(
							convertWordArrayToArrayBuffer(
								CryptoJS.AES.decrypt(convertArrayBufferToUtf8String(new Uint8Array(encrypted)), key)
							)
						)
					}
				} else {
					const decipher = crypto.createDecipheriv(
						"aes-256-cbc",
						utf8StringToArrayBuffer(key),
						utf8StringToArrayBuffer(key).slice(0, 16)
					)
					const decrypted = arrayBufferConcat(decipher.update(encrypted), decipher.final())

					if (returnBase64) {
						return resolve(arrayBufferToBase64(decrypted))
					} else {
						return resolve(decrypted)
					}
				}
			} else if (version == 2) {
				const iv = encrypted.slice(0, 12)
				const encData = encrypted.slice(12)
				const authTag = encData.slice(encData.byteLength - ((128 + 7) >> 3))
				const ciphertext = encData.slice(0, encData.byteLength - authTag.byteLength)

				const decipher = crypto.createDecipheriv("aes-256-gcm", utf8StringToArrayBuffer(key), utf8StringToArrayBuffer(iv))

				decipher.setAuthTag(authTag)

				if (returnBase64) {
					return resolve(arrayBufferToBase64(arrayBufferConcat(decipher.update(ciphertext), decipher.final())))
				} else {
					return resolve(arrayBufferConcat(decipher.update(ciphertext), decipher.final()))
				}
			} else {
				return reject("Invalid version: " + version)
			}
		} catch (e) {
			return reject(e)
		}
	})
}

const downloadAndDecryptChunk = (url, timeout, key, version) => {
	return new Promise((resolve, reject) => {
		axiosClient
			.get(url, {
				responseType: "arraybuffer",
				timeout,
				headers: {
					"User-Agent": "filen-mobile"
				}
			})
			.then(response => {
				try {
					if (response.status !== 200) {
						return reject("Response status: " + response.status)
					}

					const dataBuffer = Buffer.from(response.data, "binary").toString("base64")

					if (typeof dataBuffer.length == "undefined") {
						return reject("Undefined base64 length")
					}

					if (dataBuffer.length <= 0) {
						return reject("Undefined base64 length")
					}

					decryptData(dataBuffer, key, version).then(resolve).catch(reject)
				} catch (e) {
					return reject(e)
				}
			})
			.catch(reject)
	})
}

const deriveKeyFromPassword = (password, salt, iterations, hash, bitLength, returnHex) => {
	return new Promise((resolve, reject) => {
		if (hash == "SHA-512") {
			hash = "SHA512"
		}

		bitLength = bitLength / 8

		const cacheKey = password + ":" + salt + ":" + iterations + ":" + hash + ":" + bitLength + ":" + returnHex.toString()

		if (typeof cachedDerivedKeys[cacheKey] !== "undefined") {
			return resolve(cachedDerivedKeys[cacheKey])
		}

		crypto.pbkdf2(password, salt, iterations, bitLength, hash, (err, res) => {
			if (err) {
				return reject(err)
			}

			if (returnHex) {
				const key = Buffer.from(res).toString("hex")

				cachedDerivedKeys[cacheKey] = key

				return resolve(key)
			}

			cachedDerivedKeys[cacheKey] = res

			return resolve(res)
		})
	})
}

const encryptMetadata = (data, key) => {
	return new Promise((resolve, reject) => {
		deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false)
			.then(derivedKey => {
				try {
					const iv = randomString(12)
					const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, utf8StringToArrayBuffer(iv))
					const encrypted = arrayBufferConcat(cipher.update(data), cipher.final())
					const authTag = cipher.getAuthTag()
					const ciphertext = arrayBufferConcat(encrypted, authTag)

					return resolve("002" + iv + arrayBufferToBase64(ciphertext))
				} catch (e) {
					return reject(e)
				}
			})
			.catch(reject)
	})
}

const decryptMetadata = (data, key) => {
	return new Promise((resolve, reject) => {
		const sliced = data.slice(0, 16)

		if (sliced.indexOf("U2FsdGVk") !== -1) {
			try {
				return resolve(CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8))
			} catch (e) {
				return resolve("")
			}
		} else {
			const version = sliced.slice(0, 3)

			if (version == "002") {
				deriveKeyFromPassword(key, key, 1, "SHA-512", 256, false)
					.then(derivedKey => {
						try {
							const iv = data.slice(3, 15)
							const encData = base64ToArrayBuffer(data.slice(15))
							const authTag = encData.slice(encData.byteLength - ((128 + 7) >> 3))
							const ciphertext = encData.slice(0, encData.byteLength - authTag.byteLength)

							const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, utf8StringToArrayBuffer(iv))

							decipher.setAuthTag(authTag)

							const decrypted = arrayBufferConcat(decipher.update(ciphertext), decipher.final())

							return resolve(new util.TextDecoder().decode(decrypted))
						} catch (e) {
							return resolve("3")
						}
					})
					.catch(() => {
						return resolve("2")
					})
			} else {
				return resolve("1")
			}
		}
	})
}

const derKeyToPem = key => {
	return new Promise((resolve, reject) => {
		if (typeof cachedPemKeys[key] !== "undefined") {
			return resolve(cachedPemKeys[key])
		}

		const keyObj = new keyutil.Key("der", base64ToArrayBuffer(key))

		keyObj
			.export("pem")
			.then(pemKey => {
				cachedPemKeys[key] = pemKey

				return resolve(pemKey)
			})
			.catch(reject)
	})
}

const encryptMetadataPublicKey = async (data, publicKey) => {
	return new Promise(async (resolve, reject) => {
		derKeyToPem(publicKey)
			.then(key => {
				try {
					const encrypted = crypto.publicEncrypt(
						{
							key,
							padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
							oaepHash: "sha512"
						},
						Buffer.from(data)
					)

					return resolve(arrayBufferToBase64(encrypted))
				} catch (e) {
					return reject(e)
				}
			})
			.catch(reject)
	})
}

const decryptMetadataPrivateKey = (data, privateKey) => {
	return new Promise(async (resolve, reject) => {
		derKeyToPem(privateKey)
			.then(key => {
				try {
					const decrypted = crypto.privateDecrypt(
						{
							key,
							padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
							oaepHash: "sha512"
						},
						base64ToArrayBuffer(data)
					)

					return resolve(decrypted.toString())
				} catch (e) {
					return reject(e)
				}
			})
			.catch(reject)
	})
}

const generateKeypair = () => {
	return new Promise((resolve, reject) => {
		crypto.generateKeyPair(
			"rsa",
			{
				modulusLength: 4096,
				publicKeyEncoding: {
					type: "spki",
					format: "der"
				},
				privateKeyEncoding: {
					type: "pkcs8",
					format: "der"
				},
				hashAlgorithm: "SHA512",
				publicExponent: 0x10001
			},
			(err, publicKey, privateKey) => {
				if (err) {
					return reject(err)
				}

				return resolve({
					publicKey: arrayBufferToBase64(publicKey),
					privateKey: arrayBufferToBase64(privateKey)
				})
			}
		)
	})
}

const hashPassword = password => {
	//old & deprecated, not in use anymore, just here for backwards compatibility
	return (
		CryptoApi.hash("sha512", CryptoApi.hash("sha384", CryptoApi.hash("sha256", CryptoApi.hash("sha1", password)))) +
		CryptoApi.hash("sha512", CryptoApi.hash("md5", CryptoApi.hash("md4", CryptoApi.hash("md2", password))))
	)
}

const hashFn = val => {
	return CryptoApi.hash("sha1", CryptoApi.hash("sha512", val))
}

const apiRequest = (method, url, timeout, data) => {
	return new Promise((resolve, reject) => {
		url = new URL(url)

		if (method == "POST") {
			const req = https.request(
				{
					method: method.toUpperCase(),
					hostname: "api.filen.io",
					path: url.pathname,
					port: 443,
					agent: httpsAPIAgent,
					timeout: 86400000,
					headers: {
						"Content-Type": "application/json",
						"User-Agent": "filen-mobile"
					}
				},
				response => {
					if (response.statusCode !== 200) {
						return reject(new Error("API response " + response.statusCode))
					}

					const res = []

					response.on("data", chunk => {
						res.push(chunk)
					})

					response.on("end", () => {
						try {
							return resolve(JSON.parse(Buffer.concat(res).toString()))
						} catch (e) {
							return reject(e)
						}
					})
				}
			)

			req.on("error", err => {
				return reject(err)
			})

			req.write(JSON.stringify(data))
			req.end()
		} else {
			return reject("Invalid method: " + method)
		}
	})
}

const encryptAndUploadChunk = (base64, key, url, timeout) => {
	return new Promise((resolve, reject) => {
		encryptData(base64, key, false)
			.then(encrypted => {
				axiosClient({
					method: "post",
					url,
					data: encrypted,
					timeout,
					headers: {
						"User-Agent": "filen-mobile"
					}
				})
					.then(res => {
						if (res.status !== 200) {
							return reject("Response status: " + response.status)
						}

						try {
							return resolve(res.data)
						} catch (e) {
							return reject(e)
						}
					})
					.catch(reject)
			})
			.catch(reject)
	})
}

const uploadAvatar = (base64, url, timeout) => {
	return new Promise((resolve, reject) => {
		try {
			var data = convertUint8ArrayToBinaryString(base64ToArrayBuffer(base64))
		} catch (e) {
			return reject(e)
		}

		axiosClient({
			method: "post",
			url,
			data,
			timeout,
			headers: {
				"User-Agent": "filen-mobile"
			}
		})
			.then(res => {
				if (res.status !== 200) {
					return reject("Response status: " + response.status)
				}

				try {
					return resolve(res.data)
				} catch (e) {
					return reject(e)
				}
			})
			.catch(reject)
	})
}

const readChunk = (path, offset, length) => {
	return new Promise((resolve, reject) => {
		path = pathModule.normalize(path)

		fs.open(path, "r", (err, fd) => {
			if (err) {
				return reject(err)
			}

			const buffer = Buffer.alloc(length)

			fs.read(fd, buffer, 0, length, offset, (err, read) => {
				if (err) {
					return reject(err)
				}

				let data = undefined

				if (read < length) {
					data = buffer.slice(0, read)
				} else {
					data = buffer
				}

				fs.close(fd, err => {
					if (err) {
						return reject(err)
					}

					return resolve(data)
				})
			})
		})
	})
}

const parseURLParamsSearch = urlParams => {
	const params = {}

	urlParams.forEach((value, key) => {
		params[key] = value
	})

	return params
}

const encryptAndUploadChunkBuffer = (buffer, key, queryParams, apiKey) => {
	return new Promise((resolve, reject) => {
		encryptData(buffer, key, false, false)
			.then(encrypted => {
				if (!(encrypted instanceof Buffer)) {
					reject(new Error("Invalid chunk"))

					return
				}

				let lastBytes = 0

				try {
					var chunkHash = bufferToHash(encrypted, "sha512")
				} catch (e) {
					return reject(e)
				}

				queryParams = queryParams + "&hash=" + encodeURIComponent(chunkHash)

				const urlParams = new URLSearchParams(queryParams)
				const uuid = urlParams.get("uuid") || ""
				const parsedURLParams = parseURLParamsSearch(urlParams)
				const checksum = crypto.createHash("sha512").update(JSON.stringify(parsedURLParams)).digest("hex")

				const calcProgress = written => {
					let bytes = written

					if (lastBytes == 0) {
						lastBytes = written
					} else {
						bytes = Math.floor(written - lastBytes)
						lastBytes = written
					}

					try {
						if (currentUploads[uuid]) {
							const now = Date.now()

							currentUploads[uuid] = {
								...currentUploads[uuid],
								percent: ((currentUploads[uuid].bytes + bytes) / Math.floor((currentUploads[uuid].size || 0) * 1)) * 100,
								lastBps: calcSpeed(now, currentUploads[uuid].started, currentUploads[uuid].bytes + bytes),
								lastTime: now,
								bytes: currentUploads[uuid].bytes + bytes,
								timeLeft: calcTimeLeft(
									currentUploads[uuid].bytes + bytes,
									Math.floor((currentUploads[uuid].size || 0) * 1),
									currentUploads[uuid].started
								)
							}
						}

						bytesSent += bytes

						updateTransfersProgress()
					} catch (e) {
						console.error(e)
					}
				}

				const req = https.request(
					{
						method: "POST",
						hostname: "ingest.filen.io",
						path: "/v3/upload?" + queryParams,
						port: 443,
						timeout: 86400000,
						agent: httpsUploadAgent,
						headers: {
							"User-Agent": "filen-mobile",
							Authorization: "Bearer " + apiKey,
							Checksum: checksum
						}
					},
					response => {
						if (response.statusCode !== 200) {
							return reject("not200")
						}

						const res = []

						response.on("data", chunk => {
							res.push(chunk)
						})

						response.on("end", () => {
							try {
								const obj = JSON.parse(Buffer.concat(res).toString())

								if (!obj.status) {
									return reject(obj.message)
								}

								return resolve(obj)
							} catch (e) {
								return reject(e)
							}
						})
					}
				)

				req.on("error", err => {
					return reject(err)
				})

				const str = progress({
					length: encrypted.byteLength,
					time: 100
				})

				str.on("progress", info => calcProgress(info.transferred))

				Readable.from([encrypted]).pipe(str).pipe(req)
			})
			.catch(reject)
	})
}

const getFileHash = (path, hashName) => {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash(hashName.toLowerCase())
		const stream = fs.createReadStream(pathModule.normalize(normalizeRNFilePath(path)))

		stream.on("error", reject)
		stream.on("data", chunk => hash.update(chunk))
		stream.on("end", () => resolve(hash.digest("hex")))
	})
}

const normalizeRNFilePath = path => {
	if (path.startsWith("file://")) {
		path = path.replace("file://", "")
	}

	if (path.startsWith("file:")) {
		path = path.replace("file:", "")
	}

	return path
}

const bufferToHash = (buffer, hash) => {
	return crypto.createHash(hash).update(buffer).digest("hex")
}

const encryptAndUploadFileChunk = (path, key, queryParams, chunkIndex, chunkSize, apiKey) => {
	return new Promise((resolve, reject) => {
		path = pathModule.normalize(normalizeRNFilePath(path))

		readChunk(path, chunkIndex * chunkSize, chunkSize)
			.then(buffer => {
				const maxTries = 256
				let currentTries = 0
				const triesTimeout = 1000

				const doUpload = () => {
					if (currentTries >= maxTries) {
						return reject("max tries reached for upload, returning")
					}

					currentTries += 1

					encryptAndUploadChunkBuffer(buffer, key, queryParams, apiKey)
						.then(resolve)
						.catch(err => {
							if (err == "not200") {
								return setTimeout(doUpload, triesTimeout)
							}

							return reject(err)
						})
				}

				doUpload()
			})
			.catch(reject)
	})
}

const downloadFileChunk = (uuid, region, bucket, index) => {
	return new Promise((resolve, reject) => {
		const request = https.request({
			host: "egest.filen.io",
			port: 443,
			path: "/" + region + "/" + bucket + "/" + uuid + "/" + index,
			method: "GET",
			agent: httpsDownloadAgent,
			timeout: 86400000,
			headers: {
				"User-Agent": "filen-mobile"
			}
		})

		request.on("response", response => {
			if (response.statusCode === 404) {
				return reject("404")
			}

			if (response.statusCode !== 200) {
				return reject("not200")
			}

			let res = []

			response.on("error", err => {
				return reject(err)
			})

			response
				.on("data", chunk => {
					if (res === null || !(chunk instanceof Buffer)) {
						return
					}

					res.push(chunk)

					try {
						if (showDownloadProgress[uuid]) {
							const bytes = chunk.byteLength

							if (currentDownloads[uuid]) {
								const now = Date.now()

								currentDownloads[uuid] = {
									...currentDownloads[uuid],
									percent:
										((currentDownloads[uuid].bytes + bytes) / Math.floor((currentDownloads[uuid].size || 0) * 1)) * 100,
									lastBps: calcSpeed(now, currentDownloads[uuid].started, currentDownloads[uuid].bytes + bytes),
									lastTime: now,
									bytes: currentDownloads[uuid].bytes + bytes,
									timeLeft: calcTimeLeft(
										currentDownloads[uuid].bytes + bytes,
										Math.floor((currentDownloads[uuid].size || 0) * 1),
										currentDownloads[uuid].started
									)
								}
							}

							bytesSent += bytes
						}

						updateTransfersProgress()
					} catch (e) {
						console.error(e)
					}
				})
				.on("end", () => resolve(Buffer.concat(res)))
				.on("error", reject)
		})

		request.on("timeout", () => reject(new Error("Request timed out")))
		request.on("error", reject)

		request.end()
	})
}

const downloadDecryptAndWriteFileChunk = (destPath, uuid, region, bucket, index, key, version) => {
	return new Promise((resolve, reject) => {
		destPath = pathModule.normalize(destPath)

		let maxTries = Number.MAX_SAFE_INTEGER
		let currentTries = 0
		const triesTimeout = 1000

		const doDownload = () => {
			if (currentTries >= maxTries) {
				return fs.unlink(destPath, () => {
					return reject("Maximum tries reached for download, returning")
				})
			}

			currentTries += 1

			downloadFileChunk(uuid, region, bucket, index)
				.then(buffer => {
					decryptData(buffer, key, version, false, false)
						.then(async decrypted => {
							await new Promise(resolve => fs.unlink(destPath, () => resolve()))

							const stream = fs.createWriteStream(destPath, {
								flags: "w"
							})

							stream.on("close", () => resolve(destPath))

							stream.on("error", err => {
								return reject(err)
							})

							Readable.from([decrypted]).pipe(stream)
						})
						.catch(reject)
				})
				.catch(err => {
					if (err === "404") {
						maxTries = 32

						return setTimeout(doDownload, triesTimeout)
					}

					if (err == "not200") {
						return setTimeout(doDownload, triesTimeout)
					}

					return reject(err)
				})
		}

		doDownload()
	})
}

const appendFileToFile = (first, second) => {
	return new Promise((resolve, reject) => {
		first = pathModule.normalize(first)
		second = pathModule.normalize(second)

		Promise.all([
			new Promise((resolve, reject) => {
				fs.access(first, err => {
					if (err) {
						return reject(err)
					}

					return resolve(true)
				})
			}),
			new Promise((resolve, reject) => {
				fs.access(second, err => {
					if (err) {
						return reject(err)
					}

					return resolve(true)
				})
			})
		])
			.then(() => {
				const w = fs.createWriteStream(first, {
					flags: "a"
				})

				const r = fs.createReadStream(second)

				w.on("close", () => resolve(true))
				w.on("error", err => reject(err))
				r.on("error", err => reject(err))

				r.pipe(w)
			})
			.catch(reject)
	})
}

const convertHeic = (input, output, format) => {
	return new Promise((resolve, reject) => {
		input = pathModule.normalize(input)
		output = pathModule.normalize(output)

		convertHeicSemaphore.acquire().then(() => {
			fs.readFile(input, (err, inputBuffer) => {
				if (err) {
					convertHeicSemaphore.release()

					return reject(err)
				}

				heicConvert({
					buffer: inputBuffer,
					format
				})
					.then(outputBuffer => {
						fs.writeFile(output, outputBuffer, err => {
							convertHeicSemaphore.release()

							if (err) {
								return reject(err)
							}

							return resolve(output)
						})
					})
					.catch(err => {
						convertHeicSemaphore.release()

						return reject(err)
					})
			})
		})
	})
}

const downloadFile = async ({ destination, tempDir, file, showProgress, maxChunks }) => {
	showDownloadProgress[file.uuid] = showProgress

	let now = Date.now()

	delete stoppedTransfers[file.uuid]
	delete pausedTransfers[file.uuid]
	delete failedTransfers[file.uuid]
	delete currentDownloads[file.uuid]

	finishedTransfers = finishedTransfers.filter(t => t.uuid !== file.uuid)

	if (showProgress) {
		currentDownloads[file.uuid] = {
			...file,
			started: now,
			bytes: 0,
			percent: 0,
			lastTime: now,
			lastBps: 0,
			timeLeft: 0,
			timestamp: now
		}

		if (progressStarted === -1) {
			progressStarted = now
		} else {
			if (now < progressStarted) {
				progressStarted = now
			}
		}

		allBytes += file.size
	}

	updateTransfersProgress()

	let currentWriteIndex = 0

	const downloadChunk = async index => {
		if (pausedTransfers[file.uuid]) {
			await new Promise(resolve => {
				const wait = setInterval(() => {
					if (!pausedTransfers[file.uuid] || stoppedTransfers[file.uuid]) {
						clearInterval(wait)

						resolve()
					}
				}, 100)
			})
		}

		if (stoppedTransfers[file.uuid]) {
			throw "stopped"
		}

		const destPath = pathModule.join(tempDir.split("file://").join(""), uuidv4() + "." + file.uuid + "." + index)

		await downloadDecryptAndWriteFileChunk(destPath, file.uuid, file.region, file.bucket, index, file.key, file.version)

		return {
			index,
			path: destPath
		}
	}

	const write = async (index, path) => {
		if (index !== currentWriteIndex) {
			setTimeout(() => {
				write(index, path)
			}, 10)

			return
		}

		try {
			if (index === 0) {
				await new Promise(resolve => fs.unlink(destination, () => resolve()))

				await new Promise((resolve, reject) => {
					fs.rename(path, destination, err => {
						if (err) {
							reject(err)

							return
						}

						resolve()
					})
				})
			} else {
				await appendFileToFile(destination, path)
			}

			currentWriteIndex += 1
		} catch (e) {
			throw e
		} finally {
			downloadWriteThreadsSemaphore.release()
		}
	}

	await downloadSemaphore.acquire()

	now = Date.now()

	if (showProgress) {
		if (currentDownloads[file.uuid]) {
			currentDownloads[file.uuid] = {
				...currentDownloads[file.uuid],
				started: now,
				lastTime: now,
				timestamp: now
			}
		}
	}

	updateTransfersProgress()

	try {
		await new Promise((resolve, reject) => {
			let done = 0
			let rejected = false

			for (let i = 0; i < maxChunks; i++) {
				Promise.all([downloadThreadsSemaphore.acquire(), downloadWriteThreadsSemaphore.acquire()]).then(() => {
					if (rejected) {
						return
					}

					downloadChunk(i)
						.then(({ index, path }) => {
							if (rejected) {
								return
							}

							write(index, path).catch(err => {
								downloadThreadsSemaphore.release()
								downloadWriteThreadsSemaphore.release()

								rejected = true

								reject(err)
							})

							done += 1

							downloadThreadsSemaphore.release()

							if (done >= maxChunks && !rejected) {
								resolve()
							}
						})
						.catch(err => {
							downloadThreadsSemaphore.release()
							downloadWriteThreadsSemaphore.release()

							rejected = true

							reject(err)
						})
				})
			}
		})

		await new Promise(resolve => {
			if (currentWriteIndex >= maxChunks) {
				resolve()

				return
			}

			const wait = setInterval(() => {
				if (currentWriteIndex >= maxChunks) {
					clearInterval(wait)

					resolve()
				}
			}, 10)
		})

		delete currentDownloads[file.uuid]

		finishedTransfers.push({
			...file,
			transferType: "download"
		})

		updateTransfersProgress()

		return destination
	} catch (e) {
		delete currentDownloads[file.uuid]

		if (e !== "stopped") {
			failedTransfers[file.uuid] = {
				...file,
				transferType: "download",
				reason: e.toString()
			}
		}

		if (showProgress) {
			if (allBytes >= file.size) {
				allBytes -= file.size
			}
		}

		updateTransfersProgress()

		throw e
	} finally {
		downloadSemaphore.release()
	}
}

const uploadFile = async ({ uuid, file, includeFileHash, masterKeys, apiKey, version, showProgress, parent }) => {
	const stat = await new Promise((resolve, reject) => {
		fs.stat(file.path, (err, stats) => {
			if (err) {
				reject(err)

				return
			}

			resolve(stats)
		})
	})

	let now = Date.now()

	delete currentUploads[uuid]
	delete failedTransfers[uuid]
	delete stoppedTransfers[uuid]
	delete pausedTransfers[uuid]

	if (showProgress) {
		currentUploads[uuid] = {
			...file,
			started: now,
			bytes: 0,
			percent: 0,
			lastTime: now,
			lastBps: 0,
			timeLeft: 0,
			timestamp: now
		}

		if (progressStarted === -1) {
			progressStarted = now
		} else {
			if (now < progressStarted) {
				progressStarted = now
			}
		}

		allBytes += stat.size
	}

	updateTransfersProgress()

	file.size = stat.size

	const fileName = file.name.split("/").join("_").split("\\").join("_")
	const item = {
		uuid,
		name: fileName,
		size: file.size,
		chunks_size: file.size,
		mime: file.mime || "",
		key: "",
		rm: "",
		metadata: "",
		chunks: 0,
		parent,
		timestamp: Math.floor(now / 1000),
		version,
		versionedUUID: undefined,
		region: "",
		bucket: "",
		type: "file",
		hash: ""
	}
	const name = fileName
	const size = file.size
	const mime = file.mime || ""
	const chunkSizeToUse = 1024 * 1024 * 1
	let dummyOffset = 0
	let fileChunks = 0
	const lastModified = file.lastModified

	while (dummyOffset < size) {
		fileChunks += 1
		dummyOffset += chunkSizeToUse
	}

	item.chunks = fileChunks
	item.name = name

	let key = ""
	let metadata = ""
	let rm = ""
	let uploadKey = ""
	let nameEnc = ""
	let nameH = ""
	let mimeEnc = ""
	let sizeEnc = ""
	let metaData = ""

	try {
		key = randomString(32)
		metadata =
			typeof includeFileHash === "boolean" || typeof includeFileHash === "string"
				? {
						name,
						size,
						mime,
						key,
						lastModified,
						hash:
							typeof includeFileHash === "boolean"
								? await getFileHash(file.path, "sha512")
								: typeof includeFileHash === "string"
								? includeFileHash
								: ""
				  }
				: {
						name,
						size,
						mime,
						key,
						lastModified
				  }

		rm = randomString(32)
		uploadKey = randomString(32)

		const res = await Promise.all([
			encryptMetadata(name, key),
			hashFn(name.toLowerCase()),
			encryptMetadata(mime, key),
			encryptMetadata(size.toString(), key),
			encryptMetadata(JSON.stringify(metadata), masterKeys[masterKeys.length - 1])
		])

		nameEnc = res[0]
		nameH = res[1]
		mimeEnc = res[2]
		sizeEnc = res[3]
		metaData = res[4]

		item.key = key
		item.rm = rm
		item.metadata = metaData
		item.uuid = uuid
	} catch (e) {
		delete currentUploads[uuid]

		failedTransfers[uuid] = {
			...file,
			transferType: "upload",
			reason: e.toString()
		}

		if (showProgress) {
			if (allBytes >= file.size) {
				allBytes -= file.size
			}
		}

		updateTransfersProgress()

		throw e
	}

	const upload = async index => {
		if (pausedTransfers[item.uuid]) {
			await new Promise(resolve => {
				const wait = setInterval(() => {
					if (!pausedTransfers[item.uuid] || stoppedTransfers[item.uuid]) {
						clearInterval(wait)

						resolve()
					}
				}, 100)
			})
		}

		if (stoppedTransfers[item.uuid]) {
			throw "stopped"
		}

		return await encryptAndUploadFileChunk(
			file.path,
			key,
			new URLSearchParams({
				uuid,
				index: index.toString(),
				uploadKey,
				parent
			}).toString(),
			index,
			chunkSizeToUse,
			apiKey
		)
	}

	await uploadSemaphore.acquire()

	now = Date.now()

	if (showProgress) {
		if (currentUploads[item.uuid]) {
			currentUploads[item.uuid] = {
				...currentUploads[item.uuid],
				started: now,
				lastTime: now,
				timestamp: now
			}
		}
	}

	updateTransfersProgress()

	try {
		await new Promise((resolve, reject) => {
			let done = 0

			for (let i = 0; i < fileChunks; i++) {
				uploadThreadsSemaphore.acquire().then(() => {
					upload(i)
						.then(res => {
							done += 1

							item.region = res.data.region
							item.bucket = res.data.bucket

							uploadThreadsSemaphore.release()

							if (done >= fileChunks) {
								resolve()
							}
						})
						.catch(err => {
							uploadThreadsSemaphore.release()

							reject(err)
						})
				})
			}
		})
	} catch (e) {
		throw e
	} finally {
		uploadSemaphore.release()
	}

	updateTransfersProgress()

	return {
		item,
		nameEncrypted: nameEnc,
		nameHashed: nameH,
		mimeEncrypted: mimeEnc,
		sizeEncrypted: sizeEnc,
		metadataEncrypted: metaData,
		uploadKey
	}
}

/*rn_bridge.app.on("pause", (pauseLock) => {
    new Promise((resolve) => {
        const wait = setInterval(() => {
            if(tasksRunning <= 0){
                clearInterval(wait)
    
                resolve()
            }
        }, 1)
    }).then(() => {
        pauseLock.release()
    })
})*/

rn_bridge.channel.on("message", message => {
	tasksRunning += 1

	const request = message

	if (request.type == "encryptData") {
		encryptData(request.base64, request.key)
			.then(encrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: encrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "decryptData") {
		decryptData(request.base64, request.key, request.version)
			.then(decrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: decrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "downloadAndDecryptChunk") {
		downloadAndDecryptChunk(request.url, request.timeout, request.key, request.version)
			.then(decrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: decrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "deriveKeyFromPassword") {
		deriveKeyFromPassword(request.password, request.salt, request.iterations, request.hash, request.bitLength, request.returnHex)
			.then(key => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: key
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "encryptMetadata") {
		encryptMetadata(request.data, request.key)
			.then(encrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: encrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "decryptMetadata") {
		decryptMetadata(request.data, request.key)
			.then(decrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: decrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "encryptMetadataPublicKey") {
		encryptMetadataPublicKey(request.data, request.publicKey)
			.then(encrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: encrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "decryptMetadataPrivateKey") {
		decryptMetadataPrivateKey(request.data, request.privateKey)
			.then(decrypted => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: decrypted
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "generateKeypair") {
		generateKeypair()
			.then(keyPair => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: keyPair
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "hashPassword") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: hashPassword(request.string)
			})

			tasksRunning -= 1
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})

			tasksRunning -= 1
		}
	} else if (request.type == "hashFn") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: hashFn(request.string)
			})

			tasksRunning -= 1
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})

			tasksRunning -= 1
		}
	} else if (request.type == "apiRequest") {
		apiRequest(request.method, request.url, request.timeout, request.data)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "encryptAndUploadChunk") {
		encryptAndUploadChunk(request.base64, request.key, request.url, request.timeout)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "generateRandomString") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: randomString(request.charLength)
			})

			tasksRunning -= 1
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})

			tasksRunning -= 1
		}
	} else if (request.type == "uuidv4") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: uuidv4()
			})

			tasksRunning -= 1
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})

			tasksRunning -= 1
		}
	} else if (request.type == "ping") {
		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: "pong"
		})

		tasksRunning -= 1
	} else if (request.type == "uploadAvatar") {
		uploadAvatar(request.base64, request.url, request.timeout)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "getFileHash") {
		getFileHash(request.path, request.hashName)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "encryptAndUploadFileChunk") {
		encryptAndUploadFileChunk(request.path, request.key, request.queryParams, request.chunkIndex, request.chunkSize, request.apiKey)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "getDataDir") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: rn_bridge.app.datadir()
			})
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})
		}
	} else if (request.type == "appendFileToFile") {
		appendFileToFile(request.first, request.second)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "downloadDecryptAndWriteFileChunk") {
		downloadDecryptAndWriteFileChunk(
			request.destPath,
			request.uuid,
			request.region,
			request.bucket,
			request.index,
			request.key,
			request.version
		)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "convertHeic") {
		convertHeic(request.input, request.output, request.format)
			.then(res => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: res
				})

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				tasksRunning -= 1
			})
	} else if (request.type == "createHashHexFromString") {
		try {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				response: crypto.createHash(request.name).update(request.data).digest("hex")
			})

			tasksRunning -= 1
		} catch (e) {
			rn_bridge.channel.send({
				id: request.id,
				type: request.type,
				err: e.toString()
			})

			tasksRunning -= 1
		}
	} else if (request.type === "downloadFile") {
		downloadFile({
			destination: request.destination,
			tempDir: request.tempDir,
			file: request.file,
			showProgress: request.showProgress,
			maxChunks: request.maxChunks
		})
			.then(result => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: result
				})

				updateTransfersProgress()

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				updateTransfersProgress()

				tasksRunning -= 1
			})
	} else if (request.type === "uploadFile") {
		uploadFile({
			uuid: request.uuid,
			file: request.file,
			includeFileHash: request.includeFileHash,
			masterKeys: request.masterKeys,
			apiKey: request.apiKey,
			version: request.version,
			showProgress: request.showProgress,
			parent: request.parent
		})
			.then(result => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					response: result
				})

				updateTransfersProgress()

				tasksRunning -= 1
			})
			.catch(err => {
				rn_bridge.channel.send({
					id: request.id,
					type: request.type,
					err: err.toString()
				})

				updateTransfersProgress()

				tasksRunning -= 1
			})
	} else if (request.type === "uploadDone") {
		if (currentUploads[request.uuid]) {
			finishedTransfers.push({
				...currentUploads[request.uuid],
				transferType: "upload"
			})
		}

		delete currentUploads[request.uuid]

		updateTransfersProgress()

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		tasksRunning -= 1
	} else if (request.type === "uploadFailed") {
		if (currentUploads[request.uuid]) {
			if (currentUploads[request.uuid].size && allBytes >= currentUploads[request.uuid].size) {
				allBytes -= currentUploads[request.uuid].size
			}

			failedTransfers[request.uuid] = {
				...currentUploads[request.uuid],
				transferType: "upload",
				reason: request.reason
			}
		}

		delete currentUploads[request.uuid]

		updateTransfersProgress()

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		tasksRunning -= 1
	} else if (request.type === "removeTransfer") {
		if (currentUploads[request.uuid] && currentUploads[request.uuid].size && allBytes >= currentUploads[request.uuid].size) {
			allBytes -= currentUploads[request.uuid].size
		}

		if (currentDownloads[request.uuid] && currentDownloads[request.uuid].size && allBytes >= currentDownloads[request.uuid].size) {
			allBytes -= currentDownloads[request.uuid].size
		}

		delete currentUploads[request.uuid]
		delete currentDownloads[request.uuid]

		updateTransfersProgress()

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		tasksRunning -= 1
	} else if (request.type === "stopTransfer") {
		stoppedTransfers[request.uuid] = true

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		updateTransfersProgress()

		tasksRunning -= 1
	} else if (request.type === "pauseTransfer") {
		pausedTransfers[request.uuid] = true

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		updateTransfersProgress()

		tasksRunning -= 1
	} else if (request.type === "resumeTransfer") {
		delete pausedTransfers[request.uuid]

		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: true
		})

		updateTransfersProgress()

		tasksRunning -= 1
	} else if (request.type === "getCurrentTransfers") {
		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			response: {
				transfers: buildTransfers(),
				currentDownloadsCount: Object.keys(currentDownloads).length,
				currentUploadsCount: Object.keys(currentUploads).length,
				progress: transfersProgress,
				currentUploads,
				currentDownloads
			}
		})

		tasksRunning -= 1
	} else {
		rn_bridge.channel.send({
			id: request.id,
			type: request.type,
			err: "Invalid request type: " + request.type
		})

		tasksRunning -= 1
	}

	return true
})

rn_bridge.channel.send("ready")
