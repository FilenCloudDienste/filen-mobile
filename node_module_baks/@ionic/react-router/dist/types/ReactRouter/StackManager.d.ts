import { RouteInfo, RouteManagerContext, StackContextState, ViewItem } from '@ionic/react';
import React from 'react';
interface StackManagerProps {
    routeInfo: RouteInfo;
}
interface StackManagerState {
}
export declare class StackManager extends React.PureComponent<StackManagerProps, StackManagerState> {
    id: string;
    context: React.ContextType<typeof RouteManagerContext>;
    ionRouterOutlet?: React.ReactElement;
    routerOutletElement: HTMLIonRouterOutletElement | undefined;
    stackContextValue: StackContextState;
    constructor(props: StackManagerProps);
    componentDidMount(): void;
    componentDidUpdate(prevProps: StackManagerProps): void;
    componentWillUnmount(): void;
    handlePageTransition(routeInfo: RouteInfo): Promise<void>;
    registerIonPage(page: HTMLElement, routeInfo: RouteInfo): void;
    setupRouterOutlet(routerOutlet: HTMLIonRouterOutletElement): Promise<void>;
    transitionPage(routeInfo: RouteInfo, enteringViewItem: ViewItem, leavingViewItem?: ViewItem): Promise<void>;
    render(): JSX.Element;
    static get contextType(): React.Context<import("@ionic/react").RouteManagerContextState>;
}
export default StackManager;
