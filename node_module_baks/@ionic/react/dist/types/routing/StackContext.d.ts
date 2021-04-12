import React from 'react';
import { RouteInfo } from '../models/RouteInfo';
export interface StackContextState {
    registerIonPage: (page: HTMLElement, routeInfo: RouteInfo) => void;
    isInOutlet: () => boolean;
}
export declare const StackContext: React.Context<StackContextState>;
