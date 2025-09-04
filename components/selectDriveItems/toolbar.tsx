import { memo, useCallback, useMemo, Fragment } from "react"
import { useSelectDriveItemsStore } from "@/stores/selectDriveItems.store"
import { Toolbar as ToolbarComponent, ToolbarCTA, ToolbarIcon } from "@/components/nativewindui/Toolbar"
import events from "@/lib/events"
import alerts from "@/lib/alerts"
import { useRouter, useGlobalSearchParams } from "expo-router"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "react-i18next"
import useSDKConfig from "@/hooks/useSDKConfig"
import driveService from "@/services/drive.service"
import { Button } from "../nativewindui/Button"
import { Text } from "../nativewindui/Text"

export const Toolbar = memo(() => {
	const { canGoBack, dismissTo, back } = useRouter()
	const selectedItems = useSelectDriveItemsStore(useShallow(state => state.selectedItems))
	const { id, max, type, dismissHref, parent } = useGlobalSearchParams()
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

	const canSubmitRoot = useMemo(() => {
		return (
			canGoBack() &&
			typeParsed === "directory" &&
			selectedItems.length === 0 &&
			maxParsed === 1 &&
			typeof id === "string" &&
			baseFolderUUID === parent &&
			!iosHint
		)
	}, [canGoBack, selectedItems, id, maxParsed, typeParsed, baseFolderUUID, parent, iosHint])

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

		if (typeof dismissHref === "string") {
			dismissTo(dismissHref)
		} else {
			back()
		}
	}, [id, canSubmit, dismissTo, selectedItems, dismissHref, back])

	const createDirectory = useCallback(async () => {
		try {
			await driveService.createDirectory({
				parent: queryParams.parent,
				queryParams
			})
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [queryParams])

	const selectRoot = useCallback(() => {
		if (!canGoBack()) {
			return
		}

		events.emit("selectDriveItems", {
			type: "response",
			data: {
				id: typeof id === "string" ? id : "none",
				cancelled: false,
				items: [
					{
						uuid: baseFolderUUID,
						name: "Cloud Drive",
						type: "directory",
						timestamp: Date.now(),
						lastModified: Date.now(),
						size: 0,
						isShared: false,
						selected: false,
						favorited: false,
						parent: baseFolderUUID,
						color: null
					}
				]
			}
		})

		if (typeof dismissHref === "string") {
			dismissTo(dismissHref)
		} else {
			back()
		}
	}, [id, canGoBack, dismissTo, dismissHref, baseFolderUUID, back])

	const leftView = useMemo(() => {
		return (
			<Fragment>
				<ToolbarIcon
					icon={{
						name: "plus"
					}}
					onPress={createDirectory}
				/>
				{canSubmitRoot && (
					<Button
						variant="plain"
						onPress={selectRoot}
					>
						<Text className="text-blue-500">{t("selectDriveItems.header.selectRoot")}</Text>
					</Button>
				)}
			</Fragment>
		)
	}, [createDirectory, selectRoot, t, canSubmitRoot])

	const rightView = useMemo(() => {
		return (
			<Fragment>
				<ToolbarCTA
					testID="selectDriveItems.toolbar.submit"
					disabled={!canSubmit}
					icon={{
						name: "check"
					}}
					onPress={submit}
				/>
			</Fragment>
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
