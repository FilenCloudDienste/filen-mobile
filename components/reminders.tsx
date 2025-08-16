import { memo, useEffect, useRef, useCallback, useMemo } from "react"
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
import useNetInfo from "@/hooks/useNetInfo"
import Semaphore from "@/lib/semaphore"
import * as Linking from "expo-linking"

const mutex = new Semaphore(1)

export const Reminders = memo(() => {
	const didPromptKeyExport = useRef<boolean>(false)
	const didPromptStorageUsageOverLimit = useRef<boolean>(false)
	const biometricVisible = useAppStateStore(useShallow(state => state.biometricVisible))
	const appState = useAppStateStore(useShallow(state => state.appState))
	const setupDone = useAppStateStore(useShallow(state => state.setupDone))
	const pathname = usePathname()
	const [isAuthed] = useIsAuthed()
	const { t } = useTranslation()
	const { hasInternet } = useNetInfo()

	const accountQuery = useAccountQuery({
		enabled: false
	})

	const promptKeyExport = useCallback(async () => {
		await mutex.acquire()

		try {
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
		} finally {
			mutex.release()
		}
	}, [t])

	const promptStorageUsageOverLimit = useCallback(async () => {
		await mutex.acquire()

		try {
			const response = await alertPrompt({
				title: t("alertPrompt.storageUsageOverLimit.title"),
				message: t("alertPrompt.storageUsageOverLimit.message"),
				okText: t("alertPrompt.storageUsageOverLimit.okText"),
				cancelText: t("alertPrompt.storageUsageOverLimit.cancelText")
			})

			if (response.cancelled) {
				return
			}

			if (!(await Linking.canOpenURL("https://filen.io/pricing"))) {
				throw new Error("Cannot open URL.")
			}

			await Linking.openURL("https://filen.io/pricing")
		} catch (e) {
			console.error(e)

			if (e instanceof Error) {
				alerts.error(e.message)
			}
		} finally {
			mutex.release()
		}
	}, [t])

	const canPrompt = useMemo(() => {
		if (
			!isAuthed ||
			accountQuery.status !== "success" ||
			appState !== "active" ||
			!setupDone ||
			biometricVisible ||
			!["/home", "/drive", "/photos", "/notes", "/chats"].includes(pathname) ||
			!hasInternet
		) {
			return false
		}

		return true
	}, [isAuthed, accountQuery.status, appState, setupDone, biometricVisible, pathname, hasInternet])

	const prompt = useCallback(async () => {
		// Do not prompt immediately after app launch
		await new Promise<void>(resolve => setTimeout(() => resolve(), 3000))

		if (!canPrompt) {
			return
		}

		if (!didPromptKeyExport.current && !accountQuery.data?.account.didExportMasterKeys) {
			didPromptKeyExport.current = true

			promptKeyExport()
		}

		if (
			!didPromptStorageUsageOverLimit.current &&
			(accountQuery.data?.account.storage ?? 0) >= (accountQuery.data?.account.maxStorage ?? 1)
		) {
			didPromptStorageUsageOverLimit.current = true

			promptStorageUsageOverLimit()
		}
	}, [canPrompt, accountQuery, promptKeyExport, promptStorageUsageOverLimit])

	useEffect(() => {
		if (!canPrompt) {
			return
		}

		prompt()
	}, [canPrompt, prompt])

	return null
})

Reminders.displayName = "Reminders"

export default Reminders
