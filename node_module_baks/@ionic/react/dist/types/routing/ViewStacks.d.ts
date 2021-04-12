/// <reference types="react" />
import { RouteInfo } from '../models/RouteInfo';
import { ViewItem } from './ViewItem';
export declare abstract class ViewStacks {
    private viewStacks;
    constructor();
    add(viewItem: ViewItem): void;
    clear(outletId: string): void;
    getViewItemsForOutlet(outletId: string): ViewItem<any>[];
    remove(viewItem: ViewItem): void;
    protected getStackIds(): string[];
    protected getAllViewItems(): ViewItem<any>[];
    abstract createViewItem(outletId: string, reactElement: React.ReactElement, routeInfo: RouteInfo, page?: HTMLElement): ViewItem;
    abstract findViewItemByPathname(pathname: string, outletId?: string): ViewItem | undefined;
    abstract findViewItemByRouteInfo(routeInfo: RouteInfo, outletId?: string): ViewItem | undefined;
    abstract findLeavingViewItemByRouteInfo(routeInfo: RouteInfo, outletId?: string): ViewItem | undefined;
    abstract getChildrenToRender(outletId: string, ionRouterOutlet: React.ReactElement, routeInfo: RouteInfo, reRender: () => void, setInTransition: () => void): React.ReactNode[];
}
