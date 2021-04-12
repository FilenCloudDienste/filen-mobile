import { DependencyList } from 'react';
import { FnReturningPromise, PromiseType } from './util';
export declare type AsyncState<T> = {
    loading: boolean;
    error?: undefined;
    value?: undefined;
} | {
    loading: true;
    error?: Error | undefined;
    value?: T;
} | {
    loading: false;
    error: Error;
    value?: undefined;
} | {
    loading: false;
    error?: undefined;
    value: T;
};
declare type StateFromFnReturningPromise<T extends FnReturningPromise> = AsyncState<PromiseType<ReturnType<T>>>;
export declare type AsyncFnReturn<T extends FnReturningPromise = FnReturningPromise> = [StateFromFnReturningPromise<T>, T];
export default function useAsyncFn<T extends FnReturningPromise>(fn: T, deps?: DependencyList, initialState?: StateFromFnReturningPromise<T>): AsyncFnReturn<T>;
export {};
