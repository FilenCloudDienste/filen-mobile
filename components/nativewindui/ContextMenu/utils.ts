import type { ContextItem, ContextSubMenu } from "./types"

export function createContextSubMenu(subMenu: Omit<ContextSubMenu, "items">, items: ContextSubMenu["items"]) {
	return Object.assign(subMenu, {
		items
	}) as ContextSubMenu
}

export function createContextItem(item: ContextItem) {
	return item
}
