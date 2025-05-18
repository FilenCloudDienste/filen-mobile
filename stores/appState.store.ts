import { create } from "zustand"
import { type AppStateStatus } from "react-native"

export type AppStateStore = {
	appState: AppStateStatus
	setAppState: (fn: AppStateStatus | ((prev: AppStateStatus) => AppStateStatus)) => void
}

export const useAppStateStore = create<AppStateStore>(set => ({
	appState: "active",
	setAppState(fn) {
		set(state => ({
			appState: typeof fn === "function" ? fn(state.appState) : fn
		}))
	}
}))
