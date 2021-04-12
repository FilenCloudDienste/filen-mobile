import { OverlayEventDetail } from '@ionic/core';
import React from 'react';
interface OverlayBase extends HTMLElement {
    present: () => Promise<void>;
    dismiss: (data?: any, role?: string | undefined) => Promise<boolean>;
}
export interface ReactControllerProps {
    isOpen: boolean;
    onDidDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
    onDidPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
    onWillDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
    onWillPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
}
export declare const createControllerComponent: <OptionsType extends object, OverlayType extends OverlayBase>(displayName: string, controller: {
    create: (options: OptionsType) => Promise<OverlayType>;
}) => React.ForwardRefExoticComponent<React.PropsWithoutRef<OptionsType & ReactControllerProps & {
    forwardedRef?: React.RefObject<OverlayType> | undefined;
}> & React.RefAttributes<OverlayType>>;
export {};
