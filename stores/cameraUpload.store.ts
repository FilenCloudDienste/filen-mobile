import { create } from "zustand"

export type SyncState = {
	done: number
	count: number
}

export type CameraUploadStore = {
	syncState: SyncState
	running: boolean
	setRunning: (fn: boolean | ((prev: boolean) => boolean)) => void
	setSyncState: (fn: SyncState | ((prev: SyncState) => SyncState)) => void
}

export const useCameraUploadStore = create<CameraUploadStore>(set => ({
	syncState: {
		done: 0,
		count: 0
	},
	running: false,
	setRunning(fn) {
		set(state => ({
			running: typeof fn === "function" ? fn(state.running) : fn
		}))
	},
	setSyncState(fn) {
		set(state => ({
			syncState: typeof fn === "function" ? fn(state.syncState) : fn
		}))
	}
}))
