import { langs, loadLanguage as uiwLoadLanguage, langNames } from "@uiw/codemirror-extensions-langs"

for (const lang in langNames) {
	uiwLoadLanguage(lang)
}

export function parseExtension(name: string) {
	const normalized = name.toLowerCase().trim()

	if (!normalized.includes(".")) {
		return ""
	}

	const parts = normalized.split(".")
	const lastPart = parts[parts.length - 1]

	return `.${lastPart}`
}

export function loadLanguage(name: string) {
	const ext = parseExtension(name)

	if (!ext.includes(".") || !langNames.includes(ext.replace(".", ""))) {
		return null
	}

	const lang = langs[ext.replace(".", "")]

	if (!lang) {
		return null
	}

	return lang()
}
