import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "@/locales/en/en.json"
import * as ExpoLocalization from "expo-localization"

let initalized: boolean = false
let locales: string[] = ["en"]

try {
	locales = ExpoLocalization.getLocales()
		.map(locale => locale.languageCode ?? "")
		.filter(locale => locale.length > 0)
} catch (e) {
	console.error(e)
}

i18n.use(initReactI18next)
	.init({
		resources: {
			en: {
				translation: en
			}
		},
		ns: ["translation"],
		defaultNS: "translation",
		lng: locales.at(0)?.trim().toLowerCase() ?? "en",
		debug: __DEV__,
		fallbackLng: "en",
		supportedLngs: ["en", "de"]
	})
	.then(() => {
		initalized = true
	})
	.catch(console.error)

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
