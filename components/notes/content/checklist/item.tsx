import { memo, useCallback, useRef, useEffect, useMemo } from "react"
import { View, TextInput, type TextInputKeyPressEvent, Platform, type TextInputSubmitEditingEvent } from "react-native"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { useColorScheme } from "@/lib/useColorScheme"
import type { ChecklistItem } from "./parser"
import events from "@/lib/events"
import { Button } from "@/components/nativewindui/Button"
import * as Haptics from "expo-haptics"
import { cn } from "@/lib/cn"

export const Item = memo(
	({
		item,
		onContentChange,
		onCheckedChange,
		addNewLine,
		removeItem,
		initialIds,
		readOnly,
		onDidType
	}: {
		item: ChecklistItem
		onContentChange: ({ item, content }: { item: ChecklistItem; content: string }) => void
		onCheckedChange: ({ item, checked }: { item: ChecklistItem; checked: boolean }) => void
		addNewLine: (after: ChecklistItem) => void
		removeItem: (item: ChecklistItem) => void
		initialIds: string[]
		readOnly: boolean
		onDidType: () => void
	}) => {
		const { colors } = useColorScheme()
		const textInputRef = useRef<TextInput>(null)

		const normalizeItemContent = useCallback((content: string) => {
			return content.replace(/\n/g, "")
		}, [])

		const toggleChecked = useCallback(() => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

			if (!item.checked && normalizeItemContent(item.content).trim().length === 0) {
				return
			}

			onCheckedChange({
				item,
				checked: !item.checked
			})

			onDidType()
		}, [onCheckedChange, item, onDidType, normalizeItemContent])

		const onChangeText = useCallback(
			(text: string) => {
				onContentChange({
					item,
					content: normalizeItemContent(text)
				})
			},
			[onContentChange, item, normalizeItemContent]
		)

		const focusItem = useCallback(() => {
			textInputRef?.current?.focus()
		}, [])

		const focusItemEnd = useCallback(() => {
			textInputRef?.current?.setSelection(item.content.length, item.content.length)
			textInputRef?.current?.focus()
		}, [item.content.length])

		const onSubmitEditing = useCallback(
			(e: TextInputSubmitEditingEvent) => {
				e.preventDefault()
				e.stopPropagation()

				if (item.content.length > 0) {
					addNewLine(item)
				} else {
					focusItem()
				}
			},
			[item, addNewLine, focusItem]
		)

		const onKeyPress = useCallback(
			(e: TextInputKeyPressEvent) => {
				e.preventDefault()
				e.stopPropagation()

				if (e.nativeEvent.key === "Enter") {
					onSubmitEditing(e as unknown as TextInputSubmitEditingEvent)
				}

				if (e.nativeEvent.key === "Backspace" && item.content.length === 0) {
					removeItem(item)
				}

				onDidType()
			},
			[item, removeItem, onDidType, onSubmitEditing]
		)

		const itemContent = useMemo(() => {
			return normalizeItemContent(item.content)
		}, [item.content, normalizeItemContent])

		useEffect(() => {
			const focusNotesChecklistItemListener = events.subscribe("focusNotesChecklistItem", ({ id }) => {
				if (item.id === id) {
					focusItemEnd()
				}
			})

			return () => {
				focusNotesChecklistItemListener.remove()
			}
		}, [focusItemEnd, item.id])

		return (
			<View className={cn("flex-row flex-1 items-center", Platform.OS === "android" ? "gap-2" : "gap-3")}>
				<View className="flex-row items-center self-start pt-[4px] shrink-0">
					{item.checked ? (
						<Button
							variant="plain"
							size="none"
							className="flex-row items-center justify-center w-5 h-5 rounded-full"
							style={{
								backgroundColor: colors.primary
							}}
							onPress={toggleChecked}
							hitSlop={5}
							disabled={readOnly}
						>
							<MaterialIcons
								name="check"
								size={16}
								color={colors.background}
							/>
						</Button>
					) : (
						<Button
							variant="plain"
							size="none"
							className="flex-row items-center justify-center w-5 h-5 bg-background border border-gray-500 rounded-full"
							onPress={toggleChecked}
							hitSlop={5}
							disabled={readOnly}
						/>
					)}
				</View>
				<TextInput
					ref={textInputRef}
					className={cn("text-foreground text-[17px] shrink-0 flex-1", Platform.OS === "android" && "-mt-[7.5px]")}
					value={itemContent}
					onChangeText={onChangeText}
					multiline={true}
					scrollEnabled={false}
					onPress={focusItem}
					onSubmitEditing={onSubmitEditing}
					onKeyPress={onKeyPress}
					returnKeyType="next"
					keyboardType="default"
					keyboardAppearance="default"
					autoFocus={!initialIds.includes(item.id)}
					editable={!readOnly}
				/>
			</View>
		)
	}
)

Item.displayName = "Item"

export default Item
