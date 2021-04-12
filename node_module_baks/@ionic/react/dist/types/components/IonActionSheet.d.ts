/// <reference types="react" />
import { ActionSheetButton as ActionSheetButtonCore, ActionSheetOptions as ActionSheetOptionsCore } from '@ionic/core';
export interface ActionSheetButton extends Omit<ActionSheetButtonCore, 'icon'> {
    icon?: {
        ios: string;
        md: string;
    } | string;
}
export interface ActionSheetOptions extends Omit<ActionSheetOptionsCore, 'buttons'> {
    buttons?: (ActionSheetButton | string)[];
}
export declare const IonActionSheet: import("react").ForwardRefExoticComponent<ActionSheetOptions & import("./createOverlayComponent").ReactOverlayProps & {
    forwardedRef?: import("react").RefObject<HTMLIonActionSheetElement> | undefined;
} & import("react").RefAttributes<HTMLIonActionSheetElement>>;
