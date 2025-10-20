import { parseNumbersFromString } from "./utils"

export type OrderByType =
	| "nameAsc"
	| "sizeAsc"
	| "dateAsc"
	| "typeAsc"
	| "lastModifiedAsc"
	| "nameDesc"
	| "sizeDesc"
	| "dateDesc"
	| "typeDesc"
	| "lastModifiedDesc"
	| "uploadDateAsc"
	| "uploadDateDesc"
	| "creationAsc"
	| "creationDesc"

export class ItemSorter {
	private static instance: ItemSorter
	private uuidCache = new Map<string, number>()
	private lowerCache = new Map<string, string>()
	private numericPartsCache = new Map<string, (string | number)[]>()
	private readonly MAX_CACHE_SIZE = 65535

	static getInstance(): ItemSorter {
		if (!ItemSorter.instance) {
			ItemSorter.instance = new ItemSorter()
		}

		return ItemSorter.instance
	}

	private getUuidNumber(uuid: string): number {
		let cached = this.uuidCache.get(uuid)

		if (!cached) {
			cached = parseNumbersFromString(uuid)

			this.uuidCache.set(uuid, cached)

			if (this.uuidCache.size > this.MAX_CACHE_SIZE) {
				this.uuidCache.clear()
			}
		}

		return cached
	}

	private getLowerName(name: string): string {
		let cached = this.lowerCache.get(name)

		if (!cached) {
			cached = name.toLowerCase()

			this.lowerCache.set(name, cached)

			if (this.lowerCache.size > this.MAX_CACHE_SIZE) {
				this.lowerCache.clear()
			}
		}

		return cached
	}

	private getNumericParts(str: string): (string | number)[] {
		let cached = this.numericPartsCache.get(str)

		if (!cached) {
			cached = []

			let currentNum = ""
			let currentText = ""

			for (let i = 0; i < str.length; i++) {
				const char = str[i]

				if (!char) {
					continue
				}

				const code = char.charCodeAt(0)

				if (code >= 48 && code <= 57) {
					if (currentText) {
						cached.push(currentText)

						currentText = ""
					}

					currentNum += char
				} else {
					if (currentNum) {
						cached.push(parseInt(currentNum, 10))

						currentNum = ""
					}

					currentText += char
				}
			}

			if (currentNum) {
				cached.push(parseInt(currentNum, 10))
			}

			if (currentText) {
				cached.push(currentText)
			}

			this.numericPartsCache.set(str, cached)

			if (this.numericPartsCache.size > this.MAX_CACHE_SIZE) {
				this.numericPartsCache.clear()
			}
		}

		return cached
	}

	private compareStringsNumeric(a: string, b: string): number {
		const aParts = this.getNumericParts(a)
		const bParts = this.getNumericParts(b)
		const minLen = Math.min(aParts.length, bParts.length)

		for (let i = 0; i < minLen; i++) {
			const aPart = aParts[i]
			const bPart = bParts[i]

			if (typeof aPart === "number" && typeof bPart === "number") {
				if (aPart !== bPart) {
					return aPart - bPart
				}
			} else if (typeof aPart === "string" && typeof bPart === "string") {
				if (aPart !== bPart) {
					return aPart < bPart ? -1 : 1
				}
			} else {
				return typeof aPart === "number" ? -1 : 1
			}
		}

		return aParts.length - bParts.length
	}

	private compareTypes(aType: string, bType: string): number {
		if (aType !== bType) {
			return aType === "directory" ? -1 : 1
		}

		return 0
	}

	private compareName = (a: DriveCloudItem, b: DriveCloudItem, isAsc: boolean): number => {
		const typeComp = this.compareTypes(a.type, b.type)

		if (typeComp !== 0) {
			return typeComp
		}

		const aLower = this.getLowerName(a.name)
		const bLower = this.getLowerName(b.name)
		const result = this.compareStringsNumeric(aLower, bLower)

		return isAsc ? result : -result
	}

	private compareSize = (a: DriveCloudItem, b: DriveCloudItem, isAsc: boolean): number => {
		const typeComp = this.compareTypes(a.type, b.type)

		if (typeComp !== 0) {
			return typeComp
		}

		const diff = a.size - b.size

		return isAsc ? diff : -diff
	}

	private compareDate = (a: DriveCloudItem, b: DriveCloudItem, isAsc: boolean): number => {
		const typeComp = this.compareTypes(a.type, b.type)

		if (typeComp !== 0) {
			return typeComp
		}

		if (a.timestamp === b.timestamp) {
			const aUuid = this.getUuidNumber(a.uuid)
			const bUuid = this.getUuidNumber(b.uuid)
			const diff = aUuid - bUuid

			return isAsc ? diff : -diff
		}

		const diff = a.timestamp - b.timestamp

		return isAsc ? diff : -diff
	}

	private compareLastModified = (a: DriveCloudItem, b: DriveCloudItem, isAsc: boolean): number => {
		const typeComp = this.compareTypes(a.type, b.type)

		if (typeComp !== 0) {
			return typeComp
		}

		if (a.lastModified === b.lastModified) {
			const aUuid = this.getUuidNumber(a.uuid)
			const bUuid = this.getUuidNumber(b.uuid)
			const diff = aUuid - bUuid

			return isAsc ? diff : -diff
		}

		const diff = a.lastModified - b.lastModified

		return isAsc ? diff : -diff
	}

	private compareCreation = (a: DriveCloudItem, b: DriveCloudItem, isAsc: boolean): number => {
		const typeComp = this.compareTypes(a.type, b.type)

		if (typeComp !== 0) {
			return typeComp
		}

		const aTime = a.type === "file" ? a.creation ?? a.lastModified ?? a.timestamp : a.lastModified ?? a.timestamp
		const bTime = b.type === "file" ? b.creation ?? b.lastModified ?? b.timestamp : b.lastModified ?? b.timestamp

		if (aTime === bTime) {
			const aUuid = this.getUuidNumber(a.uuid)
			const bUuid = this.getUuidNumber(b.uuid)
			const diff = aUuid - bUuid

			return isAsc ? diff : -diff
		}

		const diff = aTime - bTime

		return isAsc ? diff : -diff
	}

	private readonly sortMap: Record<string, (a: DriveCloudItem, b: DriveCloudItem) => number> = {
		nameAsc: (a, b) => this.compareName(a, b, true),
		nameDesc: (a, b) => this.compareName(a, b, false),
		sizeAsc: (a, b) => this.compareSize(a, b, true),
		sizeDesc: (a, b) => this.compareSize(a, b, false),
		dateAsc: (a, b) => this.compareDate(a, b, true),
		dateDesc: (a, b) => this.compareDate(a, b, false),
		typeAsc: (a, b) => this.compareName(a, b, true),
		typeDesc: (a, b) => this.compareName(a, b, false),
		lastModifiedAsc: (a, b) => this.compareLastModified(a, b, true),
		lastModifiedDesc: (a, b) => this.compareLastModified(a, b, false),
		uploadDateAsc: (a, b) => this.compareDate(a, b, true),
		uploadDateDesc: (a, b) => this.compareDate(a, b, false),
		creationAsc: (a, b) => this.compareCreation(a, b, true),
		creationDesc: (a, b) => this.compareCreation(a, b, false)
	}

	public sortItems(items: DriveCloudItem[], type: OrderByType): DriveCloudItem[] {
		const compareFunction = this.sortMap[type] ?? this.sortMap["nameAsc"]

		return items.slice().sort(compareFunction)
	}

	public clearCaches(): void {
		this.uuidCache.clear()
		this.lowerCache.clear()
		this.numericPartsCache.clear()
	}

	public getCacheStats() {
		return {
			uuidCacheSize: this.uuidCache.size,
			lowerCacheSize: this.lowerCache.size,
			numericPartsCacheSize: this.numericPartsCache.size
		}
	}
}

export const itemSorter = ItemSorter.getInstance()

export function orderItemsByType({ items, type }: { items: DriveCloudItem[]; type: OrderByType }): DriveCloudItem[] {
	return itemSorter.sortItems(items, type)
}

export default itemSorter
