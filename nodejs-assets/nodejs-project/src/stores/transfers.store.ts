import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

export const transfersStore = create<TransfersStore>()(
	subscribeWithSelector(set => ({
		transfers: [],
		finishedTransfers: [],
		setTransfers(fn) {
			set(state => ({
				transfers: typeof fn === "function" ? fn(state.transfers) : fn
			}))
		},
		setFinishedTransfers(fn) {
			set(state => ({
				finishedTransfers: typeof fn === "function" ? fn(state.finishedTransfers) : fn
			}))
		}
	}))
)

export default transfersStore
