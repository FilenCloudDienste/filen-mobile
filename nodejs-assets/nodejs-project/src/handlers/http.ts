import type NodeWorker from ".."

export async function restartHTTPServer(this: NodeWorker): Promise<Awaited<ReturnType<NodeWorker["http"]["start"]>>> {
	await this.http.stop(true)

	return await this.http.start()
}
