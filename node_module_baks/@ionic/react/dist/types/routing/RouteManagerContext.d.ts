import React from 'react';
import { RouteInfo } from '../models/RouteInfo';
import { ViewItem } from './ViewItem';
export interface RouteManagerContextState {
    addViewItem: (viewItem: ViewItem) => void;
    canGoBack: () => boolean;
    clearOutlet: (outletId: string) => void;
    createViewItem: (outletId: string, reactElement: React.ReactElement, routeInfo: RouteInfo, page?: HTMLElement) => ViewItem;
    findViewItemByPathname(pathname: string, outletId?: string): ViewItem | undefined;
    findLeavingViewItemByRouteInfo: (routeInfo: RouteInfo, outletId?: string) => ViewItem | undefined;
    findViewItemByRouteInfo: (routeInfo: RouteInfo, outletId?: string) => ViewItem | undefined;
    getChildrenToRender: (outletId: string, ionRouterOutlet: React.ReactElement, routeInfo: RouteInfo, reRender: () => void) => React.ReactNode[];
    goBack: () => void;
    unMountViewItem: (viewItem: ViewItem) => void;
}
export declare const RouteManagerContext: React.Context<RouteManagerContextState>;
