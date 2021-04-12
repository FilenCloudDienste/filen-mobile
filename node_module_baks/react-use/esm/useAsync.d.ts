import { DependencyList } from 'react';
import { FnReturningPromise } from './util';
export { AsyncState, AsyncFnReturn } from './useAsyncFn';
export default function useAsync<T extends FnReturningPromise>(fn: T, deps?: DependencyList): import("./useAsyncFn").AsyncState<import("./util").PromiseType<ReturnType<T>>>;
