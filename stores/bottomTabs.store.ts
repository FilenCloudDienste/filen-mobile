import { create } from "zustand"

export type BottomTabsStore = {
	height: number
	setHeight: (fn: number | ((prev: number) => number)) => void
}

export const useBottomTabsStore = create<BottomTabsStore>(set => ({
	height: 0,
	setHeight(fn) {
		set(state => ({
			height: typeof fn === "function" ? fn(state.height) : fn
		}))
	}
}))
