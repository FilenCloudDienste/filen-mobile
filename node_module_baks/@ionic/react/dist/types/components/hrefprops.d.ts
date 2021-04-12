import { AnimationBuilder } from '@ionic/core';
import { RouterOptions } from '../models';
import { RouterDirection } from '../models/RouterDirection';
export declare type HrefProps<T> = Omit<T, 'routerDirection'> & {
    routerLink?: string;
    routerDirection?: RouterDirection;
    routerOptions?: RouterOptions;
    routerAnimation?: AnimationBuilder;
};
