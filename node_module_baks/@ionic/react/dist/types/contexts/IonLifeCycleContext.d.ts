import React from 'react';
export interface IonLifeCycleContextInterface {
    onIonViewWillEnter: (callback: () => void) => void;
    ionViewWillEnter: () => void;
    onIonViewDidEnter: (callback: () => void) => void;
    ionViewDidEnter: () => void;
    onIonViewWillLeave: (callback: () => void) => void;
    ionViewWillLeave: () => void;
    onIonViewDidLeave: (callback: () => void) => void;
    ionViewDidLeave: () => void;
}
export declare const IonLifeCycleContext: React.Context<IonLifeCycleContextInterface>;
export interface LifeCycleCallback {
    (): void;
    id?: number;
}
export declare const DefaultIonLifeCycleContext: {
    new (): {
        ionViewWillEnterCallbacks: LifeCycleCallback[];
        ionViewDidEnterCallbacks: LifeCycleCallback[];
        ionViewWillLeaveCallbacks: LifeCycleCallback[];
        ionViewDidLeaveCallbacks: LifeCycleCallback[];
        componentCanBeDestroyedCallback?: (() => void) | undefined;
        onIonViewWillEnter(callback: LifeCycleCallback): void;
        ionViewWillEnter(): void;
        onIonViewDidEnter(callback: LifeCycleCallback): void;
        ionViewDidEnter(): void;
        onIonViewWillLeave(callback: LifeCycleCallback): void;
        ionViewWillLeave(): void;
        onIonViewDidLeave(callback: LifeCycleCallback): void;
        ionViewDidLeave(): void;
        onComponentCanBeDestroyed(callback: () => void): void;
        componentCanBeDestroyed(): void;
    };
};
