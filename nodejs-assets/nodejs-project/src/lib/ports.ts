export function generatePortRange(start: number, end: number, step: number = 10): number[] {
	const ports: number[] = []

	for (let port = start; port <= end; port += step) {
		ports.push(port)
	}

	return ports
}

export const POSSIBLE_PORTS: number[] = [...generatePortRange(49152, 65000, 1)]
