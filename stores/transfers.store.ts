import { create } from "zustand"

export type TransfersStore = {
	transfers: Transfer[]
	finishedTransfers: Transfer[]
	speed: number
	remaining: number
	progress: number
	setTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
	setFinishedTransfers: (fn: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void
	setSpeed: (fn: number | ((prev: number) => number)) => void
	setRemaining: (fn: number | ((prev: number) => number)) => void
	setProgress: (fn: number | ((prev: number) => number)) => void
}

export const useTransfersStore = create<TransfersStore>()(set => ({
	transfers: [
		{
			id: "1234",
			type: "upload",
			itemType: "file",
			uuid: "123",
			state: "started",
			bytes: 500,
			name: "test.txt",
			size: 1337,
			startedTimestamp: Date.now(),
			finishedTimestamp: Date.now(),
			queuedTimestamp: Date.now(),
			errorTimestamp: Date.now(),
			progressTimestamp: Date.now()
		}
	],
	finishedTransfers: [],
	speed: 0,
	remaining: 0,
	progress: 0,
	setTransfers(fn) {
		set(state => ({
			transfers: typeof fn === "function" ? fn(state.transfers) : fn
		}))
	},
	setFinishedTransfers(fn) {
		set(state => ({
			finishedTransfers: typeof fn === "function" ? fn(state.finishedTransfers) : fn
		}))
	},
	setSpeed(fn) {
		set(state => ({
			speed: typeof fn === "function" ? fn(state.speed) : fn
		}))
	},
	setRemaining(fn) {
		set(state => ({
			remaining: typeof fn === "function" ? fn(state.remaining) : fn
		}))
	},
	setProgress(fn) {
		set(state => ({
			progress: typeof fn === "function" ? fn(state.progress) : fn
		}))
	}
}))
