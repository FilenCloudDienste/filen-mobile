import { parsePath } from './path';
export const readRedirects = (root) => {
  return Array.from(root.children)
    .filter(el => el.tagName === 'ION-ROUTE-REDIRECT')
    .map(el => {
    const to = readProp(el, 'to');
    return {
      from: parsePath(readProp(el, 'from')),
      to: to == null ? undefined : parsePath(to),
    };
  });
};
export const readRoutes = (root) => {
  return flattenRouterTree(readRouteNodes(root));
};
export const readRouteNodes = (root, node = root) => {
  return Array.from(node.children)
    .filter(el => el.tagName === 'ION-ROUTE' && el.component)
    .map(el => {
    const component = readProp(el, 'component');
    if (component == null) {
      throw new Error('component missing in ion-route');
    }
    return {
      path: parsePath(readProp(el, 'url')),
      id: component.toLowerCase(),
      params: el.componentProps,
      beforeLeave: el.beforeLeave,
      beforeEnter: el.beforeEnter,
      children: readRouteNodes(root, el)
    };
  });
};
export const readProp = (el, prop) => {
  if (prop in el) {
    return el[prop];
  }
  if (el.hasAttribute(prop)) {
    return el.getAttribute(prop);
  }
  return null;
};
export const flattenRouterTree = (nodes) => {
  const routes = [];
  for (const node of nodes) {
    flattenNode([], routes, node);
  }
  return routes;
};
const flattenNode = (chain, routes, node) => {
  const s = chain.slice();
  s.push({
    id: node.id,
    path: node.path,
    params: node.params,
    beforeLeave: node.beforeLeave,
    beforeEnter: node.beforeEnter
  });
  if (node.children.length === 0) {
    routes.push(s);
    return;
  }
  for (const sub of node.children) {
    flattenNode(s, routes, sub);
  }
};
