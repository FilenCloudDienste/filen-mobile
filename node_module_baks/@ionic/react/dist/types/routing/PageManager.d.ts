import React from 'react';
import { IonLifeCycleContext } from '../contexts/IonLifeCycleContext';
import { RouteInfo } from '../models';
import { StackContext } from './StackContext';
interface PageManagerProps {
    className?: string;
    forwardedRef?: React.RefObject<HTMLDivElement>;
    routeInfo?: RouteInfo;
}
export declare class PageManager extends React.PureComponent<PageManagerProps> {
    ionLifeCycleContext: React.ContextType<typeof IonLifeCycleContext>;
    context: React.ContextType<typeof StackContext>;
    ionPageElementRef: React.RefObject<HTMLDivElement>;
    constructor(props: PageManagerProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    ionViewWillEnterHandler(): void;
    ionViewDidEnterHandler(): void;
    ionViewWillLeaveHandler(): void;
    ionViewDidLeaveHandler(): void;
    render(): JSX.Element;
    static get contextType(): React.Context<import("./StackContext").StackContextState>;
}
export default PageManager;
