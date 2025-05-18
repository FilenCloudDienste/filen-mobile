import { create } from "zustand"

export type HeaderStore = {
	height: number
	setHeight: (fn: number | ((prev: number) => number)) => void
}

export const useHeaderStore = create<HeaderStore>(set => ({
	height: 0,
	setHeight(fn) {
		set(state => ({
			height: typeof fn === "function" ? fn(state.height) : fn
		}))
	}
}))
