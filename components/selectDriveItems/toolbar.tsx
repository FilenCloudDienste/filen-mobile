import { memo, useCallback, useMemo } from "react"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { Toolbar as ToolbarComponent, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import events from "@/lib/events"
import { inputPrompt } from "@/components/prompts/inputPrompt"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import alerts from "@/lib/alerts"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "react-i18next"
import useSDKConfig from "@/hooks/useSDKConfig"
import nodeWorker from "@/lib/nodeWorker"
import useCloudItemsQuery from "@/queries/useCloudItemsQuery"

export const Toolbar = memo(() => {
	const { canGoBack, dismissTo } = useRouter()
	const selectedItems = useSelectDriveItemsStore(useShallow(state => state.selectedItems))
	const { id, max, type, dismissHref, parent } = useLocalSearchParams()
	const { t } = useTranslation()
	const [{ baseFolderUUID }] = useSDKConfig()

	const maxParsed = useMemo(() => {
		return typeof max === "string" ? parseInt(max) : 1
	}, [max])

	const typeParsed = useMemo(() => {
		return typeof type === "string" ? (type as "file" | "directory") : "directory"
	}, [type])

	const queryParams = useMemo(
		(): FetchCloudItemsParams => ({
			parent: typeof parent === "string" ? parent : baseFolderUUID,
			of: "drive",
			receiverId: 0
		}),
		[parent, baseFolderUUID]
	)

	const query = useCloudItemsQuery({
		...queryParams,
		enabled: false
	})

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
		if (selectedItems.length === 0) {
			return undefined
		}

		return selectedItems.length === 1
			? selectedItems.at(0)
				? t("selectDriveItems.toolbar.selected", {
						countOrName: selectedItems.at(0)?.name
				  })
				: undefined
			: t("selectDriveItems.toolbar.selected", {
					countOrName: selectedItems.length
			  })
	}, [selectedItems, t])

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
			title: t("selectDriveItems.prompts.createDirectory.title"),
			materialIcon: {
				name: "folder-plus-outline"
			},
			prompt: {
				type: "plain-text",
				keyboardType: "default",
				defaultValue: "",
				placeholder: t("selectDriveItems.prompts.createDirectory.placeholder")
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
			await nodeWorker.proxy("createDirectory", {
				name,
				parent: queryParams.parent
			})

			await query.refetch()
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [t, queryParams, query])

	const leftView = useMemo(() => {
		return (
			<ToolbarIcon
				icon={{
					name: "plus"
				}}
				onPress={createDirectory}
			/>
		)
	}, [createDirectory])

	const rightView = useMemo(() => {
		return (
			<ToolbarCTA
				disabled={!canSubmit}
				icon={{
					name: "check-circle-outline"
				}}
				onPress={submit}
			/>
		)
	}, [canSubmit, submit])

	return (
		<ToolbarComponent
			iosBlurIntensity={100}
			iosHint={iosHint}
			leftView={leftView}
			rightView={rightView}
		/>
	)
})

Toolbar.displayName = "Toolbar"

export default Toolbar
