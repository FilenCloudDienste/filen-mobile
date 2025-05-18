import { memo, useEffect, useCallback } from "react"
import { useRouter } from "expo-router"
import events from "@/lib/events"
import useSDKConfig from "@/hooks/useSDKConfig"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { useAppStateStore } from "@/stores/appState.store"
import { useShallow } from "zustand/shallow"

export const AuthedListeners = memo(() => {
	const { push: routerPush } = useRouter()
	const [{ baseFolderUUID, userId }] = useSDKConfig()
	const appState = useAppStateStore(useShallow(state => state.appState))

	const updateTransfers = useCallback(async () => {
		try {
			await nodeWorker.updateTransfers()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [])

	useEffect(() => {
		const updateTransfersInterval = setInterval(() => {
			updateTransfers().catch(console.error)
		}, 3000)

		if (appState === "active") {
			updateTransfers().catch(console.error)
		} else {
			clearInterval(updateTransfersInterval)
		}

		return () => {
			clearInterval(updateTransfersInterval)
		}
	}, [appState, updateTransfers])

	useEffect(() => {
		const selectContactsSub = events.subscribe("selectContacts", e => {
			if (e.type === "request") {
				routerPush({
					pathname: "/selectContacts",
					params: {
						id: e.data.id,
						type: e.data.type,
						multiple: e.data.multiple ? 1 : 0,
						max: e.data.max
					}
				})
			}
		})

		const selectDriveItemsSub = events.subscribe("selectDriveItems", e => {
			if (e.type === "request") {
				routerPush({
					pathname: "/selectDriveItems/[parent]",
					params: {
						id: e.data.id,
						parent: baseFolderUUID,
						max: e.data.max,
						type: e.data.type,
						dismissHref: e.data.dismissHref,
						toMove: JSON.stringify(e.data.toMove ?? [])
					}
				})
			}
		})

		return () => {
			selectContactsSub.remove()
			selectDriveItemsSub.remove()
		}
	}, [routerPush, baseFolderUUID, userId])

	return null
})

AuthedListeners.displayName = "AuthedListeners"

export default AuthedListeners
