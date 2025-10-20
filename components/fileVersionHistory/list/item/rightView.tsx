import { memo, useCallback, Fragment } from "react"
import type { FileVersion } from "@filen/sdk/dist/types/api/v3/file/versions"
import { Button } from "@/components/nativewindui/Button"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { translateMemoized } from "@/lib/i18n"
import useFileVersionsQuery from "@/queries/useFileVersions.query"
import { useRouter } from "expo-router"

export const RightView = memo(({ item, version }: { item: DriveCloudItem; version: FileVersion }) => {
	const { canGoBack, back } = useRouter()

	const query = useFileVersionsQuery(
		{
			uuid: item.uuid
		},
		{
			enabled: false
		}
	)

	const restoreFileVersion = useCallback(async () => {
		if (item.uuid === version.uuid) {
			return
		}

		const alertPromptResponse = await alertPrompt({
			title: translateMemoized("fileVersionHistory.alerts.restore.title"),
			message: translateMemoized("fileVersionHistory.alerts.restore.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("restoreFileVersion", {
				uuid: version.uuid,
				currentUUID: item.uuid
			})

			if (canGoBack()) {
				back()
			}
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			fullScreenLoadingModal.hide()
		}
	}, [item.uuid, version.uuid, canGoBack, back])

	const deleteItem = useCallback(async () => {
		if (item.uuid === version.uuid) {
			return
		}

		const alertPromptResponse = await alertPrompt({
			title: translateMemoized("fileVersionHistory.alerts.delete.title"),
			message: translateMemoized("fileVersionHistory.alerts.delete.message")
		})

		if (alertPromptResponse.cancelled) {
			return
		}

		fullScreenLoadingModal.show()

		try {
			await nodeWorker.proxy("deleteFile", {
				uuid: version.uuid
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
	}, [item, version, query])

	return (
		<Fragment>
			{item.uuid === version.uuid ? (
				<View className="flex-1 flex-row items-center gap-4 px-4">
					<Button
						variant="tonal"
						size="sm"
					>
						<Text>{translateMemoized("fileVersionHistory.list.item.current")}</Text>
					</Button>
				</View>
			) : (
				<View className="flex-1 flex-row items-center gap-4 px-4">
					<Button
						size="sm"
						variant="secondary"
						onPress={deleteItem}
					>
						<Text>{translateMemoized("fileVersionHistory.list.item.delete")}</Text>
					</Button>
					<Button
						size="sm"
						onPress={restoreFileVersion}
						variant="primary"
					>
						<Text>{translateMemoized("fileVersionHistory.list.item.restore")}</Text>
					</Button>
				</View>
			)}
		</Fragment>
	)
})

RightView.displayName = "RightView"

export default RightView
