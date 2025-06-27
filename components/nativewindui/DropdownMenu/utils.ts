import { type DropdownItem, type DropdownSubMenu } from "./types"

export function createDropdownSubMenu(subMenu: Omit<DropdownSubMenu, "items">, items: DropdownSubMenu["items"]) {
	return Object.assign(subMenu, { items }) as DropdownSubMenu
}

export function createDropdownItem(item: DropdownItem) {
	return item
}
