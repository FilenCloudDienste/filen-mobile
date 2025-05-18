import js from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"
import reactHooks from "eslint-plugin-react-hooks"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"

const compat = new FlatCompat()

export default [
	js.configs.recommended,
	...compat.extends(
		"expo",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended"
	),
	{
		ignores: ["nodejs-assets/**/*", "node_modules/**/*", "patches/**/*", "android/**/*", "ios/**/*", ".vscode/**/*", ".expo/**/*"]
	},
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		languageOptions: {
			parser: typescriptParser
		},
		plugins: {
			"@typescript-eslint": typescript,
			"react-hooks": reactHooks
		},
		rules: {
			eqeqeq: 2,
			quotes: ["error", "double"],
			"no-mixed-spaces-and-tabs": 0,
			"no-duplicate-imports": "error",
			"no-extra-semi": 0,
			"@typescript-eslint/ban-types": "off"
		}
	}
]
