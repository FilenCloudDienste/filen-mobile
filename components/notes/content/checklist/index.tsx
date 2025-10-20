import { memo, useCallback, useState, useEffect } from "react"
import { ScrollView } from "react-native"
import { parser, type ChecklistItem } from "./parser"
import Item from "./item"
import events from "@/lib/events"
import { randomUUID } from "expo-crypto"

export const Checklist = memo(
	({
		initialValue,
		onValueChange,
		readOnly,
		onDidType
	}: {
		initialValue: string
		onValueChange: (value: string) => void
		readOnly: boolean
		onDidType: (value: string) => void
	}) => {
		const [parsed, setParsed] = useState<ChecklistItem[]>(parser.parse(initialValue))
		const [initialIds] = useState<string[]>(parsed.map(i => i.id))
		const [didType, setDidType] = useState<boolean>(false)

		const onContentChange = useCallback(({ item, content }: { item: ChecklistItem; content: string }) => {
			setParsed(prev =>
				prev.map(i =>
					i.id === item.id
						? {
								...i,
								content
						  }
						: i
				)
			)
		}, [])

		const onCheckedChange = useCallback(({ item, checked }: { item: ChecklistItem; checked: boolean }) => {
			setParsed(prev =>
				prev.map(i =>
					i.id === item.id
						? {
								...i,
								checked
						  }
						: i
				)
			)
		}, [])

		const addNewLine = useCallback(
			(after: ChecklistItem) => {
				const nextIndex = parsed.findIndex(i => i.id === after.id) + 1

				if (nextIndex > 0 && parsed[nextIndex] && parsed[nextIndex].content.trim().length === 0) {
					events.emit("focusNotesChecklistItem", {
						id: parsed[nextIndex].id
					})

					return
				}

				const id = randomUUID()

				setParsed(prev => {
					const newList = [...prev]
					const index = prev.findIndex(i => i.id === after.id)

					newList.splice(index + 1, 0, {
						id,
						checked: false,
						content: ""
					})

					return newList
				})

				events.emit("focusNotesChecklistItem", {
					id
				})

				setTimeout(() => {
					events.emit("focusNotesChecklistItem", {
						id
					})
				})

				setTimeout(() => {
					events.emit("focusNotesChecklistItem", {
						id
					})
				}, 1)
			},
			[parsed]
		)

		const removeItem = useCallback(
			(item: ChecklistItem) => {
				if (parsed.length === 1) {
					setParsed([
						{
							id: randomUUID(),
							checked: false,
							content: ""
						}
					])

					return
				}

				const index = parsed.findIndex(i => i.id === item.id)

				if (index === -1 || index === 0) {
					return
				}

				const prevItem = parsed[index - 1]

				setParsed(prev => prev.filter(i => i.id !== item.id))

				if (prevItem) {
					events.emit("focusNotesChecklistItem", {
						id: prevItem.id
					})

					setTimeout(() => {
						events.emit("focusNotesChecklistItem", {
							id: prevItem.id
						})
					})

					setTimeout(() => {
						events.emit("focusNotesChecklistItem", {
							id: prevItem.id
						})
					}, 1)
				}
			},
			[parsed]
		)

		const onTyped = useCallback(() => {
			setDidType(true)
		}, [])

		useEffect(() => {
			if (didType) {
				onValueChange(parser.stringify(parsed))
				onDidType(parser.stringify(parsed))
			}
		}, [parsed, onValueChange, didType, onDidType])

		return (
			<ScrollView
				style={{
					flex: 1
				}}
				contentInsetAdjustmentBehavior="automatic"
				contentContainerClassName="p-4 px-6 pb-[500px] flex-col gap-2"
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="interactive"
			>
				{parsed.map(item => {
					return (
						<Item
							key={item.id}
							item={item}
							onContentChange={onContentChange}
							onCheckedChange={onCheckedChange}
							addNewLine={addNewLine}
							removeItem={removeItem}
							initialIds={initialIds}
							readOnly={readOnly}
							onDidType={onTyped}
						/>
					)
				})}
			</ScrollView>
		)
	}
)

Checklist.displayName = "Checklist"

export default Checklist
