import { RouteInfo } from '../models/RouteInfo';
export declare class LocationHistory {
    private locationHistory;
    private tabHistory;
    add(routeInfo: RouteInfo): void;
    clearTabStack(tab: string): void;
    update(routeInfo: RouteInfo): void;
    private _add;
    private _pop;
    private _replace;
    private _clear;
    private _getRouteInfosByKey;
    getFirstRouteInfoForTab(tab: string): RouteInfo<any> | undefined;
    getCurrentRouteInfoForTab(tab?: string): RouteInfo<any> | undefined;
    findLastLocation(routeInfo: RouteInfo): RouteInfo<any> | undefined;
    previous(): RouteInfo<any>;
    current(): RouteInfo<any>;
    canGoBack(): boolean;
}
