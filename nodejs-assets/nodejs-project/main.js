const bridge = require("rn-bridge")
const { NodeWorker } = require("./bundle")
const argon2 = require("argon2")

async function argon2idAsync(password, salt, options) {
	if (!password || !salt) {
		throw new Error("Password and salt are required")
	}

	const hash = await argon2.hash(password, {
		salt,
		type: argon2.argon2id,
		hashLength: options.dkLength ?? 32,
		version: options.version ?? 0x13,
		memoryCost: options.m ?? 65536,
		parallelism: options.p ?? 1,
		timeCost: options.t ?? 3,
		raw: true,
		associatedData: options.ad ?? undefined,
		secret: options.secret ?? undefined
	})

	return hash
}

global.argon2idAsync = argon2idAsync
globalThis.argon2idAsync = argon2idAsync

new NodeWorker(bridge)
