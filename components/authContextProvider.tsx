import { createContext, type PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from "react"

import useIsAuthed from "@/hooks/useIsAuthed"
import alerts from "@/lib/alerts"
import authService from "@/services/auth.service"
import { useAppStateStore } from "@/stores/appState.store"

const AuthContext = createContext<{
	signIn: (email: string, password: string) => Promise<boolean>
	signOut: () => Promise<void>
	forgotPassword: () => Promise<void>
	isAuthed: boolean
	setupDone: boolean
	isLoading: boolean
}>({
	signIn: async () => false,
	signOut: async () => {},
	forgotPassword: async () => {},
	isAuthed: false,
	setupDone: false,
	isLoading: false
})

// Use this hook to access authentication info.
export function useAuthContext() {
	const value = use(AuthContext)
	if (!value) {
		throw new Error("useAuthContext must be wrapped in a <AuthContextProvider />")
	}

	return value
}

export function AuthContextProvider({ children }: PropsWithChildren) {
	const [isAuthed] = useIsAuthed() as [boolean]
	const [setupDone, setSetupDone] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)

	useEffect(() => {
		useAppStateStore.getState().setSetupDone(setupDone)
	}, [setupDone])

	useEffect(() => {
		setIsLoading(true)
		authService
			.setup()
			.then(() => {
				setSetupDone(true)
			})
			.catch(err => {
				console.error(err)

				if (err instanceof Error) {
					alerts.error(err.message)
				}
			})
			.finally(() => {
				setIsLoading(false)
			})
	}, [])

	const signIn = useCallback(async (email: string, password: string) => {
		try {
			return await authService.login({ email, password })
		} catch (err) {
			alerts.error("Login failed.")
			console.error(err)
			return false
		}
	}, [])

	const signOut = useCallback(async () => {
		return authService.logout({})
	}, [])

	const forgotPassword = useCallback(async () => {
		return authService.forgotPassword({})
	}, [])

	const value = useMemo(
		() => ({
			signIn,
			signOut,
			forgotPassword,
			isAuthed,
			setupDone,
			isLoading
		}),
		[signIn, signOut, forgotPassword, isAuthed, setupDone, isLoading]
	)

	return <AuthContext value={value}>{children}</AuthContext>
}
