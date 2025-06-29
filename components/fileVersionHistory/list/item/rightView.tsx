import { memo, useCallback, Fragment } from "react"
import { type FileVersion } from "@filen/sdk/dist/types/api/v3/file/versions"
import { Button } from "@/components/nativewindui/Button"
import { View } from "react-native"
import { Text } from "@/components/nativewindui/Text"
import { alertPrompt } from "@/components/prompts/alertPrompt"
import nodeWorker from "@/lib/nodeWorker"
import alerts from "@/lib/alerts"
import fullScreenLoadingModal from "@/components/modals/fullScreenLoadingModal"
import { useTranslation } from "react-i18next"
import useFileVersionsQuery from "@/queries/useFileVersionsQuery"
import { useRouter } from "expo-router"

export const RightView = memo(({ item, version }: { item: DriveCloudItem; version: FileVersion }) => {
	const { t } = useTranslation()
	const { canGoBack, back } = useRouter()

	const query = useFileVersionsQuery({
		uuid: item.uuid,
		enabled: false
	})

	const restoreFileVersion = useCallback(async () => {
		if (item.uuid === version.uuid) {
			return
		}

		const alertPromptResponse = await alertPrompt({
			title: t("fileVersionHistory.alerts.restore.title"),
			message: t("fileVersionHistory.alerts.restore.message")
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
	}, [t, item.uuid, version.uuid, canGoBack, back])

	const deleteItem = useCallback(async () => {
		if (item.uuid === version.uuid) {
			return
		}

		const alertPromptResponse = await alertPrompt({
			title: t("fileVersionHistory.alerts.delete.title"),
			message: t("fileVersionHistory.alerts.delete.message")
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
	}, [t, item, version, query])

	return (
		<Fragment>
			{item.uuid === version.uuid ? (
				<View className="flex-1 flex-row items-center gap-4 px-4">
					<Button
						variant="tonal"
						size="sm"
					>
						<Text>{t("fileVersionHistory.list.item.current")}</Text>
					</Button>
				</View>
			) : (
				<View className="flex-1 flex-row items-center gap-4 px-4">
					<Button
						size="sm"
						variant="secondary"
						onPress={deleteItem}
					>
						<Text>{t("fileVersionHistory.list.item.delete")}</Text>
					</Button>
					<Button
						size="sm"
						onPress={restoreFileVersion}
						variant="primary"
					>
						<Text>{t("fileVersionHistory.list.item.restore")}</Text>
					</Button>
				</View>
			)}
		</Fragment>
	)
})

RightView.displayName = "RightView"

export default RightView
