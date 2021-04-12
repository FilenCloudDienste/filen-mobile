import { JSX as LocalJSX } from '@ionic/core';
import React from 'react';
import { NavContext } from '../../contexts/NavContext';
import { IonicReactProps } from '../IonicReactProps';
declare type Props = Omit<LocalJSX.IonBackButton, 'icon'> & IonicReactProps & {
    icon?: {
        ios: string;
        md: string;
    } | string;
    ref?: React.RefObject<HTMLIonBackButtonElement>;
};
export declare const IonBackButton: {
    new (props: Props | Readonly<Props>): {
        context: React.ContextType<typeof NavContext>;
        clickButton: (e: React.MouseEvent) => void;
        render(): JSX.Element;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Props>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<Props> & Readonly<{
            children?: React.ReactNode;
        }>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<Props>, prevState: Readonly<{}>): any;
        componentDidUpdate?(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<Props>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<Props>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): void;
    };
    new (props: Props, context: any): {
        context: React.ContextType<typeof NavContext>;
        clickButton: (e: React.MouseEvent) => void;
        render(): JSX.Element;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Props>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callback?: (() => void) | undefined): void;
        readonly props: Readonly<Props> & Readonly<{
            children?: React.ReactNode;
        }>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
        componentDidMount?(): void;
        shouldComponentUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): boolean;
        componentWillUnmount?(): void;
        componentDidCatch?(error: Error, errorInfo: React.ErrorInfo): void;
        getSnapshotBeforeUpdate?(prevProps: Readonly<Props>, prevState: Readonly<{}>): any;
        componentDidUpdate?(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any): void;
        componentWillMount?(): void;
        UNSAFE_componentWillMount?(): void;
        componentWillReceiveProps?(nextProps: Readonly<Props>, nextContext: any): void;
        UNSAFE_componentWillReceiveProps?(nextProps: Readonly<Props>, nextContext: any): void;
        componentWillUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): void;
        UNSAFE_componentWillUpdate?(nextProps: Readonly<Props>, nextState: Readonly<{}>, nextContext: any): void;
    };
    readonly displayName: string;
    readonly contextType: React.Context<import("../../contexts/NavContext").NavContextState>;
};
export {};
