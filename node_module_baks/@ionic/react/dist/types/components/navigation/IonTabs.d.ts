import { JSX as LocalJSX } from '@ionic/core';
import React from 'react';
import { NavContext } from '../../contexts/NavContext';
import { IonTabsContextState } from './IonTabsContext';
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'ion-tabs': any;
        }
    }
}
declare type ChildFunction = (ionTabContext: IonTabsContextState) => React.ReactNode;
interface Props extends LocalJSX.IonTabs {
    className?: string;
    children: ChildFunction | React.ReactNode;
}
export declare class IonTabs extends React.Component<Props> {
    context: React.ContextType<typeof NavContext>;
    routerOutletRef: React.Ref<HTMLIonRouterOutletElement>;
    selectTabHandler?: (tag: string) => boolean;
    tabBarRef: React.RefObject<any>;
    ionTabContextState: IonTabsContextState;
    constructor(props: Props);
    componentDidMount(): void;
    render(): JSX.Element;
    static get contextType(): React.Context<import("../../contexts/NavContext").NavContextState>;
}
export {};
