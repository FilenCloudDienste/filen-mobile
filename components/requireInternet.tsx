import { memo } from "react"
import useNetInfo from "@/hooks/useNetInfo"
import { Redirect } from "expo-router"

export const RequireInternet = memo(({ children, redirectHref }: { children: React.ReactNode; redirectHref?: string }) => {
	const { hasInternet } = useNetInfo()

	if (!hasInternet) {
		return <Redirect href={redirectHref ? redirectHref : "/(app)/home"} />
	}

	return children
})

RequireInternet.displayName = "RequireInternet"

export default RequireInternet
