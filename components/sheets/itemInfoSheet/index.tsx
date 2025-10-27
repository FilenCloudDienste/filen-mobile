import { memo, useEffect, useCallback, useRef, useState } from "react"
import { Sheet, useSheetRef } from "@/components/nativewindui/Sheet"
import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomSheetView } from "@gorhom/bottom-sheet"
import Info from "./info"
import { BackHandler } from "react-native"

export type ItemInfoEvent = {
	type: "request"
	data: {
		id: string
		item: DriveCloudItem
	}
}

export function itemInfo(item: DriveCloudItem): void {
	const id = randomUUID()

	events.emit("itemInfo", {
		type: "request",
		data: {
			id,
			item
		}
	})
}

export const ItemInfoSheet = memo(() => {
	const ref = useSheetRef()
	const id = useRef<string>("")
	const insets = useSafeAreaInsets()
	const [item, setItem] = useState<DriveCloudItem | null>(null)

	const onChange = useCallback(
		(index: number) => {
			if (index === -1) {
				setItem(null)

				id.current = ""

				ref?.current?.forceClose()
			}
		},
		[ref]
	)

	useEffect(() => {
		const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
			if (id.current.length > 0) {
				setItem(null)

				id.current = ""

				ref?.current?.forceClose()

				return true
			}

			return false
		})

		return () => {
			backHandler.remove()
		}
	}, [ref])

	useEffect(() => {
		const sub = events.subscribe("itemInfo", e => {
			if (e.type === "request") {
				id.current = e.data.id

				setItem(e.data.item)

				setTimeout(() => {
					ref?.current?.present()
				}, 1)
			}
		})

		return () => {
			sub.remove()
		}
	}, [ref])

	return (
		<Sheet
			ref={ref}
			enablePanDownToClose={true}
			bottomInset={insets.bottom}
			onChange={onChange}
		>
			<BottomSheetView className="flex-1">{item ? <Info item={item} /> : null}</BottomSheetView>
		</Sheet>
	)
})

ItemInfoSheet.displayName = "ItemInfoSheet"

export default ItemInfoSheet
