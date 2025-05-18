import { memo, useCallback, useMemo } from "react"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { Toolbar as ToolbarComponent, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import events from "@/lib/events"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useShallow } from "zustand/shallow"

export const Toolbar = memo(() => {
	const { canGoBack, dismissTo } = useRouter()
	const selectedItems = useSelectDriveItemsStore(useShallow(state => state.selectedItems))
	const { id, max, type, dismissHref } = useLocalSearchParams()

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const typeParsed = useMemo(() => {
		return typeof type === "string" ? (type as "file" | "directory") : "directory"
	}, [type])

	const canSubmit = useMemo(() => {
		return (
			canGoBack() &&
			selectedItems.length > 0 &&
			typeof id === "string" &&
			maxParsed >= selectedItems.length &&
			(typeParsed === "directory"
				? !selectedItems.some(item => item.type === "file")
				: !selectedItems.some(item => item.type === "directory"))
		)
	}, [canGoBack, selectedItems, id, maxParsed, typeParsed])

	const iosHint = useMemo(() => {
		return maxParsed <= 1
			? selectedItems.at(0)
				? `${selectedItems.at(0)?.name} selected`
				: undefined
			: `${selectedItems.length} selected`
	}, [maxParsed, selectedItems])

	const submit = useCallback(() => {
		if (!canSubmit) {
			return
		}

		events.emit("selectDriveItems", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: false,
				items: selectedItems
			}
		})

		dismissTo(typeof dismissHref === "string" ? dismissHref : "/drive")
	}, [id, canSubmit, dismissTo, selectedItems, dismissHref])

	const createDirectory = useCallback(async () => {
		const inputPromptResponse = await inputPrompt({
			title: "new dir",
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: ""
			}
		})

		if (inputPromptResponse.cancelled || inputPromptResponse.type !== "text") {
			return
		}

		const name = inputPromptResponse.text.trim()

		if (name.length === 0) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await new Promise<void>(resolve => setTimeout(resolve, 1000))

			alerts.normal(`${inputPromptResponse.text} created`)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [])

	return (
		<ToolbarComponent
			iosBlurIntensity={100}
			iosHint={iosHint}
			leftView={
				<ToolbarIcon
					icon={{
						name: "plus"
					}}
					onPress={createDirectory}
				/>
			}
			rightView={
				<ToolbarCTA
					disabled={!canSubmit}
					icon={{
						name: "check-circle-outline"
					}}
					onPress={submit}
				/>
			}
		/>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
