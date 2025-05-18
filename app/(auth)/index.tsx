import { memo, useState, useCallback } from "react"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { View, TextInput } from "react-native"
import nodeWorker from "@/lib/nodeWorker"
import { useRouter } from "expo-router"
import { setIsAuthed, setSDKConfig } from "@/lib/auth"
import setup from "@/lib/setup"

export const Index = memo(() => {
	const [email, setEmail] = useState<string>("")
	const [password, setPassword] = useState<string>("")
	const router = useRouter()

	const login = useCallback(async () => {
		try {
			const sdkConfig = await nodeWorker.proxy("login", {
				email,
				password,
				twoFactorCode: "XXXXXX"
			})

			await setup({
				isAuthed: true,
				sdkConfig
			})

			setSDKConfig(sdkConfig)
			setIsAuthed(true)

			router.replace("/(app)/home")
		} catch (e) {
			if (e instanceof Error) {
				console.error(e.message)
			}
		}
	}, [email, password, router])

	return (
		<View className="flex flex-col w-full h-full items-center justify-center p-4 gap-2">
			<TextInput
				className="bg-white rounded-md w-full h-auto p-3 text-black"
				placeholder="email"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				className="bg-white rounded-md w-full h-auto p-3 text-black"
				placeholder="password"
				value={password}
				onChangeText={setPassword}
			/>
			<Button onPress={login}>
				<Text>Login</Text>
			</Button>
		</View>
	)
})

Index.displayName = "Index"

export default Index
