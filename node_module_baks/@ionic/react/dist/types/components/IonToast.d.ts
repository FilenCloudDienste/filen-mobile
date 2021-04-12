/// <reference types="react" />
import { ToastButton as ToastButtonCore, ToastOptions as ToastOptionsCore } from '@ionic/core';
export interface ToastButton extends Omit<ToastButtonCore, 'icon'> {
    icon?: {
        ios: string;
        md: string;
    } | string;
}
export interface ToastOptions extends Omit<ToastOptionsCore, 'buttons'> {
    buttons?: (ToastButton | string)[];
}
export declare const IonToast: import("react").ForwardRefExoticComponent<ToastOptions & import("./createControllerComponent").ReactControllerProps & {
    forwardedRef?: import("react").RefObject<HTMLIonToastElement> | undefined;
} & import("react").RefAttributes<HTMLIonToastElement>>;
