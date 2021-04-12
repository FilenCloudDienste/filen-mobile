import { CordovaOptions } from './interfaces';
export declare const ERR_CORDOVA_NOT_AVAILABLE: {
    error: string;
};
export declare const ERR_PLUGIN_NOT_INSTALLED: {
    error: string;
};
export declare function getPromise<T>(callback: (resolve: Function, reject?: Function) => any): Promise<T>;
export declare function wrapPromise(pluginObj: any, methodName: string, args: any[], opts?: CordovaOptions): Promise<unknown>;
/**
 * Checks if plugin/cordova is available
 * @return {boolean | { error: string } }
 * @private
 */
export declare function checkAvailability(pluginRef: string, methodName?: string, pluginName?: string): boolean | {
    error: string;
};
export declare function checkAvailability(pluginObj: any, methodName?: string, pluginName?: string): boolean | {
    error: string;
};
/**
 * Checks if _objectInstance exists and has the method/property
 * @private
 */
export declare function instanceAvailability(pluginObj: any, methodName?: string): boolean;
export declare function setIndex(args: any[], opts?: any, resolve?: Function, reject?: Function): any;
export declare function callCordovaPlugin(pluginObj: any, methodName: string, args: any[], opts?: any, resolve?: Function, reject?: Function): any;
export declare function callInstance(pluginObj: any, methodName: string, args: any[], opts?: any, resolve?: Function, reject?: Function): any;
export declare function getPlugin(pluginRef: string): any;
export declare function get(element: Element | Window, path: string): any;
export declare function pluginWarn(pluginName: string, plugin?: string, method?: string): void;
/**
 * @private
 * @param pluginName
 * @param method
 */
export declare function cordovaWarn(pluginName: string, method?: string): void;
export declare type WrapFn = (...args: any[]) => any;
/**
 * @private
 */
export declare const wrap: (pluginObj: any, methodName: string, opts?: CordovaOptions) => WrapFn;
/**
 * @private
 */
export declare function wrapInstance(pluginObj: any, methodName: string, opts?: any): Function;
