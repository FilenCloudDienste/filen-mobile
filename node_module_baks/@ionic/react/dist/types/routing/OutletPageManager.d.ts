import React from 'react';
import { IonLifeCycleContext } from '../contexts/IonLifeCycleContext';
import { RouteInfo } from '../models';
import { StackContext } from './StackContext';
interface OutletPageManagerProps {
    className?: string;
    forwardedRef?: React.RefObject<HTMLIonRouterOutletElement>;
    routeInfo?: RouteInfo;
    StackManager: any;
}
export declare class OutletPageManager extends React.Component<OutletPageManagerProps> {
    ionLifeCycleContext: React.ContextType<typeof IonLifeCycleContext>;
    context: React.ContextType<typeof StackContext>;
    ionRouterOutlet: HTMLIonRouterOutletElement | undefined;
    constructor(props: OutletPageManagerProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    ionViewWillEnterHandler(): void;
    ionViewDidEnterHandler(): void;
    ionViewWillLeaveHandler(): void;
    ionViewDidLeaveHandler(): void;
    render(): JSX.Element;
    static get contextType(): React.Context<import("./StackContext").StackContextState>;
}
export default OutletPageManager;
