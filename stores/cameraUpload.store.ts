import { create } from "zustand"

export type SyncState = {
	done: number
	count: number
}

export type CameraUploadStore = {
	syncState: SyncState
	setSyncState: (fn: SyncState | ((prev: SyncState) => SyncState)) => void
}

export const useCameraUploadStore = create<CameraUploadStore>(set => ({
	syncState: {
		done: 0,
		count: 0
	},
	setSyncState(fn) {
		set(state => ({
			syncState: typeof fn === "function" ? fn(state.syncState) : fn
		}))
	}
}))
