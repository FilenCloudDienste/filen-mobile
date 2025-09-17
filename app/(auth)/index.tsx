import { memo, useMemo } from "react"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { View, Platform, Image } from "react-native"
import { Link } from "expo-router"
import Container from "@/components/Container"
import { useColorScheme } from "@/lib/useColorScheme"
import { useTranslation } from "react-i18next"

const buttonSize = Platform.select({
	ios: "lg",
	default: "md"
}) as "md" | "lg"

export const Index = memo(() => {
	const { isDarkColorScheme } = useColorScheme()
	const { t } = useTranslation()

	const logoSource = useMemo(() => {
		return isDarkColorScheme ? require("../../assets/images/logo_light.png") : require("../../assets/images/logo_dark.png")
	}, [isDarkColorScheme])

	return (
		<Container className="py-8">
			<View className="ios:justify-end flex-1 justify-center gap-4 px-8 py-4">
				<View className="items-center">
					<Image
						source={logoSource}
						className="h-14 w-14"
						resizeMode="contain"
					/>
				</View>
				<View className="pb-5 pt-2">
					<Text className="ios:font-extrabold text-center text-3xl font-medium">{t("auth.index.hero.first")}</Text>
					<Text className="ios:font-extrabold text-center text-3xl font-medium">{t("auth.index.hero.second")}</Text>
				</View>
				<Link
					href="/(auth)/register"
					asChild={true}
				>
					<Button
						testID="signup_button"
						variant="primary"
						size={buttonSize}
					>
						<Text>{t("auth.index.signUp")}</Text>
					</Button>
				</Link>
				<Link
					href="/(auth)/login"
					asChild={true}
				>
					<Button
						testID="login_button"
						variant="plain"
						size={buttonSize}
					>
						<Text className="text-primary">{t("auth.index.login")}</Text>
					</Button>
				</Link>
			</View>
		</Container>
	)
})

Index.displayName = "Index"

export default Index
