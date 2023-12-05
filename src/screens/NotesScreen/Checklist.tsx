import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from "react"
import { View, Pressable, TextInput, KeyboardAvoidingView, useWindowDimensions } from "react-native"
import { getColor } from "../../style"
import { parseQuillChecklistHtml, convertChecklistItemsToHtml, ChecklistItem } from "./utils"
import Ionicon from "@expo/vector-icons/Ionicons"
import { randomIdUnsafe } from "../../lib/helpers"
import { FlashList } from "@shopify/flash-list"

const Item = memo(
	({
		darkMode,
		item,
		items,
		index,
		setItems,
		setIdToFocus,
		setInputRefs
	}: {
		darkMode: boolean
		item: ChecklistItem
		items: ChecklistItem[]
		index: number
		setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>
		setIdToFocus: React.Dispatch<React.SetStateAction<string>>
		setInputRefs: React.Dispatch<React.SetStateAction<Record<string, TextInput>>>
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
					marginBottom: index + 1 >= items.length ? 200 : 12
				}}
			>
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
						onPress={() =>
							setItems(prev =>
								prev.map(prevItem => (prevItem.id === item.id ? { ...prevItem, checked: !prevItem.checked } : prevItem))
							)
						}
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
						onPress={() =>
							setItems(prev =>
								prev.map(prevItem => (prevItem.id === item.id ? { ...prevItem, checked: !prevItem.checked } : prevItem))
							)
						}
						hitSlop={{
							top: 15,
							bottom: 15,
							left: 15,
							right: 15
						}}
					/>
				)}
				<TextInput
					ref={ref => setInputRefs(prev => ({ ...prev, [item.id]: ref }))}
					multiline={true}
					scrollEnabled={false}
					autoFocus={false}
					autoCapitalize="none"
					autoComplete="off"
					autoCorrect={false}
					style={{
						color: getColor(darkMode, "textPrimary"),
						marginLeft: 15,
						fontSize: 16,
						paddingRight: 50,
						alignSelf: "flex-start",
						width: "100%"
					}}
					onChangeText={text => {
						setItems(prev =>
							prev.map(prevItem =>
								prevItem.id === item.id ? { ...prevItem, text: text.split("\n").join("").split("\r").join("") } : prevItem
							)
						)
					}}
					onKeyPress={e => {
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

const Checklist = memo(({ darkMode, content, onChange }: { darkMode: boolean; content: string; onChange: (html: string) => void }) => {
	const initialItems = useRef<ChecklistItem[]>(parseQuillChecklistHtml(content)).current
	const [items, setItems] = useState<ChecklistItem[]>(initialItems)
	const [idToFocus, setIdToFocus] = useState<string>("")
	const [inputRefs, setInputRefs] = useState<Record<string, TextInput>>({})
	const dimensions = useWindowDimensions()
	const lastFocusedId = useRef<string>("")

	const build = useCallback(() => {
		if (items.length <= 0) {
			return
		}

		const built = convertChecklistItemsToHtml(items)

		onChange(built)
	}, [items])

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
				/>
			)
		},
		[darkMode, items, setInputRefs, setItems, setIdToFocus]
	)

	const focusItem = useCallback(
		(id: string) => {
			if (inputRefs[id] && typeof inputRefs[id].focus === "function" && id !== lastFocusedId.current) {
				lastFocusedId.current = id

				inputRefs[id].focus()
			}
		},
		[inputRefs, items]
	)

	useEffect(() => {
		focusItem(idToFocus)
	}, [idToFocus, inputRefs, items])

	useEffect(() => {
		setTimeout(() => {
			if (items.length === 1 && items[0].text.length === 0) {
				focusItem(items[0].id)
			}
		}, 500)
	}, [idToFocus, inputRefs, items])

	useEffect(() => {
		if (content.length === 0) {
			return
		}

		setItems(parseQuillChecklistHtml(content))
	}, [content])

	useEffect(() => {
		build()
	}, [items])

	if (content.length <= 0 || items.length <= 0) {
		return null
	}

	return (
		<KeyboardAvoidingView
			behavior="padding"
			keyboardVerticalOffset={110}
			style={{
				width: "100%",
				height: "100%"
			}}
		>
			<FlashList
				data={items}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				estimatedItemSize={50}
				estimatedListSize={{
					height: dimensions.height,
					width: dimensions.width
				}}
			/>
		</KeyboardAvoidingView>
	)
})

export default Checklist
