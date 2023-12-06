import striptags from "striptags"
import { NoteType, notes as getNotes, notesTags as getTags, Note as INote, NoteTag, noteContent, NoteParticipant } from "../../lib/api"
import { dbFs } from "../../lib/db"
import { decryptNoteKeyParticipant, decryptNoteTitle, decryptNoteTagName, decryptNotePreview, decryptNoteContent } from "../../lib/crypto"
import storage from "../../lib/storage"
import { getMasterKeys, randomIdUnsafe } from "../../lib/helpers"
import { getColor } from "../../style"
import { DOMParser } from "react-native-html-parser"

const domParser = new DOMParser()

export const createNotePreviewFromContentText = (content: string, type: NoteType) => {
	if (content.length === 0) {
		return ""
	}

	if (type === "rich") {
		if (content.indexOf("<p><br></p>") === -1) {
			return striptags(content.split("\n")[0]).slice(0, 128)
		}

		return striptags(content.split("<p><br></p>")[0]).slice(0, 128)
	}

	if (type === "checklist") {
		const ex = content
			.split('<ul data-checked="false">')
			.join("")
			.split('<ul data-checked="true">')
			.join("")
			.split("\n")
			.join("")
			.split("<li>")

		for (const listPoint of ex) {
			const listPointEx = listPoint.split("</li>")

			if (listPointEx[0].trim().length > 0) {
				return striptags(listPointEx[0].trim())
			}
		}

		return ""
	}

	return striptags(content.split("\n")[0]).slice(0, 128)
}

export const fetchNotesAndTags = async (skipCache: boolean = false): Promise<{ cache: boolean; notes: INote[]; tags: NoteTag[] }> => {
	const refresh = async (): Promise<{ cache: boolean; notes: INote[]; tags: NoteTag[] }> => {
		const privateKey = storage.getString("privateKey")
		const userId = storage.getNumber("userId")
		const masterKeys = getMasterKeys()

		const [notesRes, tagsRes] = await Promise.all([getNotes(), getTags()])

		const notes: INote[] = []
		const tags: NoteTag[] = []
		const promises: Promise<void>[] = []

		for (const note of notesRes) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const noteKey = await decryptNoteKeyParticipant(
							note.participants.filter(participant => participant.userId === userId)[0].metadata,
							privateKey
						)

						if (noteKey.length === 0) {
							resolve()

							return
						}

						const title = await decryptNoteTitle(note.title, noteKey)
						const preview = note.preview.length === 0 ? title : await decryptNotePreview(note.preview, noteKey)

						const tags: NoteTag[] = []
						const tagsPromises: Promise<void>[] = []

						for (const tag of note.tags) {
							tagsPromises.push(
								new Promise(async (resolve, reject) => {
									try {
										const tagName = await decryptNoteTagName(tag.name, masterKeys)

										tags.push({
											...tag,
											name: tagName
										})
									} catch (e) {
										reject(e)

										return
									}

									resolve()
								})
							)
						}

						await Promise.all(tagsPromises)

						notes.push({
							...note,
							title: striptags(title),
							preview: striptags(preview),
							tags
						})
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		for (const tag of tagsRes) {
			promises.push(
				new Promise(async (resolve, reject) => {
					try {
						const name = await decryptNoteTagName(tag.name, masterKeys)

						if (name.length > 0) {
							tags.push({
								...tag,
								name: striptags(name)
							})
						}
					} catch (e) {
						reject(e)

						return
					}

					resolve()
				})
			)
		}

		await Promise.all(promises)

		await dbFs
			.set("notesAndTags", {
				notes: sortAndFilterNotes(notes, "", ""),
				tags: sortAndFilterTags(tags)
			})
			.catch(console.error)

		cleanupLocalDb(notes, tags).catch(console.error)

		return {
			cache: false,
			notes,
			tags
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache: { notes: INote[]; tags: NoteTag[] } = await dbFs.get("notesAndTags")

	if (cache) {
		return {
			cache: true,
			notes: sortAndFilterNotes(cache.notes, "", ""),
			tags: sortAndFilterTags(cache.tags)
		}
	}

	return await refresh()
}

export const sortAndFilterTags = (tags: NoteTag[]) => {
	return tags.sort((a, b) => {
		if (a.favorite !== b.favorite) {
			return b.favorite ? 1 : -1
		}

		return b.editedTimestamp - a.editedTimestamp
	})
}

export const sortAndFilterNotes = (notes: INote[], search: string = "", activeTag: string = "", tags: NoteTag[] = []) => {
	const tagsJoined = tags.map(t => t.name.trim().toLowerCase() + " ")

	const filtered = notes
		.sort((a, b) => {
			if (a.pinned !== b.pinned) {
				return b.pinned ? 1 : -1
			}

			if (a.trash !== b.trash && a.archive === false) {
				return a.trash ? 1 : -1
			}

			if (a.archive !== b.archive) {
				return a.archive ? 1 : -1
			}

			if (a.trash !== b.trash) {
				return a.trash ? 1 : -1
			}

			return b.editedTimestamp - a.editedTimestamp
		})
		.filter(note => {
			if (search.length === 0) {
				return true
			}

			if (note.title.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			if (note.preview.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			if (tagsJoined.indexOf(search.toLowerCase().trim()) !== -1) {
				return true
			}

			return false
		})

	if (activeTag.length > 0) {
		if (activeTag === "favorites") {
			return filtered.filter(note => note.favorite)
		}

		if (activeTag === "pinned") {
			return filtered.filter(note => note.pinned)
		}

		return filtered.filter(note => note.tags.map(t => t.uuid).includes(activeTag))
	}

	return filtered
}

export const fetchNoteContent = async (
	note: INote,
	skipCache: boolean = false
): Promise<{ cache: boolean; content: string; type: NoteType }> => {
	const refresh = async (): Promise<{ cache: boolean; content: string; type: NoteType }> => {
		const result = await noteContent(note.uuid)
		let content = ""

		if (result.content.length === 0) {
			if (result.type === "checklist") {
				content = '<ul data-checked="false"><li><br></li></ul>'
			} else {
				content = ""
			}

			await Promise.all([dbFs.set("noteContent:" + note.uuid, content), dbFs.set("noteType:" + note.uuid, result.type)]).catch(
				console.error
			)

			return {
				cache: false,
				content,
				type: result.type
			}
		}

		const privateKey = storage.getString("privateKey")
		const userId = storage.getNumber("userId")
		const me = note.participants.filter(participant => participant.userId === userId)

		if (!me || me.length === 0) {
			throw new Error("Could not find user not participant")
		}

		const noteKey = await decryptNoteKeyParticipant(me[0].metadata, privateKey)
		const contentDecrypted = await decryptNoteContent(result.content, noteKey)

		if (
			result.type === "checklist" &&
			(contentDecrypted === "" || contentDecrypted.indexOf("<ul data-checked") === -1 || contentDecrypted === "<p><br></p>")
		) {
			content = '<ul data-checked="false"><li><br></li></ul>'
		} else {
			content = contentDecrypted
		}

		await Promise.all([dbFs.set("noteContent:" + note.uuid, content), dbFs.set("noteType:" + note.uuid, result.type)]).catch(
			console.error
		)

		return {
			cache: false,
			content,
			type: result.type
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const [cache, type] = await Promise.all([dbFs.get<string>("noteContent:" + note.uuid), dbFs.get<NoteType>("noteType:" + note.uuid)])

	if (cache) {
		return {
			cache: true,
			content: cache,
			type
		}
	}

	return await refresh()
}

export const cleanupLocalDb = async (notes: INote[], tags: NoteTag[]) => {
	// TODO
}

export const quillStyle = (darkMode: boolean) => {
	return `
        .ql-container {
            font-size: 16px;
            white-space: pre-wrap !important;
            padding-left: 5px !important;
            padding-right: 5px !important;
        }

        .ql-editor {
            user-select: text;
            white-space: pre-wrap !important;
        }

        .ql-toolbar.ql-snow {
            border: none;
            border-top: 1px solid ${getColor(darkMode, "primaryBorder")};
            border-bottom: 1px solid ${getColor(darkMode, "primaryBorder")};
            font-size: 16px;
        }

        .ql-snow .ql-picker {
            color: ${getColor(darkMode, "textSecondary")};
        }

        .ql-snow .ql-picker-options {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 5px;
            padding: 10px;
            padding-top: 0px;
            padding-bottom: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            margin-top: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            border-color: ${getColor(darkMode, "primaryBorder")};
        }

        .ql-formats > button:hover {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-container.ql-snow {
            border: none;
        }

        .ql-snow .ql-tooltip {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 5px;
            border: 1px solid ${getColor(darkMode, "primaryBorder")};
            color: ${getColor(darkMode, "textSecondary")};
            box-shadow: none;
            padding: 5px 12px;
            white-space: nowrap;
            font-size: 16px;
        }

        .ql-snow .ql-editor blockquote {
            border-left: 4px solid ${getColor(darkMode, "backgroundTertiary")};
        }

        .ql-snow .ql-tooltip input[type=text] {
            color: ${getColor(darkMode, "textSecondary")};
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 3px;
            border: 1px solid ${getColor(darkMode, "primaryBorder")};
            font-size: 16px;
        }

        .ql-snow .ql-tooltip input[type=text]:focus, .ql-snow .ql-tooltip input[type=text]:active {
            outline: none;
            border: 1px solid ${getColor(darkMode, "backgroundTertiary")};
        }

        .ql-snow.ql-toolbar button:hover, .ql-snow .ql-toolbar button:hover, .ql-snow.ql-toolbar button:focus, .ql-snow .ql-toolbar button:focus, .ql-snow.ql-toolbar button.ql-active, .ql-snow .ql-toolbar button.ql-active, .ql-snow.ql-toolbar .ql-picker-label:hover, .ql-snow .ql-toolbar .ql-picker-label:hover, .ql-snow.ql-toolbar .ql-picker-label.ql-active, .ql-snow .ql-toolbar .ql-picker-label.ql-active, .ql-snow.ql-toolbar .ql-picker-item:hover, .ql-snow .ql-toolbar .ql-picker-item:hover, .ql-snow.ql-toolbar .ql-picker-item.ql-selected, .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover,
        .ql-snow .ql-toolbar button:hover,
        .ql-snow.ql-toolbar button:focus,
        .ql-snow .ql-toolbar button:focus,
        .ql-snow.ql-toolbar button.ql-active,
        .ql-snow .ql-toolbar button.ql-active,
        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow .ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active,
        .ql-snow.ql-toolbar .ql-picker-item:hover,
        .ql-snow .ql-toolbar .ql-picker-item:hover,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow.ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
            fill: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow .ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button:focus .ql-stroke,
        .ql-snow .ql-toolbar button:focus .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
            stroke: ${getColor(darkMode, "purple")};
        }

        .ql-toolbar.ql-snow .ql-picker-label {
            border-color: ${getColor(darkMode, "primaryBorder")};
            border-radius: 5px;
            font-size: 15px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
            border-color: ${getColor(darkMode, "primaryBorder")};
            border-radius: 5px;
        }

        .ql-snow .ql-tooltip[data-mode=link]::before {
            content: "Link";
        }

        .ql-snow a {
            color: ${getColor(darkMode, "linkPrimary")};
        }

        .ql-snow a:hover {
            text-decoration: underline;
        }

        .ql-editor ul[data-checked=true] > li::before, .ql-editor ul[data-checked=false] > li::before {
            color: ${getColor(darkMode, "textPrimary")};
        }

        .ql-editor ul[data-checked=false] > li::before {
            content: '\\2713';
            color: transparent;
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 1px solid ${getColor(darkMode, "textPrimary")};
            border-radius: 50%;
            text-align: center;
            line-height: 20px;
            padding-left: 1px;
            background-color: transparent;
            margin-right: 10px;
        }

        .ql-editor ul[data-checked=true] > li::before {
            content: '\\2713';
            color: ${getColor(darkMode, "backgroundPrimary")};
            display: inline-block;
            width: 20px;
            height: 20px;
            font-weight: bold;
            border: 1px solid ${getColor(darkMode, "purple")};
            border-radius: 50%;
            text-align: center;
            line-height: 20px;
            padding-left: 1px;
            background-color: ${getColor(darkMode, "purple")};
            margin-right: 10px;
        }

        .ql-editor ul[data-checked=false] > li {
            margin-top: 10px;
        }

        .ql-editor ul[data-checked=true] > li {
            margin-top: 10px;
        }

        .ql-snow .ql-editor pre.ql-syntax {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            color: ${getColor(darkMode, "textPrimary")};
            overflow: visible;
            border-radius: 5px;
        }

        .ql-snow.ql-toolbar button, .ql-snow .ql-toolbar button {
            height: 28px;
            width: 28px;
        }
    `
}

export type ChecklistItem = {
	text: string
	checked: boolean
	id: string
}

export const parseQuillChecklistHtml = (html: string): ChecklistItem[] => {
	try {
		const doc = domParser.parseFromString(html, "text/html")
		const checklist: ChecklistItem[] = []

		const ulElements = doc.getElementsByTagName("ul")
		let index = 0

		for (let i = 0; i < ulElements.length; i++) {
			const ul = ulElements.item(i)
			const isChecked = ul.getAttribute("data-checked") === "true"
			const liElements = ul.getElementsByTagName("li")

			for (let j = 0; j < liElements.length; j++) {
				const li = liElements.item(j)

				checklist.push({
					id: randomIdUnsafe(),
					text: li.textContent || "",
					checked: isChecked
				})

				index += 1
			}
		}

		return checklist
	} catch (e) {
		console.error(e)

		return []
	}
}

export const convertChecklistItemsToHtml = (items: ChecklistItem[]): string => {
	try {
		let html = ""
		let currentCheckedStatus: boolean | null = null

		items.forEach(item => {
			if (currentCheckedStatus !== item.checked) {
				if (currentCheckedStatus !== null) {
					html += "</ul>"
				}

				html += `<ul data-checked="${item.checked}">`

				currentCheckedStatus = item.checked
			}

			html += `<li>${item.text}</li>`
		})

		if (items.length > 0) {
			html += "</ul>"
		}

		return html
	} catch (e) {
		console.error(e)

		return '<ul data-checked="false"><li><br></li></ul>'
	}
}

export const getUserNameFromNoteParticipant = (participant: NoteParticipant): string => {
	return participant.nickName.length > 0 ? participant.nickName : participant.email
}

export const convertQuillHTMLToRawText = (html: string): string => {
	try {
		let text = html.replace(/<br\s*\/?>/gi, "\n")

		text = text.replace(/<\/(p|div|h[1-99]|ul|ol|li|blockquote|header|footer|section|article)\s*>/gi, "\n")
		text = text.replace(/&nbsp;/gi, " ")
		text = text.replace(/&amp;/gi, "&")
		text = text.replace(/&lt;/gi, "<")
		text = text.replace(/&gt;/gi, ">")
		text = text.replace(/&quot;/gi, '"')
		text = text.replace(/&#39;/gi, "'")

		return text
	} catch (e) {
		console.error(e)

		return ""
	}
}
