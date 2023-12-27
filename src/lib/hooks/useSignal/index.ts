import eventListener from "../../../lib/eventListener"
import { useEffect, useState, useRef, useCallback } from "react"
import { Semaphore, SemaphoreInterface } from "../../../lib/helpers"

const signals = new Map<string, unknown>()
const mutexes = new Map<string, SemaphoreInterface>()

const getMutex = (key: string): SemaphoreInterface => {
	if (mutexes.has(key)) {
		return mutexes.get(key)
	}

	mutexes.set(key, new Semaphore(1))

	return mutexes.get(key)
}

export default function useSignal<T>(key: string, defaultValue: T): [T, (prev: T) => void] {
	const now = useRef<T>(signals.has(key) ? (signals.get(key) as T) : defaultValue)
	const [state, setState] = useState<T>(now.current)
	const id = useRef<number>(Math.random()).current
	const mutex = useRef<SemaphoreInterface>(getMutex(key)).current

	const changeState = useCallback(() => {
		return (callback: (prev: T) => void) => {}
	}, [])

	useEffect(() => {
		const listener = eventListener.on("useSignalChange:" + key, ({ id: i, value }: { id: number; value: T }) => {
			if (i === id) {
				return
			}

			now.current = value

			setState(now.current)

			eventListener.emit("useSignalChange:" + key, {
				id,
				value: now.current
			})
		})

		return () => {
			listener.remove()
		}
	}, [])

	return [state, changeState]
}
