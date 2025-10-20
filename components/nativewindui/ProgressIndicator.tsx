import { memo, forwardRef, useMemo } from "react"
import { View } from "react-native"
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useDerivedValue, withSpring } from "react-native-reanimated"
import { cn } from "@/lib/cn"

export const DEFAULT_MAX = 100

export const ProgressIndicator = memo(
	forwardRef<
		React.ElementRef<typeof View>,
		React.ComponentPropsWithoutRef<typeof View> & {
			value?: number
			max?: number
			getValueLabel?: (value: number, max: number) => string
			progressClassName?: string
			trackClassName?: string
		}
	>(({ value: valueProp, max: maxProp, getValueLabel = defaultGetValueLabel, className, ...props }, ref) => {
		const max = useMemo(() => maxProp ?? DEFAULT_MAX, [maxProp])
		const value = useMemo(() => (isValidValueNumber(valueProp, max) ? valueProp : 0), [valueProp, max])
		const progress = useDerivedValue(() => value ?? 0)

		const indicator = useAnimatedStyle(() => {
			return {
				width: withSpring(`${interpolate(progress.value, [0, 100], [1, 100], Extrapolation.CLAMP)}%`, { overshootClamping: true })
			}
		})

		const valueText = useMemo(() => getValueLabel(value, max), [value, max, getValueLabel])

		return (
			<View
				role="progressbar"
				ref={ref}
				aria-valuemax={max}
				aria-valuemin={0}
				aria-valuenow={value}
				aria-valuetext={valueText}
				accessibilityValue={{
					min: 0,
					max,
					now: value,
					text: valueText
				}}
				className={cn("relative h-1 w-full overflow-hidden rounded-full", className)}
				{...props}
			>
				<View className={cn("bg-muted absolute bottom-0 left-0 right-0 top-0 opacity-20", props.trackClassName)} />
				<Animated.View
					role="presentation"
					style={indicator}
					className={cn("bg-primary h-full", props.progressClassName)}
				/>
			</View>
		)
	})
)

ProgressIndicator.displayName = "ProgressIndicator"

export function defaultGetValueLabel(value: number, max: number) {
	return `${Math.round((value / max) * 100)}%`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidValueNumber(value: any, max: number): value is number {
	return typeof value === "number" && !isNaN(value) && value <= max && value >= 0
}
