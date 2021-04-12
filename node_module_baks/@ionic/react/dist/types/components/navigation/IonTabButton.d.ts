import { JSX as LocalJSX } from '@ionic/core';
import React from 'react';
import { RouterOptions } from '../../models';
import { IonicReactProps } from '../IonicReactProps';
declare type Props = LocalJSX.IonTabButton & IonicReactProps & {
    routerOptions?: RouterOptions;
    ref?: React.RefObject<HTMLIonTabButtonElement>;
    onClick?: (e: any) => void;
};
export declare class IonTabButton extends React.Component<Props> {
    constructor(props: Props);
    handleIonTabButtonClick(): void;
    render(): JSX.Element;
    static get displayName(): string;
}
export {};
