import React, { useState, useEffect, memo, useRef, useCallback } from "react"
import { TextInput, Keyboard, ScrollView } from "react-native"
import { getColor } from "../../style"

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
		const [scrolling, setScrolling] = useState<boolean>(false)
		const scrollingTimeout = useRef<ReturnType<typeof setTimeout>>()
		const ref = useRef<TextInput>()
		const [keyboardWillShow, setKeyboardWillShow] = useState<boolean>(false)
		const intitialValue = useRef<string>(value).current

		const onScroll = useCallback(() => {
			if (keyboardWillShow || readOnly) {
				return
			}

			setScrolling(true)

			clearTimeout(scrollingTimeout.current)

			scrollingTimeout.current = setTimeout(() => {
				setScrolling(false)
			}, 500)

			if (ref.current) {
				ref.current.blur()
			}

			if (Keyboard.isVisible) {
				Keyboard.dismiss()
			}
		}, [keyboardWillShow, readOnly])

		const onScrollEnd = useCallback(() => {
			if (readOnly) {
				return
			}

			setScrolling(false)

			clearTimeout(scrollingTimeout.current)

			scrollingTimeout.current = setTimeout(() => {
				setScrolling(false)
			}, 500)
		}, [readOnly])

		useEffect(() => {
			if (typeof onChange === "function" && !readOnly) {
				onChange(text)
			}
		}, [text, readOnly])

		useEffect(() => {
			const keyboardWillShowListener = Keyboard.addListener("keyboardWillShow", () => setKeyboardWillShow(true))
			const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => setKeyboardWillShow(false))

			return () => {
				keyboardWillShowListener.remove()
				keyboardDidHideListener.remove()
			}
		}, [])

		return (
			<ScrollView
				onScroll={onScroll}
				scrollEventThrottle={0}
				onScrollAnimationEnd={onScrollEnd}
				onMomentumScrollBegin={onScroll}
				onMomentumScrollEnd={onScrollEnd}
				onScrollBeginDrag={onScroll}
				onScrollEndDrag={onScrollEnd}
				onPointerDown={onScrollEnd}
				onPointerUp={onScrollEnd}
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
					onPressIn={onScrollEnd}
					onPressOut={onScrollEnd}
					editable={readOnly ? false : !scrolling}
					placeholder={placeholder}
					style={{
						height: "auto",
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
