export declare const isClient: boolean;
export declare const on: (obj: any, ...args: any[]) => any;
export declare const off: (obj: any, ...args: any[]) => any;
export declare type FnReturningPromise = (...args: any[]) => Promise<any>;
export declare type PromiseType<P extends Promise<any>> = P extends Promise<infer T> ? T : never;
export declare const isDeepEqual: (a: any, b: any) => boolean;
