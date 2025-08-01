import { memo, useId, useCallback } from "react"
import { View } from "react-native"
import { type SegmentControlProps } from "./types"
import { Text } from "@/components/nativewindui/Text"
import { Button } from "@/components/nativewindui/Button"
import { cn } from "@/lib/cn"

export const SegmentedControl = memo(
	({
		values,
		selectedIndex,
		onIndexChange,
		onValueChange,
		enabled = true,
		materialTextClassName,
		iosMomentary: _iosMomentary
	}: SegmentControlProps) => {
		const id = useId()

		const onPress = useCallback(
			(index: number, value: string) => {
				return () => {
					onIndexChange?.(index)
					onValueChange?.(value)
				}
			},
			[onIndexChange, onValueChange]
		)

		return (
			<View className="border-foreground/50 flex-row rounded-full border">
				{values.map((value, index) => {
					return (
						<View
							key={`segment:${id}-${index}-${value}`}
							className="flex-1"
						>
							<Button
								disabled={!enabled}
								size="sm"
								variant={selectedIndex === index ? "tonal" : "plain"}
								androidRootClassName={cn(
									"rounded-none",
									index === 0 && "rounded-l-full",
									index === values?.length - 1 && "rounded-r-full"
								)}
								className={cn(
									"rounded-none py-2.5",
									index === 0 && "rounded-l-full",
									index === values?.length - 1 ? "rounded-r-full" : "border-foreground/50 border-r"
								)}
								onPress={onPress(index, value)}
							>
								<Text className={materialTextClassName}>{value}</Text>
							</Button>
						</View>
					)
				})}
			</View>
		)
	}
)

SegmentedControl.displayName = "SegmentedControl"
