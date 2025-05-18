import type NodeWorker from ".."

export default async function httpStatus(this: NodeWorker) {
	return {
		port: this.http.port,
		authToken: this.http.authToken,
		active: this.http.active
	}
}
