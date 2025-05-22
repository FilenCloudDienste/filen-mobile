import { memo, useEffect, useMemo, useRef, useCallback } from "react"
import { useTrackPlayerState } from "@/lib/trackPlayer"
import nodeWorker from "@/lib/nodeWorker"
import Semaphore from "@/lib/semaphore"

export const NodeWorker = memo(() => {
	const trackPlayerState = useTrackPlayerState()
	const updateDoNotPauseOrResumeTransfersOnAppStateChangeMutex = useRef<Semaphore>(new Semaphore(1))
	const lastDoNotPauseOrResumeTransfersOnAppStateChangeValue = useRef<boolean | null>(null)

	const doNotPauseOrResumeTransfersOnAppStateChange = useMemo(() => {
		return (
			trackPlayerState.queue.length > 0 &&
			trackPlayerState.activeTrack !== null &&
			(trackPlayerState.isPlaying ||
				trackPlayerState.isBuffering ||
				(trackPlayerState.progressNormalized > 0 && trackPlayerState.progressNormalized < 100))
		)
	}, [
		trackPlayerState.isPlaying,
		trackPlayerState.progressNormalized,
		trackPlayerState.activeTrack,
		trackPlayerState.queue,
		trackPlayerState.isBuffering
	])

	const updateDoNotPauseOrResumeTransfersOnAppStateChange = useCallback(async () => {
		await updateDoNotPauseOrResumeTransfersOnAppStateChangeMutex.current.acquire()

		try {
			if (lastDoNotPauseOrResumeTransfersOnAppStateChangeValue.current === doNotPauseOrResumeTransfersOnAppStateChange) {
				return
			}

			lastDoNotPauseOrResumeTransfersOnAppStateChangeValue.current = doNotPauseOrResumeTransfersOnAppStateChange

			await nodeWorker.proxy("doNotPauseOrResumeTransfersOnAppStateChange", {
				doNotPauseOrResumeTransfersOnAppStateChange
			})
		} catch (error) {
			console.error(error)
		} finally {
			updateDoNotPauseOrResumeTransfersOnAppStateChangeMutex.current.release()
		}
	}, [doNotPauseOrResumeTransfersOnAppStateChange])

	useEffect(() => {
		updateDoNotPauseOrResumeTransfersOnAppStateChange()
	}, [updateDoNotPauseOrResumeTransfersOnAppStateChange])

	return null
})

NodeWorker.displayName = "NodeWorker"

export default NodeWorker
