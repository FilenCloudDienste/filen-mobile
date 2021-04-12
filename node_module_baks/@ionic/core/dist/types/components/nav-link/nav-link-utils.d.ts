import { AnimationBuilder, ComponentProps } from '../../interface';
import { RouterDirection } from '../router/utils/interface';
export declare const navLink: (el: HTMLElement, routerDirection: RouterDirection, component?: string | Function | HTMLElement | import("../nav/view-controller").ViewController | null | undefined, componentProps?: ComponentProps<null> | undefined, routerAnimation?: AnimationBuilder | undefined) => Promise<boolean>;
