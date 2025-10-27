import { useMMKVObject } from "react-native-mmkv"
import mmkvInstance from "@/lib/mmkv"
import { useMemo, useCallback } from "react"

export function useGridMode(parent: string) {
	const [gridMode, setGridMode] = useMMKVObject<Record<string, boolean>>("gridMode", mmkvInstance)

	return [
		useMemo(() => {
			return gridMode?.[parent] ?? false
		}, [gridMode, parent]),
		useCallback(
			(value: boolean) => {
				setGridMode(prev => ({
					...prev,
					[parent]: value
				}))
			},
			[parent, setGridMode]
		)
	] as const
}
