import { langs } from "@uiw/codemirror-extensions-langs"

export function parseExtension(name: string) {
	const normalized = name.toLowerCase().trim()

	if (!normalized.includes(".")) {
		return ""
	}

	const parts = normalized.split(".")
	const lastPart = parts[parts.length - 1]

	return `.${lastPart}`
}

export function loadLanguageFromName(name: string) {
	switch (name.toLowerCase().trim()) {
		case "javascript":
		case "js": {
			return langs.javascript({
				typescript: false,
				jsx: false
			})
		}

		case "jsx": {
			return langs.javascript({
				typescript: false,
				jsx: true
			})
		}

		case "typescript":
		case "ts": {
			return langs.javascript({
				typescript: true,
				jsx: false
			})
		}

		case "tsx": {
			return langs.javascript({
				typescript: true,
				jsx: true
			})
		}

		case "markdown":
		case "md": {
			return langs.markdown()
		}

		case "cplusplus":
		case "c++":
		case "cpp": {
			return langs.cpp()
		}

		case "c": {
			return langs.c()
		}

		case "php":
		case "php5":
		case "php7":
		case "php8": {
			return langs.php()
		}

		case "html": {
			return langs.html()
		}

		case "css":
		case "css3": {
			return langs.css()
		}

		case "coffeescript":
		case "coffee": {
			return langs.coffeescript()
		}

		case "sass": {
			return langs.sass()
		}

		case "xml": {
			return langs.xml()
		}

		case "json": {
			return langs.json()
		}

		case "sql": {
			return langs.sql()
		}

		case "java": {
			return langs.java()
		}

		case "kotlin":
		case "kt": {
			return langs.kotlin()
		}

		case "swift": {
			return langs.swift()
		}

		case "python":
		case "py":
		case "py3":
		case "python3": {
			return langs.python()
		}

		case "cmake": {
			return langs.cmake()
		}

		case "csharp":
		case "cs": {
			return langs.csharp()
		}

		case "dart": {
			return langs.dart()
		}

		case "dockerfile":
		case "docker": {
			return langs.dockerfile()
		}

		case "go":
		case "golang": {
			return langs.go()
		}

		case "less": {
			return langs.less()
		}

		case "yaml": {
			return langs.yaml()
		}

		case "vue": {
			return langs.vue()
		}

		case "svelte": {
			return langs.svelte()
		}

		case "vbs":
		case "visualbasic": {
			return langs.vbscript()
		}

		case "cobol": {
			return langs.cobol()
		}

		case "toml": {
			return langs.toml()
		}

		case "conf":
		case "sh":
		case "bash": {
			return langs.shell()
		}

		case "rust":
		case "rs": {
			return langs.rust()
		}

		case "ruby":
		case "rb": {
			return langs.ruby()
		}

		case ".powershell":
		case "ps1": {
			return langs.powershell()
		}

		case "protobuf":
		case "proto": {
			return langs.protobuf()
		}

		default: {
			return langs.shell()
		}
	}
}

export function loadLanguage(name: string) {
	const ext = parseExtension(name)

	switch (ext) {
		case ".js":
		case ".cjs":
		case ".mjs": {
			return langs.javascript({
				typescript: false,
				jsx: false
			})
		}

		case ".jsx": {
			return langs.javascript({
				typescript: false,
				jsx: true
			})
		}

		case ".tsx": {
			return langs.javascript({
				typescript: true,
				jsx: true
			})
		}

		case ".ts": {
			return langs.javascript({
				typescript: true,
				jsx: false
			})
		}

		case ".md": {
			return langs.markdown()
		}

		case ".cpp": {
			return langs.cpp()
		}

		case ".c": {
			return langs.c()
		}

		case ".php": {
			return langs.php()
		}

		case ".htm":
		case ".html5":
		case ".html": {
			return langs.html()
		}

		case ".css":
		case ".css3": {
			return langs.css()
		}

		case ".coffee":
		case ".litcoffee": {
			return langs.coffeescript()
		}

		case ".sass": {
			return langs.sass()
		}

		case ".xml": {
			return langs.xml()
		}

		case ".json": {
			return langs.json()
		}

		case ".sql": {
			return langs.sql()
		}

		case ".java": {
			return langs.java()
		}

		case ".kt": {
			return langs.kotlin()
		}

		case ".swift": {
			return langs.swift()
		}

		case ".py3":
		case ".py": {
			return langs.python()
		}

		case ".cmake": {
			return langs.cmake()
		}

		case ".cs": {
			return langs.csharp()
		}

		case ".dart": {
			return langs.dart()
		}

		case ".dockerfile": {
			return langs.dockerfile()
		}

		case ".go": {
			return langs.go()
		}

		case ".less": {
			return langs.less()
		}

		case ".yaml": {
			return langs.yaml()
		}

		case ".vue": {
			return langs.vue()
		}

		case ".svelte": {
			return langs.svelte()
		}

		case ".vbs": {
			return langs.vbscript()
		}

		case ".cobol": {
			return langs.cobol()
		}

		case ".toml": {
			return langs.toml()
		}

		case ".conf":
		case ".sh": {
			return langs.shell()
		}

		case ".rs": {
			return langs.rust()
		}

		case ".rb": {
			return langs.ruby()
		}

		case ".ps1":
		case ".bat":
		case ".ps": {
			return langs.powershell()
		}

		case ".protobuf":
		case ".proto": {
			return langs.protobuf()
		}

		default: {
			return null
		}
	}
}
