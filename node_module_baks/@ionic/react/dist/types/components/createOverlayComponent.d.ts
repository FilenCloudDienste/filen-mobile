import { OverlayEventDetail } from '@ionic/core';
import React from 'react';
interface OverlayElement extends HTMLElement {
    present: () => Promise<void>;
    dismiss: (data?: any, role?: string | undefined) => Promise<boolean>;
}
export interface ReactOverlayProps {
    children?: React.ReactNode;
    isOpen: boolean;
    onDidDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
    onDidPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
    onWillDismiss?: (event: CustomEvent<OverlayEventDetail>) => void;
    onWillPresent?: (event: CustomEvent<OverlayEventDetail>) => void;
}
export declare const createOverlayComponent: <OverlayComponent extends object, OverlayType extends OverlayElement>(displayName: string, controller: {
    create: (options: any) => Promise<OverlayType>;
}) => React.ForwardRefExoticComponent<React.PropsWithoutRef<OverlayComponent & ReactOverlayProps & {
    forwardedRef?: React.RefObject<OverlayType> | undefined;
}> & React.RefAttributes<OverlayType>>;
export {};
