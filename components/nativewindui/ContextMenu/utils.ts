import { ContextItem, ContextSubMenu } from './types';

function createContextSubMenu(
  subMenu: Omit<ContextSubMenu, 'items'>,
  items: ContextSubMenu['items']
) {
  return Object.assign(subMenu, { items }) as ContextSubMenu;
}

function createContextItem(item: ContextItem) {
  return item;
}

export { createContextSubMenu, createContextItem };
