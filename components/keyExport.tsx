import { memo, useEffect, useRef, useCallback } from "react"
import useAccountQuery from "@/queries/useAccountQuery"
import { alertPrompt } from "./prompts/alertPrompt"
import { useAppStateStore } from "@/stores/appState.store"
import { useShallow } from "zustand/shallow"
import { usePathname } from "expo-router"
import alerts from "@/lib/alerts"
import authService from "@/services/auth.service"
import useIsAuthed from "@/hooks/useIsAuthed"
import nodeWorker from "@/lib/nodeWorker"
import { useTranslation } from "react-i18next"

export const KeyExport = memo(() => {
	const didPrompt = useRef<boolean>(false)
	const biometricVisible = useAppStateStore(useShallow(state => state.biometricVisible))
	const appState = useAppStateStore(useShallow(state => state.appState))
	const setupDone = useAppStateStore(useShallow(state => state.setupDone))
	const pathname = usePathname()
	const [isAuthed] = useIsAuthed()
	const { t } = useTranslation()

	const accountQuery = useAccountQuery({
		enabled: false
	})

	const prompt = useCallback(async () => {
		const response = await alertPrompt({
			title: t("alertPrompt.exportMasterKeys.title"),
			message: t("alertPrompt.exportMasterKeys.message"),
			okText: t("alertPrompt.exportMasterKeys.okText"),
			cancelText: t("alertPrompt.exportMasterKeys.cancelText")
		})

		if (response.cancelled) {
			return
		}

		try {
			await authService.exportMasterKeys({})
			await nodeWorker.proxy("didExportMasterKeys", undefined)
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		}
	}, [t])

	useEffect(() => {
		if (
			!isAuthed ||
			accountQuery.status !== "success" ||
			accountQuery.data?.account.didExportMasterKeys ||
			appState !== "active" ||
			!setupDone ||
			biometricVisible ||
			!["/home", "/drive", "/photos", "/notes", "/chats"].includes(pathname) ||
			didPrompt.current
		) {
			return
		}

		didPrompt.current = true

		prompt()
	}, [
		accountQuery.status,
		appState,
		setupDone,
		accountQuery.data?.account.didExportMasterKeys,
		biometricVisible,
		pathname,
		prompt,
		isAuthed
	])

	return null
})

KeyExport.displayName = "KeyExport"

export default KeyExport
