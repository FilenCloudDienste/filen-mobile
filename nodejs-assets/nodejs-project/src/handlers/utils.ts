import type NodeWorker from ".."
import * as jsMediaTags from "jsmediatags"
import { type TagType } from "jsmediatags/types"
import fs from "fs-extra"
import { normalizeFilePathForNode } from "../lib/utils"

export async function doNotPauseOrResumeTransfersOnAppStateChange(
	this: NodeWorker,
	params: { doNotPauseOrResumeTransfersOnAppStateChange: boolean }
) {
	this.doNotPauseOrResumeTransfersOnAppStateChange = params.doNotPauseOrResumeTransfersOnAppStateChange
}

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
