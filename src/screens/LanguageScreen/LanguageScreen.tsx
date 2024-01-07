import React, { memo } from "react"
import { View, ScrollView } from "react-native"
import useLang from "../../lib/hooks/useLang"
import storage from "../../lib/storage"
import { i18n } from "../../i18n"
import { SettingsGroup, SettingsButtonLinkHighlight } from "../SettingsScreen/SettingsScreen"
import { NavigationContainerRef } from "@react-navigation/native"
import DefaultTopBar from "../../components/TopBar/DefaultTopBar"
import { getColor } from "../../style"
import useDarkMode from "../../lib/hooks/useDarkMode"

export interface LanguageScreenProps {
	navigation: NavigationContainerRef<ReactNavigation.RootParamList>
}

export const LanguageScreen = memo(({ navigation }: LanguageScreenProps) => {
	const darkMode = useDarkMode()
	const lang = useLang()

	return (
		<>
			<DefaultTopBar
				onPressBack={() => navigation.goBack()}
				leftText={i18n(lang, "settings")}
				middleText={i18n(lang, "language")}
			/>
			<ScrollView
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: getColor(darkMode, "backgroundPrimary"),
					marginTop: 10
				}}
			>
				<SettingsGroup marginTop={5}>
					<SettingsButtonLinkHighlight
						title="English"
						onPress={() => storage.set("lang", "en")}
						withBottomBorder={true}
						borderTopRadius={10}
					/>
					<SettingsButtonLinkHighlight
						title="Deutsch"
						onPress={() => storage.set("lang", "de")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Español"
						onPress={() => storage.set("lang", "es")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Français"
						onPress={() => storage.set("lang", "fr")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Italiano"
						onPress={() => storage.set("lang", "it")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Nederlands"
						onPress={() => storage.set("lang", "nl")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Polski"
						onPress={() => storage.set("lang", "pl")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Norsk bokmål"
						onPress={() => storage.set("lang", "nb")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Slovak"
						onPress={() => storage.set("lang", "sk")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Português"
						onPress={() => storage.set("lang", "pt")}
						borderBottomRadius={10}
					/>
					<SettingsButtonLinkHighlight
						title="Русский"
						onPress={() => storage.set("lang", "ru")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Türk"
						onPress={() => storage.set("lang", "tr")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Українська"
						onPress={() => storage.set("lang", "uk")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="日本語"
						onPress={() => storage.set("lang", "ja")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="简体字"
						onPress={() => storage.set("lang", "zh")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="Ελληνικά"
						onPress={() => storage.set("lang", "el")}
						withBottomBorder={true}
					/>
					<SettingsButtonLinkHighlight
						title="한국어"
						onPress={() => storage.set("lang", "ko")}
						withBottomBorder={false}
						borderBottomRadius={10}
					/>
				</SettingsGroup>
				<View style={{ height: 25 }}></View>
			</ScrollView>
		</>
	)
})
