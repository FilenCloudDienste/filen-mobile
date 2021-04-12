/// <reference types="react" />
import { PopoverOptions } from '@ionic/core';
export declare type ReactPopoverOptions = Omit<PopoverOptions, 'component' | 'componentProps'> & {
    children: React.ReactNode;
};
export declare const IonPopover: import("react").ForwardRefExoticComponent<Pick<PopoverOptions<import("@ionic/core").ComponentRef>, "animated" | "mode" | "id" | "translucent" | "cssClass" | "backdropDismiss" | "keyboardClose" | "enterAnimation" | "leaveAnimation" | "showBackdrop" | "delegate" | "event"> & {
    children: React.ReactNode;
} & import("./createOverlayComponent").ReactOverlayProps & {
    forwardedRef?: import("react").RefObject<HTMLIonPopoverElement> | undefined;
} & import("react").RefAttributes<HTMLIonPopoverElement>>;
