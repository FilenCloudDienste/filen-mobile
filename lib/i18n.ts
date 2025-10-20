import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import * as ExpoLocalization from "expo-localization"
import memoize from "lodash/memoize"
import bn from "@/locales/bn.json"
import cs from "@/locales/cs.json"
import da from "@/locales/da.json"
import de from "@/locales/de.json"
import en from "@/locales/en.json"
import es from "@/locales/es.json"
import fi from "@/locales/fi.json"
import fr from "@/locales/fr.json"
import he from "@/locales/he.json"
import hi from "@/locales/hi.json"
import hu from "@/locales/hu.json"
import id from "@/locales/id.json"
import it from "@/locales/it.json"
import ja from "@/locales/ja.json"
import ko from "@/locales/ko.json"
import nl from "@/locales/nl.json"
import no from "@/locales/no.json"
import pl from "@/locales/pl.json"
import pt from "@/locales/pt.json"
import ro from "@/locales/ro.json"
import ru from "@/locales/ru.json"
import sv from "@/locales/sv.json"
import th from "@/locales/th.json"
import uk from "@/locales/uk.json"
import ur from "@/locales/ur.json"
import vi from "@/locales/vi.json"
import zh from "@/locales/zh.json"

export const resources = {
	en: {
		translation: en
	},
	de: {
		translation: de
	},
	fr: {
		translation: fr
	},
	id: {
		translation: id
	},
	it: {
		translation: it
	},
	ja: {
		translation: ja
	},
	ko: {
		translation: ko
	},
	nl: {
		translation: nl
	},
	no: {
		translation: no
	},
	pl: {
		translation: pl
	},
	pt: {
		translation: pt
	},
	ro: {
		translation: ro
	},
	ru: {
		translation: ru
	},
	sv: {
		translation: sv
	},
	th: {
		translation: th
	},
	uk: {
		translation: uk
	},
	ur: {
		translation: ur
	},
	vi: {
		translation: vi
	},
	zh: {
		translation: zh
	},
	es: {
		translation: es
	},
	hi: {
		translation: hi
	},
	hu: {
		translation: hu
	},
	cs: {
		translation: cs
	},
	da: {
		translation: da
	},
	bn: {
		translation: bn
	},
	fi: {
		translation: fi
	},
	he: {
		translation: he
	}
} as const

const DEFAULT_LANGUAGE = "en"

export function getLocale() {
	const deviceLanguage = ExpoLocalization.getLocales()?.[0]?.languageCode ?? DEFAULT_LANGUAGE
	const isLanguageSupported = Object.keys(resources).includes(deviceLanguage)

	return isLanguageSupported ? deviceLanguage : DEFAULT_LANGUAGE
}

let initalized: boolean = false

export function initI18n() {
	const language = getLocale()

	i18n.use(initReactI18next)
		.init({
			resources,
			lng: language,
			fallbackLng: DEFAULT_LANGUAGE,
			ns: ["translation"],
			defaultNS: "translation",
			supportedLngs: [
				"en",
				"de",
				"fr",
				"id",
				"it",
				"ja",
				"ko",
				"nl",
				"no",
				"pl",
				"pt",
				"ro",
				"ru",
				"sv",
				"th",
				"uk",
				"ur",
				"vi",
				"zh",
				"es",
				"hi",
				"hu",
				"cs",
				"da",
				"bn",
				"fi",
				"he"
			],
			debug: __DEV__,
			interpolation: {
				escapeValue: false // not needed for react-native as it escapes by default
			},
			react: {
				useSuspense: false
			}
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

export const translateMemoized = memoize((...params: Parameters<typeof i18n.t>) => {
	return i18n.t(...params)
})

export default i18n
