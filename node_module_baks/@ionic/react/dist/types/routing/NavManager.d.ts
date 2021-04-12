import { AnimationBuilder } from '@ionic/core';
import React from 'react';
import { IonRouterContextState } from '../components/IonRouterContext';
import { NavContextState } from '../contexts/NavContext';
import { RouteAction } from '../models/RouteAction';
import { RouteInfo } from '../models/RouteInfo';
import { RouterDirection } from '../models/RouterDirection';
import { LocationHistory } from './LocationHistory';
import PageManager from './PageManager';
interface NavManagerProps {
    routeInfo: RouteInfo;
    onNativeBack: () => void;
    onNavigateBack: (route?: string | RouteInfo, animationBuilder?: AnimationBuilder) => void;
    onNavigate: (path: string, action: RouteAction, direction?: RouterDirection, animationBuilder?: AnimationBuilder, options?: any, tab?: string) => void;
    onSetCurrentTab: (tab: string, routeInfo: RouteInfo) => void;
    onChangeTab: (tab: string, path: string, routeOptions?: any) => void;
    onResetTab: (tab: string, path: string, routeOptions?: any) => void;
    ionRedirect: any;
    ionRoute: any;
    stackManager: any;
    locationHistory: LocationHistory;
}
export declare class NavManager extends React.PureComponent<NavManagerProps, NavContextState> {
    ionRouterContextValue: IonRouterContextState;
    constructor(props: NavManagerProps);
    goBack(route?: string | RouteInfo, animationBuilder?: AnimationBuilder): void;
    nativeGoBack(): void;
    navigate(path: string, direction?: RouterDirection, action?: RouteAction, animationBuilder?: AnimationBuilder, options?: any, tab?: string): void;
    getPageManager(): typeof PageManager;
    getIonRedirect(): any;
    getIonRoute(): any;
    getStackManager(): any;
    render(): JSX.Element;
}
export {};
