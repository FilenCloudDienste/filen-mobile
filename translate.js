import "dotenv/config"
import { translateDiff } from "i18n-ai-translate"
import path from "node:path"
import fs from "node:fs/promises"

const config = {
	translate: `You are a professional translator for the Filen (https://filen.io) encrypted cloud storage platform.

Translate from \${inputLanguage} to \${outputLanguage}.

- Translate each object in the array.
- 'original' is the text to be translated.
- 'translated' must not be empty.
- 'context' is additional info if needed.
- 'failure' explains why the previous translation failed.
- Preserve text formatting, case sensitivity, and whitespace.

Special Instructions:
- Treat anything in the format {{variableName}} as a placeholder. Never translate or modify its content.
- Do not add your own variables
- The number of variables like {{timeLeft}} must be the same in the translated text.
- Do not convert {{NEWLINE}} to \\n.
- Maintain context, make sense of the whole input.
- If there are words that could be kept in English, do so where it makes sense. Do not translate brand names (Filen, Filen.io), product names etc.
- Once you are done with the batch, review your translations for any mistakes.

Return the translation as JSON.
\`\`\`json
\${input}
\`\`\``,
	verify: `You are a professional translator.

Check translations from \${inputLanguage} to \${outputLanguage}.

- Verify each object in the array.
- 'original' is the text to be translated.
- 'translated' is the translated text.
- 'context' is additional info if needed.
- 'failure' explains why the previous translation failed.
- check for Accuracy (meaning, tone, grammar), Formatting (case, whitespace, punctuation).

If correct, return 'valid' as 'true' and leave 'fixedTranslation' and 'issue' empty.
If incorrect, return 'valid' as 'false' and put the fixed translation in 'fixedTranslation' and explain what is 'issue'.

Special Instructions:
- Treat anything in the format {{variableName}} as a placeholder. Never translate or modify its content.
- Do not add your own variables
- The number of variables like {{timeLeft}} must be the same in the translated text.
- Do not convert {{NEWLINE}} to \\n.
- Maintain context, make sense of the whole input.
- If there are words that could be kept in English, do so where it makes sense. Do not translate brand names (Filen, Filen.io), product names etc.
- Once you are done with the batch, review your translations for any mistakes.

Allow minor grammar, phrasing, and formatting differences if meaning is clear.
Flag only significant issues affecting accuracy or readability.

Return the verified as JSON.
\`\`\`json
\${input}
\`\`\``,
	langs: [
		// 🌎 Americas
		"es", // Spanish
		"pt", // Portuguese
		"fr", // French

		// 🌍 Europe
		"de", // German
		"it", // Italian
		"nl", // Dutch
		"pl", // Polish
		"sv", // Swedish
		"da", // Danish
		"no", // Norwegian
		"fi", // Finnish
		"hu", // Hungarian
		"cs", // Czech
		"ro", // Romanian
		"he", // Hebrew
		"ru", // Russian
		"uk", // Ukrainian

		// 🌏 Asia
		"zh", // Simplified Chinese
		"ja", // Japanese
		"ko", // Korean
		"hi", // Hindi
		"bn", // Bengali
		"ur", // Urdu
		"id", // Indonesian
		"vi", // Vietnamese
		"th", // Thai
		"tr" // Turkish
	],
	dir: path.join(path.resolve(), "locales"),
	base: path.join(path.resolve(), "locales", "en.json")
}

function deepMergeImmutable(target, source) {
	const result = {
		...target
	}

	for (const key in source) {
		// eslint-disable-next-line no-prototype-builtins
		if (source.hasOwnProperty(key)) {
			if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
				if (result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
					result[key] = deepMergeImmutable(result[key], source[key])
				} else {
					result[key] = deepMergeImmutable({}, source[key])
				}
			} else {
				result[key] = source[key]
			}
		}
	}

	return result
}

function flattenObject(obj, prefix = "") {
	const flattened = {}

	for (const key in obj) {
		// eslint-disable-next-line no-prototype-builtins
		if (obj.hasOwnProperty(key)) {
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
				Object.assign(flattened, flattenObject(obj[key], fullKey))
			} else {
				flattened[fullKey] = obj[key]
			}
		}
	}

	return flattened
}

function setNestedValue(obj, path, value) {
	const keys = path.split(".")
	let current = obj

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i]

		if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
			current[key] = {}
		}

		current = current[key]
	}

	current[keys[keys.length - 1]] = value

	return obj
}

const currentEn = await fs
	.readFile(config.base, {
		encoding: "utf-8"
	})
	.then(data => JSON.parse(data))
	.catch(() => ({}))

const currentEnKeys = flattenObject(currentEn)

for (const lang of config.langs) {
	const outPath = path.join(config.dir, `${lang}.json`)

	const currentLang = await fs
		.readFile(outPath, {
			encoding: "utf-8"
		})
		.then(data => JSON.parse(data))
		.catch(() => ({}))

	const currentLangKeys = flattenObject(currentLang)
	let before = {}
	const deletedKeys = []

	for (const key of Object.keys(currentLangKeys)) {
		const insert = currentEnKeys[key]

		if (!insert) {
			before = setNestedValue(before, key, "")

			deletedKeys.push(key)

			continue
		}

		before = setNestedValue(before, key, insert)
	}

	const translated = await translateDiff({
		inputLanguage: "en",
		outputLanguage: lang,
		engine: "chatgpt",
		model: "gpt-4o",
		apiKey: globalThis.process.env.OPENAI_API_KEY,
		verbose: true,
		promptMode: "json",
		skipTranslationVerification: true,
		skipStylingVerification: true,
		templatedStringSuffix: "}}",
		templatedStringPrefix: "{{",
		inputJSONBefore: before,
		inputJSONAfter: currentEn,
		overridePrompt: {
			generationPrompt: config.translate,
			translationVerificationPrompt: config.verify
		},
		chatParams: {
			messages: []
		},
		toUpdateJSONs: {
			[lang]: currentLang
		}
	})

	let result = deepMergeImmutable(currentLang, translated["items"] ?? translated[lang] ?? translated["en"] ?? translated)

	for (const key of deletedKeys) {
		result = setNestedValue(result, key, undefined)
	}

	const resultKeys = flattenObject(result)

	if (!result || Object.keys(result).length === 0 || Object.keys(resultKeys).length === 0) {
		globalThis.console.error(`No translations for ${lang}, skipping file write, keys empty.`)

		globalThis.process.exit(1)
	}

	const missingKeys = Object.keys(currentEnKeys).filter(key => !resultKeys[key])

	if (missingKeys.length > 0) {
		globalThis.console.error(`Error: Missing keys in ${lang} translation:`, missingKeys)

		globalThis.process.exit(1)
	}

	await fs.writeFile(outPath, JSON.stringify(result, null, 4) + "\n", {
		encoding: "utf-8"
	})
}
