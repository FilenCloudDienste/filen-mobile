import sdk from "../lib/sdk"
import type NodeWorker from ".."
import type FS from "@filen/sdk/dist/types/fs"

export async function readFileAsString(this: NodeWorker, params: Parameters<FS["readFile"]>[0]) {
	return (await sdk.get().fs().readFile(params)).toString("utf-8")
}

export async function writeFileAsString(this: NodeWorker, params: { path: string; content: string }) {
	return await sdk
		.get()
		.fs()
		.writeFile({
			path: params.path,
			content: Buffer.from(params.content, "utf-8")
		})
}
