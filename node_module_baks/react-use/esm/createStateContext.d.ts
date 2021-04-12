/// <reference types="react" />
declare const createStateContext: <T>(defaultInitialValue: T) => readonly [() => [T, import("react").Dispatch<import("react").SetStateAction<T>>], import("react").FC<{
    initialValue?: T | undefined;
}>, import("react").Context<[T, import("react").Dispatch<import("react").SetStateAction<T>>] | undefined>];
export default createStateContext;
