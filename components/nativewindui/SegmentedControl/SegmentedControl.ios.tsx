import RNSegmentedControl from "@react-native-segmented-control/segmented-control"
import { memo, useCallback } from "react"
import type { SegmentControlProps } from "./types"

export const SegmentedControl = memo(
	({
		values,
		selectedIndex,
		onIndexChange,
		onValueChange: onValueChangeProp,
		enabled = true,
		iosMomentary,
		materialTextClassName: _materialTextClassName
	}: SegmentControlProps) => {
		const onChange = useCallback(
			(event: { nativeEvent: { selectedSegmentIndex: number } }) => {
				onIndexChange?.(event.nativeEvent.selectedSegmentIndex)
			},
			[onIndexChange]
		)

		const onValueChange = useCallback(
			(value: string) => {
				onValueChangeProp?.(value)
			},
			[onValueChangeProp]
		)

		return (
			<RNSegmentedControl
				enabled={enabled}
				values={values}
				selectedIndex={selectedIndex}
				onChange={onChange}
				onValueChange={onValueChange}
				momentary={iosMomentary}
			/>
		)
	}
)

SegmentedControl.displayName = "SegmentedControl"
