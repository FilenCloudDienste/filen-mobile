import { memo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "expo-router"
import events from "@/lib/events"
import useSDKConfig from "@/hooks/useSDKConfig"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import { AppState } from "react-native"
import { foregroundCameraUpload } from "@/lib/cameraUpload"

export const AuthedListeners = memo(() => {
	const { push: routerPush } = useRouter()
	const [{ baseFolderUUID, userId }] = useSDKConfig()
	const nextCameraUploadRunRef = useRef<number>(0)

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
		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			const now = Date.now()

			if (nextAppState === "active" && now > nextCameraUploadRunRef.current) {
				nextCameraUploadRunRef.current = now + 60000

				foregroundCameraUpload.run().catch(console.error)
			}
		})

		return () => {
			appStateChangeListener.remove()
		}
	}, [])

	useEffect(() => {
		const updateTransfersInterval = setInterval(() => {
			updateTransfers().catch(console.error)
		}, 3000)

		const appStateChangeListener = AppState.addEventListener("change", nextAppState => {
			if (nextAppState === "active") {
				updateTransfers().catch(console.error)
			} else {
				clearInterval(updateTransfersInterval)
			}
		})

		return () => {
			appStateChangeListener.remove()
		}
	}, [updateTransfers])

	useEffect(() => {
		const selectContactsSub = events.subscribe("selectContacts", e => {
			if (e.type === "request") {
				routerPush({
					pathname: "/selectContacts",
					params: {
						id: e.data.id,
						type: e.data.type,
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
						toMove: JSON.stringify(e.data.toMove ?? []),
						previewTypes: JSON.stringify(e.data.previewTypes ?? []),
						extensions: JSON.stringify(e.data.extensions ?? []),
						multiScreen: e.data.multiScreen ? 1 : 0
					}
				})
			}
		})

		const selectTrackPlayerPlaylistsSub = events.subscribe("selectTrackPlayerPlaylists", e => {
			if (e.type === "request") {
				routerPush({
					pathname: "/selectTrackPlayerPlaylists",
					params: {
						id: e.data.id,
						max: e.data.max,
						dismissHref: e.data.dismissHref
					}
				})
			}
		})

		return () => {
			selectContactsSub.remove()
			selectDriveItemsSub.remove()
			selectTrackPlayerPlaylistsSub.remove()
		}
	}, [routerPush, baseFolderUUID, userId])

	return null
})

AuthedListeners.displayName = "AuthedListeners"

export default AuthedListeners
