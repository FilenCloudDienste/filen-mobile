import React from 'react';
interface ViewTransitionManagerProps {
    removeView: () => void;
    mount: boolean;
}
interface ViewTransitionManagerState {
    show: boolean;
}
export declare class ViewLifeCycleManager extends React.Component<ViewTransitionManagerProps, ViewTransitionManagerState> {
    ionLifeCycleContext: {
        ionViewWillEnterCallbacks: import("../contexts/IonLifeCycleContext").LifeCycleCallback[];
        ionViewDidEnterCallbacks: import("../contexts/IonLifeCycleContext").LifeCycleCallback[];
        ionViewWillLeaveCallbacks: import("../contexts/IonLifeCycleContext").LifeCycleCallback[];
        ionViewDidLeaveCallbacks: import("../contexts/IonLifeCycleContext").LifeCycleCallback[];
        componentCanBeDestroyedCallback?: (() => void) | undefined;
        onIonViewWillEnter(callback: import("../contexts/IonLifeCycleContext").LifeCycleCallback): void;
        ionViewWillEnter(): void;
        onIonViewDidEnter(callback: import("../contexts/IonLifeCycleContext").LifeCycleCallback): void;
        ionViewDidEnter(): void;
        onIonViewWillLeave(callback: import("../contexts/IonLifeCycleContext").LifeCycleCallback): void;
        ionViewWillLeave(): void;
        onIonViewDidLeave(callback: import("../contexts/IonLifeCycleContext").LifeCycleCallback): void;
        ionViewDidLeave(): void;
        onComponentCanBeDestroyed(callback: () => void): void;
        componentCanBeDestroyed(): void;
    };
    private _isMounted;
    constructor(props: ViewTransitionManagerProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): JSX.Element;
}
export {};
