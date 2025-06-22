import { memo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { View, Platform, Image } from "react-native"
import { Link } from "expo-router"
import Container from "@/components/Container"
import { useColorScheme } from "@/lib/useColorScheme"

export const Index = memo(() => {
	const { isDarkColorScheme } = useColorScheme()

	return (
		<Container className="py-8">
			<View className="ios:justify-end flex-1 justify-center gap-4 px-8 py-4">
				<View className="items-center">
					<Image
						source={
							isDarkColorScheme ? require("../../assets/images/logo_light.png") : require("../../assets/images/logo_dark.png")
						}
						className="h-14 w-14"
						resizeMode="contain"
					/>
				</View>
				<View className="pb-5 pt-2">
					<Text className="ios:font-extrabold text-center text-3xl font-medium">Brace Yourself</Text>
					<Text className="ios:font-extrabold text-center text-3xl font-medium">for whats Next</Text>
				</View>
				<Link
					href="/(auth)/register"
					asChild={true}
				>
					<Button
						variant="primary"
						size={Platform.select({
							ios: "lg",
							default: "md"
						})}
					>
						<Text>Sign up for free</Text>
					</Button>
				</Link>
				<Link
					href="/(auth)/login"
					asChild={true}
				>
					<Button
						variant="plain"
						size={Platform.select({
							ios: "lg",
							default: "md"
						})}
					>
						<Text className="text-primary">Log in</Text>
					</Button>
				</Link>
			</View>
		</Container>
	)
})

Index.displayName = "Index"

export default Index
