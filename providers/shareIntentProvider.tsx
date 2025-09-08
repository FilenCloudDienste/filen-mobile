import { memo, useEffect, useCallback } from "react"
import { ShareIntentProvider as OriginalShareIntentProvider, useShareIntentContext } from "expo-share-intent"
import { useRouter, usePathname } from "expo-router"
import { Platform } from "react-native"
import useIsAuthed from "@/hooks/useIsAuthed"

export const AndroidHandler = memo(() => {
	const { hasShareIntent } = useShareIntentContext()
	const { replace } = useRouter()
	const isAuthed = useIsAuthed()

	useEffect(() => {
		if (hasShareIntent && isAuthed) {
			replace({
				pathname: "/shareIntent"
			})
		}
	}, [hasShareIntent, replace, isAuthed])

	return null
})

AndroidHandler.displayName = "AndroidHandler"

export const ShareIntentProvider = memo(({ children }: { children: React.ReactNode }) => {
	const { replace, back, canGoBack } = useRouter()
	const pathname = usePathname()
	const isAuthed = useIsAuthed()

	const onResetShareIntent = useCallback(() => {
		if (!pathname.startsWith("/shareIntent")) {
			return
		}

		if (isAuthed && canGoBack()) {
			back()

			return
		}

		replace({
			pathname: "/"
		})
	}, [pathname, canGoBack, back, replace, isAuthed])

	return (
		<OriginalShareIntentProvider
			options={{
				debug: true,
				resetOnBackground: true,
				onResetShareIntent
			}}
		>
			{Platform.OS === "android" && <AndroidHandler />}
			{children}
		</OriginalShareIntentProvider>
	)
})

ShareIntentProvider.displayName = "ShareIntentProvider"

export default ShareIntentProvider
