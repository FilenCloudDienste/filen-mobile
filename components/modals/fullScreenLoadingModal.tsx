import { memo, useEffect, useState, useMemo, useCallback } from "react"
import { ActivityIndicator } from "../nativewindui/ActivityIndicator"
import events from "@/lib/events"
import { View, Modal, type NativeSyntheticEvent } from "react-native"
import { useColorScheme } from "@/lib/useColorScheme"

export type FullScreenLoadingModalEvent =
	| {
			type: "show"
	  }
	| {
			type: "hide"
	  }
	| {
			type: "forceHide"
	  }

export const FullScreenLoadingModal = memo(() => {
	const [showCount, setShowCount] = useState<number>(0)
	const { colorScheme, colors } = useColorScheme()

	const visible = useMemo(() => {
		return showCount > 0
	}, [showCount])

	const style = useMemo(() => {
		return {
			backgroundColor: colorScheme === "dark" ? "rgba(0, 0, 0, 0.50)" : "rgba(255, 255, 255, 0.50)"
		}
	}, [colorScheme])

	const onRequestClose = useCallback((e: NativeSyntheticEvent<unknown>) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	useEffect(() => {
		const sub = events.subscribe("fullScreenLoadingModal", e => {
			if (e.type === "show") {
				setShowCount(count => (count <= 0 ? 1 : count + 1))
			} else if (e.type === "forceHide") {
				setShowCount(0)
			} else {
				setShowCount(count => (count <= 0 ? 0 : count - 1))
			}
		})

		return () => {
			sub.remove()
		}
	}, [])

	if (!visible) {
		return null
	}

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="fade"
			presentationStyle="overFullScreen"
			onRequestClose={onRequestClose}
			statusBarTranslucent={true}
			navigationBarTranslucent={true}
			supportedOrientations={["portrait", "landscape", "portrait-upside-down", "landscape-left", "landscape-right"]}
		>
			<View
				className="flex-1 absolute top-0 left-0 bottom-0 right-0 z-[9999] w-full h-full justify-center items-center"
				style={style}
			>
				<ActivityIndicator
					size="small"
					color={colors.foreground}
				/>
			</View>
		</Modal>
	)
})

FullScreenLoadingModal.displayName = "FullScreenLoadingModal"

export const fullScreenLoadingModal = {
	show: () => {
		events.emit("fullScreenLoadingModal", {
			type: "show"
		})
	},
	hide: () => {
		events.emit("fullScreenLoadingModal", {
			type: "hide"
		})
	},
	forceHide: () => {
		events.emit("fullScreenLoadingModal", {
			type: "forceHide"
		})
	}
}

export default fullScreenLoadingModal
