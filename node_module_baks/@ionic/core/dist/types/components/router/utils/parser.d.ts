import { RouteChain, RouteRedirect, RouteTree } from './interface';
export declare const readRedirects: (root: Element) => RouteRedirect[];
export declare const readRoutes: (root: Element) => RouteChain[];
export declare const readRouteNodes: (root: Element, node?: Element) => RouteTree;
export declare const readProp: (el: HTMLElement, prop: string) => string | null | undefined;
export declare const flattenRouterTree: (nodes: RouteTree) => RouteChain[];
