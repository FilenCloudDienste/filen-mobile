import React, { useState, useEffect, memo } from "react"
import { Text, ScrollView, ActivityIndicator } from "react-native"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import { showToast } from "../../components/Toasts"
import { fetchGDPRInfo } from "../../lib/api"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"

export const GDPRScreen = memo(({ navigation }: { navigation: any }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [gdpr, setGdpr] = useState<string>("")
	const [isLoading, setIsLoading] = useState<boolean>(true)

	useEffect(() => {
		fetchGDPRInfo()
			.then(info => {
				setGdpr(JSON.stringify(info, null, 2))
				setIsLoading(false)
			})
			.catch(err => {
				console.log(err)

				showToast({ message: err.toString() })
			})
	}, [])

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "accountSettings")}
				middleText={i18n(lang, "showGDPR")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				{isLoading ? (
					<ActivityIndicator
						size={"small"}
						color={getColor(darkMode, "textPrimary")}
						style={{
							marginTop: "70%"
						}}
					/>
				) : (
					<Text
						style={{
							color: getColor(darkMode, "textPrimary"),
							paddingLeft: 20,
							paddingRight: 20,
							paddingTop: 5,
							paddingBottom: 25
						}}
					>
						{gdpr}
					</Text>
				)}
			</ScrollView>
		</>
	)
})
