import type NodeWorker from ".."
import * as jsMediaTags from "jsmediatags"
import { type TagType } from "jsmediatags/types"
import fs from "fs-extra"
import { normalizeFilePathForNode } from "../lib/utils"

export async function parseAudioMetadata(this: NodeWorker, params: { path: string }) {
	if (!(await fs.exists(normalizeFilePathForNode(params.path)))) {
		throw new Error("File does not exist.")
	}

	return await new Promise<TagType>((resolve, reject) => {
		new jsMediaTags.Reader(normalizeFilePathForNode(params.path))
			.setTagsToRead(["title", "artist", "album", "year", "track", "genre", "picture"])
			.read({
				onSuccess(data) {
					resolve(data)
				},
				onError(error) {
					reject(error)
				}
			})
	})
}

export async function exit(this: NodeWorker) {
	return await this.exit()
}

export async function httpStatus(this: NodeWorker) {
	return {
		port: this.http.port,
		authToken: this.http.authToken,
		active: this.http.active
	}
}

export async function ping() {
	return "pong"
}
