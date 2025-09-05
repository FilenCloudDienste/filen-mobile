import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import * as ExpoLocalization from "expo-localization"
import { en, de, hu } from "@/locales"

//TODO: adapt views in the future to support textDirection for set locale (e.g. right-to-left/left-to-right), rename left/right views to leading/trailing as part of this

const resources = {
	en: { translation: en },
	de: { translation: de },
	hu: { translation: hu }
}

const DEFAULT_LANGUAGE = "en"
function getLocale() {
	const deviceLanguage = ExpoLocalization.getLocales()?.[0]?.languageCode ?? DEFAULT_LANGUAGE
	const isLanguageSupported = Object.keys(resources).includes(deviceLanguage)
	return isLanguageSupported ? deviceLanguage : DEFAULT_LANGUAGE
}

let initalized: boolean = false

function initI18n() {
	const language = getLocale()
	i18n.use(initReactI18next)
		.init({
			resources,
			lng: language,
			fallbackLng: DEFAULT_LANGUAGE,
			ns: ["translation"],
			defaultNS: "translation",
			debug: __DEV__
		})
		.then(() => {
			initalized = true
		})
		.catch(console.error)
}

initI18n()

export function isInitialized(): boolean {
	return initalized
}

export async function waitForInitialization(): Promise<void> {
	while (!initalized) {
		await new Promise(resolve => setTimeout(resolve, 100))
	}
}

export const t = i18n.t

export default i18n
