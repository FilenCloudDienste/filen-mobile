import { RouteInfo, ViewItem, ViewStacks } from '@ionic/react';
import React from 'react';
export declare class ReactRouterViewStack extends ViewStacks {
    constructor();
    createViewItem(outletId: string, reactElement: React.ReactElement, routeInfo: RouteInfo, page?: HTMLElement): ViewItem<any>;
    getChildrenToRender(outletId: string, ionRouterOutlet: React.ReactElement, routeInfo: RouteInfo): JSX.Element[];
    findViewItemByRouteInfo(routeInfo: RouteInfo, outletId?: string): ViewItem<any> | undefined;
    findLeavingViewItemByRouteInfo(routeInfo: RouteInfo, outletId?: string, mustBeIonRoute?: boolean): ViewItem<any> | undefined;
    findViewItemByPathname(pathname: string, outletId?: string): ViewItem<any> | undefined;
    private findViewItemByPath;
}
