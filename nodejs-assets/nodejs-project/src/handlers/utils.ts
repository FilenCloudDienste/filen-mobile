import type NodeWorker from ".."

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
