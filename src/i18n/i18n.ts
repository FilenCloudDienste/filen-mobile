import { bg } from "./lang/bg"
import { cs } from "./lang/cs"
import { de } from "./lang/de"
import { el } from "./lang/el"
import { en } from "./lang/en"
import { es } from "./lang/es"
import { fr } from "./lang/fr"
import { hu } from "./lang/hu"
import { it } from "./lang/it"
import { ja } from "./lang/ja"
import { ko } from "./lang/ko"
import { nb } from "./lang/nb"
import { nl } from "./lang/nl"
import { pl } from "./lang/pl"
import { pt } from "./lang/pt"
import { ru } from "./lang/ru"
import { tr } from "./lang/tr"
import { sk } from "./lang/sk"
import { sr } from "./lang/sr"
import { uk } from "./lang/uk"
import { zh } from "./lang/zh"

export const translations: Record<string, Record<string, string>> = {
	bg,
	cs,
	de,
	el,
	en,
	es,
	fr,
	hu,
	it,
	ja,
	ko,
	nb,
	nl,
	pl,
	pt,
	ru,
	tr,
	sk,
	sr,
	uk,
	zh
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
