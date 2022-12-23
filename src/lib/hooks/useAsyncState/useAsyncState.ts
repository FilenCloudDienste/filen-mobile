import { useState, useRef, useCallback, useEffect } from "react"

const useAsyncState = <T>(initialState: T): [T, (newState: T) => Promise<T>] => {
    const [state, setState] = useState<T>(initialState)
    const resolveState = useRef<(value: T) => void>()
    const isMounted = useRef<boolean>(false)

    useEffect(() => {
        isMounted.current = true

        return () => {
            isMounted.current = false
        }
    }, [])

    useEffect(() => {
        if(resolveState.current){
            resolveState.current(state)
        }
    }, [state])

    const setAsyncState = useCallback((newState: T) => new Promise<T>(resolve => {
        if(isMounted.current){
            resolveState.current = resolve

            setState(newState)
        }
    }), [])

    return [state, setAsyncState]
}

export default useAsyncState