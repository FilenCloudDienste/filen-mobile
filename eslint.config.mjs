import js from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"
import reactHooks from "eslint-plugin-react-hooks"
import typescript from "@typescript-eslint/eslint-plugin"
import typescriptParser from "@typescript-eslint/parser"
import reactCompiler from "eslint-plugin-react-compiler"

const compat = new FlatCompat()

export default [
	js.configs.recommended,
	...compat.extends(
		"expo",
		"plugin:@typescript-eslint/recommended",
		"plugin:react-hooks/recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended",
		"plugin:react/recommended"
	),
	{
		ignores: [
			"nodejs-assets/**/*",
			"node_modules/**/*",
			"patches/**/*",
			"android/**/*",
			"ios/**/*",
			".vscode/**/*",
			".expo/**/*",
			".git/**/*",
			".maestro/**/*",
			"filen-rs/**/*",
			"filen-android-documents-provider/**/*",
			"filen-ios-file-provider/**/*",
			".github/**/*",
			"metro.config.js",
			"tailwind.config.js",
			"index.js",
			"eslint.config.mjs",
			"metro.config.js",
			"plugins/**/*",
			"prebuilds/**/*",
			"locales/**/*"
		]
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: typescriptParser
		},
		plugins: {
			"@typescript-eslint": typescript,
			"react-hooks": reactHooks,
			"react-compiler": reactCompiler
		},
		rules: {
			eqeqeq: 2,
			quotes: ["error", "double"],
			"no-mixed-spaces-and-tabs": 0,
			"no-duplicate-imports": "error",
			"no-extra-semi": 0,
			"@typescript-eslint/ban-types": "off",
			"react/react-in-jsx-scope": "off",
			"react/prop-types": "off",
			"react-compiler/react-compiler": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_"
				}
			]
		}
	},
	{
		settings: {
			react: {
				version: "detect"
			}
		}
	}
]
