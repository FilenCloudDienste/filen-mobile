/// <reference types="react" />
import { ModalOptions } from '@ionic/core';
export declare type ReactModalOptions = Omit<ModalOptions, 'component' | 'componentProps'> & {
    children: React.ReactNode;
};
export declare const IonModal: import("react").ForwardRefExoticComponent<Pick<ModalOptions<import("@ionic/core").ComponentRef>, "animated" | "mode" | "id" | "cssClass" | "backdropDismiss" | "keyboardClose" | "enterAnimation" | "leaveAnimation" | "showBackdrop" | "presentingElement" | "delegate" | "swipeToClose"> & {
    children: React.ReactNode;
} & import("./createOverlayComponent").ReactOverlayProps & {
    forwardedRef?: import("react").RefObject<HTMLIonModalElement> | undefined;
} & import("react").RefAttributes<HTMLIonModalElement>>;
