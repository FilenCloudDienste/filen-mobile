import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "@/locales/en/en.json"

let initalized: boolean = false

i18n.use(initReactI18next)
	.init({
		resources: {
			en: {
				translation: en
			}
		},
		ns: ["translation"],
		defaultNS: "translation",
		lng: "en",
		debug: true,
		fallbackLng: "en",
		supportedLngs: ["en"],
		interpolation: {
			escapeValue: false
		}
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
