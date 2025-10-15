import { create } from "zustand"
import type { AppStateStatus } from "react-native"

export type AppStateStore = {
	appState: AppStateStatus
	biometricVisible: boolean
	setupDone: boolean
	setSetupDone: (fn: boolean | ((prev: boolean) => boolean)) => void
	setBiometricVisible: (fn: boolean | ((prev: boolean) => boolean)) => void
	setAppState: (fn: AppStateStatus | ((prev: AppStateStatus) => AppStateStatus)) => void
}

export const useAppStateStore = create<AppStateStore>(set => ({
	appState: "active",
	biometricVisible: false,
	setupDone: false,
	setSetupDone(fn) {
		set(state => ({
			setupDone: typeof fn === "function" ? fn(state.setupDone) : fn
		}))
	},
	setBiometricVisible(fn) {
		set(state => ({
			biometricVisible: typeof fn === "function" ? fn(state.biometricVisible) : fn
		}))
	},
	setAppState(fn) {
		set(state => ({
			appState: typeof fn === "function" ? fn(state.appState) : fn
		}))
	}
}))
