import React, { useState, useEffect, memo, useRef, useCallback } from "react"
import {
	TextInput,
	Keyboard,
	ScrollView,
	Platform,
	NativeSyntheticEvent,
	TextInputSelectionChangeEventData,
	TextInputKeyPressEventData
} from "react-native"
import { getColor } from "../../style"

export type TextSelection = { start: number; end: number }

const TextEditor = memo(
	({
		value,
		darkMode,
		onChange,
		readOnly,
		placeholder
	}: {
		value: string
		darkMode: boolean
		onChange?: (value: string) => void
		readOnly: boolean
		placeholder: string
	}) => {
		const [text, setText] = useState<string>(value)
		const ref = useRef<TextInput>()
		const scrollRef = useRef<ScrollView>()
		const intitialValue = useRef<string>(value).current
		const didInitialAdjustments = useRef<boolean>(Platform.OS === "ios")
		const [selection, setSelection] = useState<TextSelection>({ end: 0, start: 0 })

		const onKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
			if (e.nativeEvent.key === "Enter") {
				e.stopPropagation()
			}
		}, [])

		const onSelectionChange = useCallback(
			(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
				if (!didInitialAdjustments.current || Platform.OS !== "android") {
					return
				}

				setSelection(e.nativeEvent.selection)
			},
			[setSelection, didInitialAdjustments]
		)

		useEffect(() => {
			if (typeof onChange === "function" && !readOnly) {
				onChange(text)
			}
		}, [text, readOnly])

		useEffect(() => {
			if (Platform.OS === "android" && !didInitialAdjustments.current) {
				didInitialAdjustments.current = true

				ref?.current?.setNativeProps({ selection: { start: 0, end: 0 } })
				ref?.current?.focus()
			}
		}, [])

		return (
			<ScrollView
				ref={scrollRef}
				scrollEventThrottle={100}
				showsHorizontalScrollIndicator={false}
				keyboardDismissMode="on-drag"
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary")
				}}
			>
				<TextInput
					ref={ref}
					value={text}
					onChangeText={setText}
					multiline={true}
					autoCapitalize="none"
					autoComplete="off"
					autoCorrect={false}
					autoFocus={intitialValue.length === 0}
					scrollEnabled={false}
					inputMode="text"
					maxFontSizeMultiplier={0}
					allowFontScaling={false}
					selection={selection}
					onKeyPress={onKeyPress}
					onSelectionChange={onSelectionChange}
					editable={!readOnly}
					placeholder={placeholder}
					style={{
						height: "100%",
						width: "100%",
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary"),
						paddingBottom: 100,
						paddingLeft: 15,
						paddingRight: 15,
						fontSize: 16
					}}
				/>
			</ScrollView>
		)
	}
)

export default TextEditor
