import GalleryComponent from "@/components/gallery"
import { useEffect, useMemo, memo } from "react"
import { BackHandler } from "react-native"
import { useGalleryStore } from "@/stores/gallery.store"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useShallow } from "zustand/shallow"
import { Portal } from "@rn-primitives/portal"

export const GalleryModal = memo(() => {
	const visible = useGalleryStore(useShallow(state => state.visible))
	const setVisible = useGalleryStore(useShallow(state => state.setVisible))
	const items = useGalleryStore(useShallow(state => state.items))
	const initialUUID = useGalleryStore(useShallow(state => state.initialUUID))
	const setCurrentVisibleIndex = useGalleryStore(useShallow(state => state.setCurrentVisibleIndex))

	const initialScrollIndex = useMemo((): number => {
		if (!visible || items.length === 0) {
			return 0
		}

		const uuid = typeof initialUUID === "string" ? initialUUID : ""
		const foundIndex = items.findIndex(item => {
			if (item.itemType === "cloudItem" && item.data.uuid === uuid) {
				return true
			}

			if (item.itemType === "cloudItem" && item.data.uuid === uuid) {
				return true
			}

			if (item.itemType === "remoteItem" && item.data.uri === uuid) {
				return true
			}

			return false
		})
		const index = foundIndex === -1 ? 0 : foundIndex

		return index
	}, [items, initialUUID, visible])

	useEffect(() => {
		if (visible && initialScrollIndex >= 0 && items.length > 0) {
			setCurrentVisibleIndex(initialScrollIndex)
		}
	}, [visible, initialScrollIndex, items.length, setCurrentVisibleIndex])

	useEffect(() => {
		if (items.length === 0 && visible) {
			setVisible(false)
		}
	}, [items, visible, setVisible])

	useEffect(() => {
		const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
			if (!visible) {
				return false
			}

			setVisible(false)

			return true
		})

		return () => {
			backHandler.remove()
		}
	}, [visible, setVisible])

	if (!visible) {
		return null
	}

	return (
		<Portal name="gallery-modal">
			<Animated.View
				entering={FadeIn}
				exiting={FadeOut}
				style={{
					flex: 1,
					backgroundColor: "transparent",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0
				}}
			>
				<GalleryComponent
					initialScrollIndex={initialScrollIndex}
					panEnabled={true}
					pinchEnabled={true}
					doubleTapEnabled={true}
					swipeToCloseEnabled={true}
					items={items}
				/>
			</Animated.View>
		</Portal>
	)
})

GalleryModal.displayName = "GalleryModal"

export default GalleryModal
