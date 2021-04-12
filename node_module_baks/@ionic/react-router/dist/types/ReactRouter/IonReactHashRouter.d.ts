import { Action as HistoryAction, History, Location as HistoryLocation } from 'history';
import React from 'react';
import { BrowserRouterProps } from 'react-router-dom';
interface IonReactHashRouterProps extends BrowserRouterProps {
    history?: History;
}
export declare class IonReactHashRouter extends React.Component<IonReactHashRouterProps> {
    history: History;
    historyListenHandler?: (location: HistoryLocation, action: HistoryAction) => void;
    constructor(props: IonReactHashRouterProps);
    handleHistoryChange(location: HistoryLocation, action: HistoryAction): void;
    registerHistoryListener(cb: (location: HistoryLocation, action: HistoryAction) => void): void;
    render(): JSX.Element;
}
export {};
