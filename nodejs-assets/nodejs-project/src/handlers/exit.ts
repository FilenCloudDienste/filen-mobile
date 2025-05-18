import type NodeWorker from ".."

export default async function exit(this: NodeWorker) {
	return await this.exit()
}
