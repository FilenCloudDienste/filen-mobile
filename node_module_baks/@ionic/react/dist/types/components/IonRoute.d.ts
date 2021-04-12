import React from 'react';
import { NavContext } from '../contexts/NavContext';
export interface IonRouteProps {
    path?: string;
    exact?: boolean;
    show?: boolean;
    render: (props?: any) => JSX.Element;
    disableIonPageManagement?: boolean;
}
interface IonRouteState {
}
export declare class IonRoute extends React.PureComponent<IonRouteProps, IonRouteState> {
    context: React.ContextType<typeof NavContext>;
    render(): JSX.Element | null;
    static get contextType(): React.Context<import("../contexts/NavContext").NavContextState>;
}
export {};
