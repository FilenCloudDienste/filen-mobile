import { cs } from "./lang/cs"
import { en } from "./lang/en"
import { ja } from "./lang/ja"
import { fr } from "./lang/fr"
import { it } from "./lang/it"
import { ru } from "./lang/ru"
import { uk } from "./lang/uk"
import { nl } from "./lang/nl"
import { nb } from "./lang/nb"
import { pl } from "./lang/pl"
import { zh } from "./lang/zh"
import { tr } from "./lang/tr"
import { de } from "./lang/de"
import { el } from "./lang/el"
import { es } from "./lang/es"
import { ko } from "./lang/ko"
import { pt } from "./lang/pt"
import { sk } from "./lang/sk"
import { bg } from "./lang/bg"
import { hu } from "./lang/hu"

export const translations: Record<string, Record<string, string>> = {
	cs,
	en,
	ja,
	fr,
	it,
	ru,
	uk,
	nl,
	nb,
	pl,
	zh,
	tr,
	de,
	el,
	es,
	ko,
	pt,
	sk,
	bg,
	hu
}

export const i18n = (
	lang: string = "en",
	text: string,
	firstUpperCase: boolean = true,
	replaceFrom: (string | number)[] = [],
	replaceTo: (string | number)[] = []
): string => {
	if (typeof lang !== "string") {
		lang = "en"
	}

	if (typeof translations[lang] === "undefined") {
		lang = "en"
	}

	let gotText = translations[lang][text]

	if (!gotText) {
		if (translations["en"][text]) {
			gotText = translations["en"][text]
		} else {
			return "NO_I18N_" + text
		}
	}

	gotText = gotText.trim()

	if (firstUpperCase) {
		gotText = gotText.charAt(0).toUpperCase() + gotText.slice(1)
	} else {
		gotText = gotText.charAt(0).toLowerCase() + gotText.slice(1)
	}

	if (replaceFrom.length > 0 && replaceTo.length > 0) {
		for (let i = 0; i < replaceFrom.length; i++) {
			gotText = gotText.split(replaceFrom[i] as string).join(replaceTo[i] as string)
		}
	}

	return gotText
}

export const isLanguageAvailable = (lang: string = "en"): boolean => {
	return typeof translations[lang] === "undefined" ? false : true
}
