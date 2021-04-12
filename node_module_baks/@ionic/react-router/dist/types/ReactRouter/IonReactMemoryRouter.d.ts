import { Action as HistoryAction, Location as HistoryLocation, MemoryHistory } from 'history';
import React from 'react';
import { MemoryRouterProps } from 'react-router';
interface IonReactMemoryRouterProps extends MemoryRouterProps {
    history: MemoryHistory;
}
export declare class IonReactMemoryRouter extends React.Component<IonReactMemoryRouterProps> {
    history: MemoryHistory;
    historyListenHandler?: (location: HistoryLocation, action: HistoryAction) => void;
    constructor(props: IonReactMemoryRouterProps);
    handleHistoryChange(location: HistoryLocation, action: HistoryAction): void;
    registerHistoryListener(cb: (location: HistoryLocation, action: HistoryAction) => void): void;
    render(): JSX.Element;
}
export {};
