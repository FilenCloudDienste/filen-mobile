export declare function createGlobalState<S = any>(initialState?: S): () => [S | undefined, (state: S) => void];
export default createGlobalState;
