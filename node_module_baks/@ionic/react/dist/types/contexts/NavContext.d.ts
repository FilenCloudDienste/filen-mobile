import { AnimationBuilder, RouterDirection } from '@ionic/core';
import React from 'react';
import { RouteInfo } from '../models';
export interface NavContextState {
    getIonRoute: () => any;
    getIonRedirect: () => any;
    getPageManager: () => any;
    getStackManager: () => any;
    goBack: (route?: string | RouteInfo, animationBuilder?: AnimationBuilder) => void;
    navigate: (path: string, direction?: RouterDirection | 'none', ionRouteAction?: 'push' | 'replace' | 'pop', animationBuilder?: AnimationBuilder, options?: any, tab?: string) => void;
    hasIonicRouter: () => boolean;
    routeInfo?: RouteInfo;
    setCurrentTab: (tab: string, routeInfo: RouteInfo) => void;
    changeTab: (tab: string, path: string, routeOptions?: any) => void;
    resetTab: (tab: string, originalHref: string, originalRouteOptions?: any) => void;
}
export declare const NavContext: React.Context<NavContextState>;
