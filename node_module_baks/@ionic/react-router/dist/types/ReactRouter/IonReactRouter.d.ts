import { Action as HistoryAction, History, Location as HistoryLocation } from 'history';
import React from 'react';
import { BrowserRouterProps } from 'react-router-dom';
interface IonReactRouterProps extends BrowserRouterProps {
    history?: History;
}
export declare class IonReactRouter extends React.Component<IonReactRouterProps> {
    historyListenHandler?: (location: HistoryLocation, action: HistoryAction) => void;
    history: History;
    constructor(props: IonReactRouterProps);
    handleHistoryChange(location: HistoryLocation, action: HistoryAction): void;
    registerHistoryListener(cb: (location: HistoryLocation, action: HistoryAction) => void): void;
    render(): JSX.Element;
}
export {};
