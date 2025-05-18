import { parse } from "node-html-parser"

export type ChecklistItem = {
	checked: boolean
	content: string
	id: string
}

export type Checklist = ChecklistItem[]

export class Parser {
	public parse(html: string): Checklist {
		try {
			const root = parse(html)
			const ul = root.querySelectorAll("ul")

			if (!ul || ul.length === 0) {
				return []
			}

			const checklist: Checklist = []

			for (const item of ul) {
				const checked = item.getAttribute("data-checked") === "true"
				const li = item.querySelectorAll("li")

				for (const liItem of li) {
					checklist.push({
						checked,
						content: liItem.innerText ? liItem.innerText.trim() : "",
						id: Math.random().toString(36).substring(2, 15)
					})
				}
			}

			return checklist
		} catch {
			return []
		}
	}

	public stringify(checklist: Checklist): string {
		if (checklist.length === 0) {
			return ""
		}

		let html = ""
		let currentCheckedStatus: boolean | null = null

		for (const item of checklist) {
			if (currentCheckedStatus !== item.checked) {
				if (currentCheckedStatus !== null) {
					html += "</ul>"
				}

				html += `<ul data-checked="${item.checked}">`

				currentCheckedStatus = item.checked
			}

			html += `<li>${item.content.trim().length > 0 ? item.content.trim() : "<br>"}</li>`
		}

		if (checklist.length > 0) {
			html += "</ul>"
		}

		return html
	}
}

export const parser = new Parser()

export default parse
