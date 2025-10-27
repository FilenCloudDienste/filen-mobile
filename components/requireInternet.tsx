import { memo } from "react"
import useNetInfo from "@/hooks/useNetInfo"
import { Redirect } from "expo-router"
import { useMMKVString } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"

export const RequireInternet = memo(({ children, redirectHref }: { children: React.ReactNode; redirectHref?: string }) => {
	const { hasInternet } = useNetInfo()
	const [initialRouteName] = useMMKVString("initialRouteName", mmkvInstance)

	if (!hasInternet) {
		return <Redirect href={redirectHref ? redirectHref : `/(app)/${initialRouteName ?? "home"}`} />
	}

	return children
})

RequireInternet.displayName = "RequireInternet"

export default RequireInternet
