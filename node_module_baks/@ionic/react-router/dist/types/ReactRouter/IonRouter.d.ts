import { AnimationBuilder } from '@ionic/core';
import { LocationHistory, RouteAction, RouteInfo, RouteManagerContextState, RouterDirection, ViewItem } from '@ionic/react';
import { Action as HistoryAction, Location as HistoryLocation } from 'history';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ReactRouterViewStack } from './ReactRouterViewStack';
export interface LocationState {
    direction?: RouterDirection;
    routerOptions?: {
        as?: string;
        unmount?: boolean;
    };
}
interface IonRouteProps extends RouteComponentProps<{}, {}, LocationState> {
    registerHistoryListener: (cb: (location: HistoryLocation<any>, action: HistoryAction) => void) => void;
}
interface IonRouteState {
    routeInfo: RouteInfo;
}
declare class IonRouterInner extends React.PureComponent<IonRouteProps, IonRouteState> {
    currentTab?: string;
    exitViewFromOtherOutletHandlers: ((pathname: string) => ViewItem | undefined)[];
    incomingRouteParams?: Partial<RouteInfo>;
    locationHistory: LocationHistory;
    viewStack: ReactRouterViewStack;
    routeMangerContextState: RouteManagerContextState;
    constructor(props: IonRouteProps);
    handleChangeTab(tab: string, path: string, routeOptions?: any): void;
    handleHistoryChange(location: HistoryLocation<LocationState>, action: HistoryAction): void;
    handleNativeBack(): void;
    handleNavigate(path: string, routeAction: RouteAction, routeDirection?: RouterDirection, routeAnimation?: AnimationBuilder, routeOptions?: any, tab?: string): void;
    handleNavigateBack(defaultHref?: string | RouteInfo, routeAnimation?: AnimationBuilder): void;
    handleResetTab(tab: string, originalHref: string, originalRouteOptions: any): void;
    handleSetCurrentTab(tab: string): void;
    render(): JSX.Element;
}
export declare const IonRouter: React.ComponentClass<Pick<IonRouteProps, "registerHistoryListener">, any> & import("react-router").WithRouterStatics<typeof IonRouterInner>;
export {};
