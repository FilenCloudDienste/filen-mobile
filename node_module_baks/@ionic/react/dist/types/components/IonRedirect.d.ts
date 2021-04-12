import React from 'react';
import { NavContext } from '../contexts/NavContext';
export interface IonRedirectProps {
    path?: string;
    exact?: boolean;
    to: string;
    routerOptions?: unknown;
}
interface IonRedirectState {
}
export declare class IonRedirect extends React.PureComponent<IonRedirectProps, IonRedirectState> {
    context: React.ContextType<typeof NavContext>;
    render(): JSX.Element | null;
    static get contextType(): React.Context<import("../contexts/NavContext").NavContextState>;
}
export {};
