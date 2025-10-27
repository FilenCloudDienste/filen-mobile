import { memo, useRef, useEffect, useCallback, useState } from "react"
import { BottomSheetView } from "@gorhom/bottom-sheet"
import events from "@/lib/events"
import { randomUUID } from "expo-crypto"
import { DEFAULT_DIRECTORY_COLOR } from "@/assets/fileIcons"
import ColorPickerComponent, { Panel1, Preview, HueSlider } from "reanimated-color-picker"
import { View, BackHandler } from "react-native"
import { Button } from "../nativewindui/Button"
import { Text } from "../nativewindui/Text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Sheet, useSheetRef } from "@/components/nativewindui/Sheet"
import { translateMemoized } from "@/lib/i18n"

export type ColorPickerResponse =
	| {
			cancelled: false
			color: string
	  }
	| {
			cancelled: true
	  }

export type ColorPickerParams = {
	currentColor: string
}

export type ColorPickerEvent =
	| {
			type: "request"
			data: {
				id: string
			} & ColorPickerParams
	  }
	| {
			type: "response"
			data: {
				id: string
			} & ColorPickerResponse
	  }

export function colorPicker(params: ColorPickerParams): Promise<ColorPickerResponse> {
	return new Promise<ColorPickerResponse>(resolve => {
		const id = randomUUID()

		const sub = events.subscribe("colorPicker", e => {
			if (e.type === "response" && e.data.id === id) {
				sub.remove()

				resolve(e.data)
			}
		})

		events.emit("colorPicker", {
			type: "request",
			data: {
				...params,
				id
			}
		})
	})
}

export const ColorPickerSheet = memo(() => {
	const ref = useSheetRef()
	const [currentColor, setCurrentColor] = useState<string | null>(null)
	const selectedColorRef = useRef<string | null>(null)
	const id = useRef<string>("")
	const insets = useSafeAreaInsets()

	const onSelectColor = useCallback(({ hex }: { hex: string }) => {
		selectedColorRef.current = hex
	}, [])

	const close = useCallback(() => {
		events.emit("colorPicker", {
			type: "response",
			data: {
				id: id.current,
				cancelled: true
			}
		})

		ref?.current?.forceClose()

		setCurrentColor(null)

		id.current = ""
		selectedColorRef.current = null
	}, [ref])

	const select = useCallback(() => {
		events.emit("colorPicker", {
			type: "response",
			data: {
				id: id.current,
				cancelled: false,
				color: selectedColorRef.current ?? DEFAULT_DIRECTORY_COLOR
			}
		})

		ref?.current?.forceClose()

		setCurrentColor(null)

		id.current = ""
	}, [ref])

	const onChange = useCallback(
		(index: number) => {
			if (index === -1) {
				close()
			}
		},
		[close]
	)

	useEffect(() => {
		const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
			if (id.current.length > 0) {
				close()

				return true
			}

			return false
		})

		return () => {
			backHandler.remove()
		}
	}, [close])

	useEffect(() => {
		const sub = events.subscribe("colorPicker", e => {
			if (e.type === "request") {
				id.current = e.data.id

				setCurrentColor(e.data.currentColor)

				ref?.current?.present()
			}
		})

		return () => {
			sub.remove()
		}
	}, [ref])

	return (
		<Sheet
			ref={ref}
			onChange={onChange}
			enablePanDownToClose={true}
			bottomInset={insets.bottom}
		>
			<BottomSheetView className="flex-1 items-center justify-center pb-8">
				<ColorPickerComponent
					style={{
						width: "100%"
					}}
					value={typeof currentColor === "string" ? currentColor : DEFAULT_DIRECTORY_COLOR}
					onCompleteJS={onSelectColor}
				>
					<Preview
						style={{
							borderRadius: 0
						}}
					/>
					<Panel1
						style={{
							borderRadius: 0
						}}
					/>
					<HueSlider
						style={{
							borderRadius: 0
						}}
					/>
				</ColorPickerComponent>
				<View className="flex flex-row items-center justify-center gap-4 p-4 pt-8">
					<Button
						variant="secondary"
						onPress={close}
					>
						<Text>{translateMemoized("sheets.colorPicker.cancel")}</Text>
					</Button>
					<Button
						variant="primary"
						onPress={select}
					>
						<Text>{translateMemoized("sheets.colorPicker.select")}</Text>
					</Button>
				</View>
			</BottomSheetView>
		</Sheet>
	)
})

ColorPickerSheet.displayName = "ColorPickerSheet"

export default ColorPickerSheet
