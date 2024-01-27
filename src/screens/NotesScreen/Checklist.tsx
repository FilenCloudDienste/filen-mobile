import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from "react"
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native"
import { getColor } from "../../style"
import { parseQuillChecklistHtml, convertChecklistItemsToHtml, ChecklistItem } from "./utils"
import Ionicon from "@expo/vector-icons/Ionicons"
import { randomIdUnsafe } from "../../lib/helpers"
import { FlashList } from "@shopify/flash-list"
import useKeyboardOffset from "../../lib/hooks/useKeyboardOffset"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import eventListener from "../../lib/eventListener"
import useDimensions from "../../lib/hooks/useDimensions"

const Item = memo(
	({
		darkMode,
		item,
		items,
		index,
		setItems,
		setIdToFocus,
		setInputRefs,
		readOnly,
		dimensions,
		editorEnabled
	}: {
		darkMode: boolean
		item: ChecklistItem
		items: ChecklistItem[]
		index: number
		setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>
		setIdToFocus: React.Dispatch<React.SetStateAction<string>>
		setInputRefs: React.Dispatch<React.SetStateAction<Record<string, TextInput>>>
		readOnly: boolean
		dimensions: ReturnType<typeof useDimensions>
		editorEnabled: boolean
	}) => {
		const itemIndex = useMemo(() => {
			return items.findIndex(i => i.id === item.id)
		}, [item, items])

		return (
			<View
				style={{
					width: "100%",
					flexDirection: "row",
					alignItems: "center",
					marginBottom: index + 1 >= items.length ? 250 : 12,
					paddingLeft: 25,
					paddingRight: 25
				}}
			>
				{readOnly ? (
					<>
						{item.checked ? (
							<View
								style={{
									width: 22,
									height: 22,
									borderRadius: 22,
									borderColor: getColor(darkMode, "purple"),
									borderBottomWidth: 1,
									borderTopWidth: 1,
									borderLeftWidth: 1,
									borderRightWidth: 1,
									backgroundColor: getColor(darkMode, "purple"),
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									alignSelf: "flex-start",
									marginTop: 4
								}}
							>
								<Ionicon
									name="checkmark"
									size={18}
									color={getColor(darkMode, "backgroundPrimary")}
								/>
							</View>
						) : (
							<View
								style={{
									width: 22,
									height: 22,
									borderRadius: 22,
									borderColor: getColor(darkMode, "textPrimary"),
									borderBottomWidth: 1,
									borderTopWidth: 1,
									borderLeftWidth: 1,
									borderRightWidth: 1,
									alignSelf: "flex-start",
									marginTop: 4
								}}
							/>
						)}
					</>
				) : (
					<>
						{item.checked ? (
							<Pressable
								style={{
									width: 22,
									height: 22,
									borderRadius: 22,
									borderColor: getColor(darkMode, "purple"),
									borderBottomWidth: 1,
									borderTopWidth: 1,
									borderLeftWidth: 1,
									borderRightWidth: 1,
									backgroundColor: getColor(darkMode, "purple"),
									flexDirection: "row",
									alignItems: "center",
									justifyContent: "center",
									alignSelf: "flex-start",
									marginTop: 4
								}}
								onPress={() => {
									if (readOnly) {
										return
									}

									setItems(prev =>
										prev.map(prevItem =>
											prevItem.id === item.id ? { ...prevItem, checked: !prevItem.checked } : prevItem
										)
									)
								}}
								hitSlop={{
									top: 15,
									bottom: 15,
									left: 15,
									right: 15
								}}
							>
								<Ionicon
									name="checkmark"
									size={18}
									color={getColor(darkMode, "backgroundPrimary")}
								/>
							</Pressable>
						) : (
							<Pressable
								style={{
									width: 22,
									height: 22,
									borderRadius: 22,
									borderColor: getColor(darkMode, "textPrimary"),
									borderBottomWidth: 1,
									borderTopWidth: 1,
									borderLeftWidth: 1,
									borderRightWidth: 1,
									alignSelf: "flex-start",
									marginTop: 4
								}}
								onPress={() => {
									if (readOnly) {
										return
									}

									setItems(prev =>
										prev.map(prevItem =>
											prevItem.id === item.id ? { ...prevItem, checked: !prevItem.checked } : prevItem
										)
									)
								}}
								hitSlop={{
									top: 15,
									bottom: 15,
									left: 15,
									right: 15
								}}
							/>
						)}
					</>
				)}
				<TextInput
					ref={ref => setInputRefs(prev => ({ ...prev, [item.id]: ref }))}
					multiline={true}
					scrollEnabled={false}
					autoFocus={false}
					//autoCapitalize="none"
					//autoComplete="off"
					//autoCorrect={false}
					editable={!readOnly && editorEnabled}
					style={{
						color: getColor(darkMode, "textPrimary"),
						marginLeft: 15,
						fontSize: 16,
						paddingRight: 50,
						alignSelf: "flex-start",
						width: "100%"
					}}
					onChangeText={text => {
						if (readOnly) {
							return
						}

						setItems(prev =>
							prev.map(prevItem =>
								prevItem.id === item.id ? { ...prevItem, text: text.split("\n").join("").split("\r").join("") } : prevItem
							)
						)
					}}
					onKeyPress={e => {
						if (readOnly) {
							return
						}

						if (e.nativeEvent.key === "Backspace" && item.text.length <= 0 && items.length - 1 > 0) {
							const indexToRemove = items.findIndex(i => i.id === item.id)
							const newId = items[indexToRemove - 1].id || ""

							setItems(prev => {
								const copied = [...prev]

								copied.splice(indexToRemove, 1)

								return copied
							})

							setTimeout(() => setIdToFocus(newId), 250)
						}
					}}
					blurOnSubmit={true}
					returnKeyType="next"
					onSubmitEditing={e => {
						if (readOnly) {
							return
						}

						if (item.text.length > 0) {
							e.preventDefault()
							e.stopPropagation()

							const newId = randomIdUnsafe()

							setItems(prev => {
								const copied = [...prev]

								copied.splice(itemIndex + 1, 0, {
									id: newId,
									text: "",
									checked: false
								})

								return copied
							})

							setTimeout(() => setIdToFocus(newId), 250)
						}
					}}
					onFocus={() => eventListener.emit("scrollToChecklistIndex", index)}
					hitSlop={{
						top: 15,
						bottom: 15
					}}
				>
					{item.text}
				</TextInput>
			</View>
		)
	}
)

const Checklist = memo(
	({
		darkMode,
		content,
		onChange,
		readOnly
	}: {
		darkMode: boolean
		content: string
		onChange: (html: string) => void
		readOnly: boolean
	}) => {
		const initialItems = useRef<ChecklistItem[]>(parseQuillChecklistHtml(content)).current
		const [items, setItems] = useState<ChecklistItem[]>(initialItems)
		const [idToFocus, setIdToFocus] = useState<string>("")
		const [inputRefs, setInputRefs] = useState<Record<string, TextInput>>({})
		const lastFocusedId = useRef<string>("")
		const keyboardOffset = useKeyboardOffset()
		const insets = useSafeAreaInsets()
		const listRef = useRef<FlashList<ChecklistItem>>()
		const dimensions = useDimensions()
		const [editorEnabled, setEditorEnabled] = useState<boolean>(true)

		const build = useCallback(() => {
			if (items.length <= 0 || readOnly) {
				return
			}

			const built = convertChecklistItemsToHtml(items)

			onChange(built)
		}, [items, readOnly])

		const keyExtractor = useCallback((item: ChecklistItem) => item.id, [])

		const renderItem = useCallback(
			({ item, index }: { item: ChecklistItem; index: number }) => {
				return (
					<Item
						darkMode={darkMode}
						item={item}
						items={items}
						index={index}
						setInputRefs={setInputRefs}
						setItems={setItems}
						setIdToFocus={setIdToFocus}
						readOnly={readOnly}
						dimensions={dimensions}
						editorEnabled={editorEnabled}
					/>
				)
			},
			[darkMode, items, setInputRefs, setItems, setIdToFocus, dimensions, editorEnabled]
		)

		const focusItem = useCallback(
			(id: string) => {
				if (readOnly) {
					return
				}

				if (inputRefs[id] && typeof inputRefs[id].focus === "function" && id !== lastFocusedId.current) {
					lastFocusedId.current = id

					inputRefs[id].focus()

					const index = items.findIndex(item => item.id === id)

					if (index !== 1) {
						eventListener.emit("scrollToChecklistIndex", index)
					}
				}
			},
			[inputRefs, items, readOnly]
		)

		useEffect(() => {
			focusItem(idToFocus)
		}, [idToFocus, inputRefs, items])

		useEffect(() => {
			if (!readOnly && editorEnabled) {
				setTimeout(() => {
					if (items.length === 1 && items[0].text.length === 0) {
						focusItem(items[0].id)
					}
				}, 500)
			}
		}, [idToFocus, inputRefs, items, readOnly, editorEnabled])

		useEffect(() => {
			if (content.length === 0) {
				return
			}

			setItems(parseQuillChecklistHtml(content))
		}, [content])

		useEffect(() => {
			if (!readOnly) {
				build()
			}
		}, [items, readOnly])

		useEffect(() => {
			const scrollToChecklistIndexListener = eventListener.on("scrollToChecklistIndex", (index: number) => {
				if (readOnly) {
					return
				}

				setTimeout(() => {
					listRef?.current?.scrollToIndex({
						animated: true,
						index,
						viewOffset: 0.5
					})
				}, 300)
			})

			return () => {
				scrollToChecklistIndexListener.remove()
			}
		}, [])

		if (content.length <= 0 || items.length <= 0) {
			return null
		}

		return (
			<KeyboardAvoidingView
				behavior={Platform.OS === "android" ? undefined : "padding"}
				keyboardVerticalOffset={keyboardOffset}
				style={{
					width: "100%",
					height: "100%"
				}}
			>
				<FlashList
					ref={listRef}
					data={items}
					renderItem={renderItem}
					keyExtractor={keyExtractor}
					estimatedItemSize={50}
					keyboardDismissMode="on-drag"
					onScrollBeginDrag={() => setEditorEnabled(false)}
					onScrollEndDrag={() => setEditorEnabled(true)}
					estimatedListSize={{
						height: dimensions.height - insets.top - insets.bottom,
						width: dimensions.width - insets.left - insets.right
					}}
					extraData={{
						darkMode,
						items,
						setInputRefs,
						setItems,
						setIdToFocus,
						dimensions
					}}
				/>
			</KeyboardAvoidingView>
		)
	}
)

export default Checklist
